const {
  makeWASocket,
  fetchLatestBaileysVersion,
  DisconnectReason,
} = require("@whiskeysockets/baileys");
const cron = require("node-cron");
require("dotenv").config();
const { handleMessages } = require("./handler/handler");
const { sendDailyQuote } = require("./utils/utils");
const { useSQLiteAuthState } = require("./db/auth-state");

async function startBot() {
  const { state, saveCreds } = await useSQLiteAuthState();
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;
      console.log("📴 Koneksi terputus. Reconnect?", shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === "connecting" || !!qr) {
      try {
        const phoneNumber = process.env.BOT_PHONE_NUMBER;
        const pairingCode = await sock.requestPairingCode(phoneNumber);
        console.log("🔑 Pairing Code:", pairingCode);
        console.log(
          "➡️  Masukkan kode ini di WhatsApp: *Perangkat Tertaut* > *Tautkan Perangkat* > *Kode Pairing*"
        );
      } catch (err) {
        console.error("❌ Gagal membuat pairing code:", err);
      }
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
        { timezone: "Asia/Jakarta" }
      );
    }
  });

  sock.ev.on("messages.upsert", (msgUpdate) => handleMessages(msgUpdate, sock));
}

startBot();
