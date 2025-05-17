const path = require("path");
const Database = require("better-sqlite3");
const { proto, initAuthCreds } = require("@whiskeysockets/baileys");

let db;
try {
  db = new Database(path.join(__dirname, "../auth/sqlite/db.sqlite"));
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.prepare(
    `CREATE TABLE IF NOT EXISTS credentials (
      id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`
  ).run();
} catch (err) {
  console.error("❌ Database initialization failed:", err);
  process.exit(1);
}

const replacer = (key, value) => {
  if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
    return {
      __type: "buffer",
      data: Buffer.from(value).toString("base64"),
    };
  }
  return value;
};

const reviver = (key, value) => {
  if (value?.__type === "buffer" && typeof value.data === "string") {
    return Buffer.from(value.data, "base64");
  }

  if (
    value?.__proto__?.constructor?.name === "Object" &&
    key.endsWith("-key-")
  ) {
    try {
      return proto.Message.AppStateSyncKeyData.fromObject(value);
    } catch (e) {
      console.warn("⚠️ Failed to convert proto object:", e);
      return value;
    }
  }

  return value;
};

const save = (id, data) => {
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
};

const load = (id) => {
  try {
    const row = db.prepare("SELECT data FROM credentials WHERE id = ?").get(id);
    if (!row) return null;

    const data = JSON.parse(row.data, reviver);

    if (id.startsWith("app-state-sync-key-") && data) {
      try {
        return proto.Message.AppStateSyncKeyData.fromObject(data);
      } catch (e) {
        console.warn("⚠️ Failed to parse proto message:", e);
        return data;
      }
    }

    return data;
  } catch (err) {
    console.error("❌ Failed to load credentials:", err);
    return null;
  }
};

const remove = (id) => {
  try {
    db.prepare("DELETE FROM credentials WHERE id = ?").run(id);
  } catch (err) {
    console.error("❌ Failed to remove credentials:", err);
  }
};

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
          const transaction = db.transaction(() => {
            for (const id of ids) {
              const key = `${type}-${id}`;
              result[id] = load(key);
            }
          });

          try {
            transaction();
            return result;
          } catch (err) {
            console.error("❌ Failed to get keys:", err);
            return {};
          }
        },
        set: async (data) => {
          const transaction = db.transaction(() => {
            for (const category in data) {
              for (const id in data[category]) {
                const key = `${category}-${id}`;
                const value = data[category][id];
                value ? save(key, value) : remove(key);
              }
            }
          });

          try {
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
