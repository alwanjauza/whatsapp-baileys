const {
  makeWASocket,
  fetchLatestBaileysVersion,
  DisconnectReason,
  delay,
  Browsers,
  useMultiFileAuthState,
} = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const pino = require("pino");
const cron = require("node-cron");
require("dotenv").config();

const { handleMessages } = require("./handler/handler");
const { sendDailyQuote } = require("./utils/utils");

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "info" : "debug",
});

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("../auth");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
    logger,
    browser: Browsers.ubuntu("Chrome"),
    getMessage: async () => undefined,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrcode.generate(qr, { small: true });
      logger.info("🔐 Scan QR code above to login.");
    }

    if (connection === "close") {
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !==
        DisconnectReason.loggedOut;

      if (shouldReconnect) {
        logger.warn("🔄 Reconnecting...");
        await delay(3000);
        startBot();
      } else {
        logger.error("❌ Logged out. Delete auth database to login again.");
        process.exit(1);
      }
    }

    if (connection === "open") {
      logger.info("✅ WhatsApp connected!");
      setupCronJobs(sock);
    }
  });

  sock.ev.on("messages.upsert", (msg) => handleMessages(msg, sock));
}

function setupCronJobs(sock) {
  cron.schedule(
    "0 6 * * *",
    async () => {
      const targets = [
        process.env.OWNER_NUMBER,
        process.env.PARTNER_NUMBER,
      ].filter(Boolean);
      try {
        await Promise.all(
          targets.map((number) => sendDailyQuote(sock, number))
        );
        logger.info("✅ Daily quotes sent.");
      } catch (err) {
        logger.error("❌ Failed to send quotes:", err);
      }
    },
    { timezone: "Asia/Jakarta" }
  );
}

startBot();
