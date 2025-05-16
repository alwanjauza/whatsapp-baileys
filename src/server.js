const path = require("path");
const cron = require("node-cron");
require("dotenv").config();
const {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} = require("@whiskeysockets/baileys");
const { handleMessages } = require("./handler/handler");
const { sendDailyQuote } = require("./utils/utils");

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

      cron.schedule(
        "0 6 * * *",
        async () => {
          const targets = [
            process.env.OWNER_NUMBER,
            process.env.PARTNER_NUMBER,
          ];

          for (const number of targets) {
            await sendDailyQuote(sock, number);
          }
          console.log("📅 Kutipan harian berhasil dikirim.");
        },
        {
          timezone: "Asia/Jakarta",
        }
      );
    }
  });

  sock.ev.on("messages.upsert", (msgUpdate) => handleMessages(msgUpdate, sock));
}

startBot();
