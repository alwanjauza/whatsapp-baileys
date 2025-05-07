const { downloadMediaMessage } = require("@whiskeysockets/baileys");
require("dotenv").config();
const {
  sendStockInfo,
  convertToSticker,
  handleReminderCommand,
  menuInfo,
} = require("../utils/utils");

async function handleSticker(msg, from, sock) {
  try {
    await sock.sendMessage(from, {
      react: {
        text: "⏳",
        key: msg.key,
      },
    });

    const buffer = await downloadMediaMessage(
      msg,
      "buffer",
      {},
      {
        logger: console,
        reuploadRequest: sock.updateMediaMessage,
      }
    );

    const stickerBuffer = await convertToSticker(buffer);

    await sock.sendMessage(from, {
      sticker: stickerBuffer,
    });

    await sock.sendMessage(from, {
      react: {
        text: "✅",
        key: msg.key,
      },
    });

    if (from !== process.env.OWNER_NUMBER) {
      await sock.sendMessage(process.env.OWNER_NUMBER, {
        image: buffer,
        caption: `📥 Gambar dari ${from}`,
      });
      return;
    }
  } catch (err) {
    console.error("❌ Gagal mengirim stiker:", err);
  }
}

async function handleMessages(msgUpdate, sock) {
  const msg = msgUpdate.messages[0];
  if (!msg.message || msg.key.fromMe) return;

  const from = msg.key.remoteJid;

  if (
    msg.message.imageMessage &&
    msg.message.imageMessage.caption === "#sticker"
  ) {
    await handleSticker(msg, from, sock);
  }

  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption;

  if (text === "#menu") {
    await menuInfo(msg, from, sock);
  } else if (text === "#stock") {
    await sendStockInfo(msg, from, sock);
  } else if (text.startsWith("#remind me")) {
    await handleReminderCommand(text, msg, from, sock);
  }
}

module.exports = { handleMessages };
