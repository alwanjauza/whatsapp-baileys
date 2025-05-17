const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { proto, initAuthCreds } = require("@whiskeysockets/baileys");

// Ensure auth/sqlite folder exists
const authDir = path.join(__dirname, "../auth/sqlite");
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

const dbFile = path.join(authDir, "db.sqlite");

// Open DB connection
const db = new Database(dbFile);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Create table if not exists
db.prepare(
  `
  CREATE TABLE IF NOT EXISTS credentials (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`
).run();

// Recursive buffer reviver (walks entire object tree)
function reviveBuffers(obj) {
  if (obj == null) return obj;

  if (Array.isArray(obj)) {
    return obj.map(reviveBuffers);
  }

  if (typeof obj === "object") {
    // If this looks like a serialized buffer, restore it
    if (obj.__type === "buffer" && typeof obj.data === "string") {
      return Buffer.from(obj.data, "base64");
    }

    // Recursively revive all props
    for (const key in obj) {
      obj[key] = reviveBuffers(obj[key]);
    }

    return obj;
  }

  return obj;
}

// JSON replacer to convert Buffer/Uint8Array to base64 string wrapper
const replacer = (key, value) => {
  if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
    return {
      __type: "buffer",
      data: Buffer.from(value).toString("base64"),
    };
  }
  return value;
};

// Save data to DB by id
function save(id, data) {
  try {
    const json = JSON.stringify(data, replacer);
    const stmt = db.prepare(
      "INSERT OR REPLACE INTO credentials (id, data) VALUES (?, ?)"
    );
    stmt.run(id, json);
  } catch (err) {
    console.error("❌ Failed to save credentials:", err);
    throw err;
  }
}

// Load data from DB by id
function load(id) {
  try {
    const row = db.prepare("SELECT data FROM credentials WHERE id = ?").get(id);
    if (!row) return null;

    const rawData = JSON.parse(row.data);
    const data = reviveBuffers(rawData);

    // Debug: print loaded keys with their types
    if (typeof data === "object") {
      for (const k in data) {
        if (
          data[k] &&
          typeof data[k] === "object" &&
          !Buffer.isBuffer(data[k])
        ) {
          console.log(`Loaded key ${k} is object (not Buffer)`);
        }
      }
    }

    // Convert proto if app-state-sync-key
    if (id.startsWith("app-state-sync-key-") && data) {
      try {
        return proto.Message.AppStateSyncKeyData.fromObject(data);
      } catch (e) {
        console.warn("⚠️ Failed to convert proto object:", e);
        return data;
      }
    }

    return data;
  } catch (err) {
    console.error("❌ Failed to load credentials:", err);
    return null;
  }
}

// Remove data by id
function remove(id) {
  try {
    db.prepare("DELETE FROM credentials WHERE id = ?").run(id);
  } catch (err) {
    console.error("❌ Failed to remove credentials:", err);
  }
}

async function useSQLiteAuthState() {
  const CREDS_ID = "creds";
  let creds = load(CREDS_ID);

  if (!creds) {
    creds = initAuthCreds();
    save(CREDS_ID, creds);
  }

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const result = {};
          try {
            const transaction = db.transaction(() => {
              for (const id of ids) {
                const key = `${type}-${id}`;
                result[id] = load(key);
              }
            });
            transaction();
            return result;
          } catch (err) {
            console.error("❌ Failed to get keys:", err);
            return {};
          }
        },
        set: async (data) => {
          try {
            const transaction = db.transaction(() => {
              for (const category in data) {
                for (const id in data[category]) {
                  const key = `${category}-${id}`;
                  const value = data[category][id];
                  if (value) save(key, value);
                  else remove(key);
                }
              }
            });
            transaction();
          } catch (err) {
            console.error("❌ Failed to set keys:", err);
          }
        },
      },
    },
    saveCreds: async () => {
      try {
        save(CREDS_ID, creds);
      } catch (err) {
        console.error("❌ Failed to save credentials:", err);
      }
    },
    cleanup: () => {
      try {
        if (db) db.close();
      } catch (err) {
        console.error("❌ Failed to close database:", err);
      }
    },
  };
}

module.exports = { useSQLiteAuthState };
