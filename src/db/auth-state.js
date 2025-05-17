const path = require("path");
const Database = require("better-sqlite3");
const { proto } = require("@whiskeysockets/baileys");

const db = new Database(path.join(__dirname, "../auth/sqlite/db.sqlite"));
db.pragma("journal_mode = WAL");

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS credentials (
    id TEXT PRIMARY KEY,
    data TEXT
  )
`
).run();

function save(id, data) {
  const json = JSON.stringify(data);
  db.prepare("REPLACE INTO credentials (id, data) VALUES (?, ?)").run(id, json);
}

function load(id) {
  const row = db.prepare("SELECT data FROM credentials WHERE id = ?").get(id);
  if (!row) return null;

  let data = JSON.parse(row.data);
  if (id.startsWith("app-state-sync-key-")) {
    data = proto.Message.AppStateSyncKeyData.fromObject(data);
  }

  return data;
}

function remove(id) {
  db.prepare("DELETE FROM credentials WHERE id = ?").run(id);
}

const initAuthCreds = require("@whiskeysockets/baileys").initAuthCreds;

async function useSQLiteAuthState() {
  const credsId = "creds";
  let creds = load(credsId) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          for (const id of ids) {
            data[id] = load(`${type}-${id}`);
          }
          return data;
        },
        set: async (data) => {
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const key = `${category}-${id}`;
              if (value) save(key, value);
              else remove(key);
            }
          }
        },
      },
    },
    saveCreds: async () => {
      save(credsId, creds);
    },
  };
}

module.exports = { useSQLiteAuthState };
