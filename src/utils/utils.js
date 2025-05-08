const sharp = require("sharp");
const moment = require("moment");

async function convertToSticker(buffer) {
  return await sharp(buffer)
    .resize(512, 512, { fit: "inside" })
    .webp()
    .toBuffer();
}

async function menuInfo(msg, from, sock) {
  try {
    await sock.sendMessage(from, {
      react: {
        text: "⏳",
        key: msg.key,
      },
    });

    await sock.sendMessage(from, {
      text: `╭───〔 ❓ BANTUAN BOT 〕───
┊ 📄 Perintah yang tersedia:
┊ 
┊ 🔹 #menu → Tampilkan menu
┊ 🔹 #sticker → Kirim gambar dengan caption #sticker
┊ 🔹 #stock → Lihat stok produk
┊ 🔹 #buynow → Beli produk
┊ 🔹 #remind me in → Atur pengingat
┊
┊ ❓ Butuh bantuan? Hubungi admin +6282141083589
╰──────────────────────

Created by: @alwanjauza`,
    });
    await sock.sendMessage(from, {
      react: {
        text: "✅",
        key: msg.key,
      },
    });
  } catch (err) {
    console.error("❌ Gagal mengirim informasi menu:", err);
  }
}

async function sendStockInfo(msg, from, sock) {
  try {
    await sock.sendMessage(from, {
      react: {
        text: "⏳",
        key: msg.key,
      },
    });

    await sock.sendMessage(from, {
      text: `╭────〔 BOT AUTO ORDER 〕──
┊・ Untuk membeli Ketik Perintah Berikut
┊・ #buynow Kode(spasi)JumlahAkun
┊・ Ex: #buynow spo3b 1
┊・ Pastikan Code & Jumlah Akun di Ketik dengan benar
╰──────────────────────

Created by: @alwanjauza`,
    });

    await sock.sendMessage(from, {
      react: {
        text: "✅",
        key: msg.key,
      },
    });
  } catch (err) {
    console.error("❌ Gagal mengirim informasi stocks:", err);
  }
}

async function handleReminderCommand(text, msg, from, sock) {
  await sock.sendMessage(from, {
    react: {
      text: "⌛",
      key: msg.key,
    },
  });

  const match = text.match(
    /#remind me in (\d+)\s*(seconds?|minutes?|hours?|days?) to (.+)/i
  );

  if (!match) {
    await sock.sendMessage(from, {
      text: `╭─〔 ⚠️ FORMAT TIDAK VALID 〕─
┊ 💬 Perintah tidak dikenali.
┊ Contoh format benar:
┊ #remind me in 10 minutes to tidur
┊
┊ Silakan coba lagi.
╰──────────────────────`,
    });

    await sock.sendMessage(from, {
      react: {
        text: "❌",
        key: msg.key,
      },
    });

    return;
  }

  const duration = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const reminderText = match[3];
  const validUnits = {
    second: 1000,
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
  };

  let unitKey = Object.keys(validUnits).find((key) => unit.includes(key));
  if (!unitKey) {
    await sock.sendMessage(from, {
      text: `⚠️ Unit waktu tidak dikenali. Gunakan: seconds, minutes, hours, days.`,
    });
    return;
  }

  const delay = duration * validUnits[unitKey];
  const reminderTime = moment().add(delay, "milliseconds");

  await sock.sendMessage(from, {
    text: `╭────〔 🔔 PENGINGAT AKTIF 〕────
┊ ⏰ Reminder berhasil di-set!
┊ 💬 Akan mengingatkan dalam ${duration} ${unit}.
┊ 📝 Pesan: "${reminderText}"
┊ 📆 Waktu: ${reminderTime.format("LLLL")}
╰──────────────────────`,
  });

  setTimeout(async () => {
    try {
      await sock.sendMessage(from, {
        text: `⏰ Pengingat: ${reminderText}`,
      });
    } catch (err) {
      console.error("Gagal mengirim pengingat:", err);
    }
  }, delay);

  await sock.sendMessage(from, {
    react: {
      text: "✅",
      key: msg.key,
    },
  });
}

module.exports = {
  convertToSticker,
  menuInfo,
  sendStockInfo,
  handleReminderCommand,
};
