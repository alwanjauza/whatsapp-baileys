const {
  makeWASocket,
  DisconnectReason,
  fetchLatestBaileysVersion,
  delay,
  useSingleFileAuthState, // Fallback option
  Browsers,
} = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");
const cron = require("node-cron");
const readline = require("readline");
require("dotenv").config();
const { handleMessages } = require("./handler/handler");
const { sendDailyQuote } = require("./utils/utils");
const { useSQLiteAuthState } = require("./db/auth-state");
const pino = require("pino");

const logger = pino({
  level: process.env.NODE_ENV === "production" ? "error" : "debug",
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function askAuthMethod() {
  return new Promise((resolve) => {
    rl.question(
      "Choose authentication method:\n[1] QR Code\n[2] Pairing Code\n> ",
      (answer) => {
        resolve(answer.trim());
      }
    );
  });
}

async function askPhoneNumber() {
  return new Promise((resolve) => {
    rl.question(
      "Enter your WhatsApp number (with country code, e.g. 6281234567890):\n> ",
      (answer) => {
        resolve(answer.trim().replace(/\D/g, ""));
      }
    );
  });
}

async function startBot(useQR = false, phoneNumber = null) {
  try {
    // Try SQLite first, fallback to file if error
    let authState;
    try {
      authState = await useSQLiteAuthState();
    } catch (sqliteError) {
      logger.warn("SQLite failed, falling back to file auth state");
      authState = useSingleFileAuthState("./auth_info.json");
    }

    const { state, saveCreds } = authState;
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      logger,
      browser: Browsers.ubuntu("Chrome"),
      syncFullHistory: false,
      getMessage: async () => undefined,
      // Removed printQRInTerminal as it's deprecated
    });

    sock.ev.on("creds.update", saveCreds);

    let pairingRequested = false;
    let connectionAttempts = 0;
    let qrGenerated = false;

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr, isNewLogin } = update;

      // Handle QR Code
      if (useQR && qr && !qrGenerated) {
        qrGenerated = true;
        qrcode.generate(qr, { small: true });
        logger.info("Scan the QR code above with your phone");
      }

      if (connection === "close") {
        const shouldReconnect =
          lastDisconnect?.error?.output?.statusCode !==
          DisconnectReason.loggedOut;

        if (shouldReconnect) {
          connectionAttempts++;
          const delayTime = Math.min(5000 * connectionAttempts, 30000);
          logger.info(`Reconnecting in ${delayTime / 1000} seconds...`);
          await delay(delayTime);
          startBot(useQR, phoneNumber);
        }
        return;
      }

      if (connection === "connecting") {
        connectionAttempts = 0;
        logger.info("Connecting to WhatsApp...");
      }

      if (!useQR && connection === "connecting" && !pairingRequested) {
        try {
          if (!phoneNumber) {
            phoneNumber = await askPhoneNumber();
          }

          if (!phoneNumber.match(/^\d{10,15}$/)) {
            throw new Error(
              "Invalid phone number format. 10-15 digits required."
            );
          }

          logger.info(`Requesting pairing code for ${phoneNumber}...`);
          await delay(2000);

          const code = await sock.requestPairingCode(phoneNumber);
          logger.info(`\n✅ Pairing Code: ${code}`);
          logger.info(
            "Go to WhatsApp: Linked Devices > Link a Device > Pairing Code"
          );
          pairingRequested = true;
        } catch (err) {
          logger.error("Pairing failed:", err.message);
          pairingRequested = false;
          phoneNumber = null;
          await delay(3000);
          startBot(useQR);
        }
      }

      if (connection === "open") {
        logger.info("✅ Successfully connected to WhatsApp!");
        if (isNewLogin) {
          logger.info("New login detected, credentials saved");
        }
        setupCronJobs(sock);
      }
    });

    sock.ev.on("messages.upsert", (msgUpdate) =>
      handleMessages(msgUpdate, sock)
    );
  } catch (err) {
    logger.error("Bot startup failed:", err.message);
    await delay(5000);
    startBot(useQR, phoneNumber);
  }
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
        logger.info("Daily quotes sent successfully");
      } catch (err) {
        logger.error("Failed to send daily quotes:", err);
      }
    },
    { timezone: "Asia/Jakarta" }
  );
}

(async () => {
  try {
    console.log("WhatsApp Bot Initializing...");
    const method = await askAuthMethod();

    if (method === "1") {
      await startBot(true);
    } else if (method === "2") {
      const phoneNumber = await askPhoneNumber();
      await startBot(false, phoneNumber);
    } else {
      console.log("Invalid option. Please run again and choose 1 or 2.");
      process.exit(1);
    }
  } catch (err) {
    console.error("Initialization error:", err.message);
    process.exit(1);
  } finally {
    rl.close();
  }
})();
