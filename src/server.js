const path = require("path");
require("dotenv").config();
const {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} = require("@whiskeysockets/baileys");
const { handleMessages } = require("./handler/handler");

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(
    path.join(__dirname, process.env.AUTH_FOLDER || "auth")
  );
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;
      console.log("📴 Koneksi terputus. Reconnect?", shouldReconnect);

      if (shouldReconnect) startBot();
    } else if (connection === "open") {
      console.log("✅ Terhubung ke WhatsApp!");
    }
  });

  sock.ev.on("messages.upsert", (msgUpdate) => handleMessages(msgUpdate, sock));
}

startBot();
