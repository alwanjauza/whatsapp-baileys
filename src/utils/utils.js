const sharp = require("sharp");
const moment = require("moment");
const axios = require("axios");
require("dotenv").config();

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
┊ 🔹 #cuaca → Tampilkan informasi cuaca
┊ 🔹 #sticker → Kirim gambar dengan caption #sticker
┊ 🔹 #stock → Lihat stok produk
┊ 🔹 #buynow → Beli produk
┊ 🔹 #tanya → Tanya sesuai ke AI
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
      text: `╭────〔 ⚠️ FORMAT TIDAK VALID 〕────
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

async function getWeatherInfo(text, msg, from, sock) {
  const match = text.match(/#cuaca (.+)/i);
  await sock.sendMessage(from, {
    react: {
      text: "⏳",
      key: msg.key,
    },
  });
  if (!match) {
    await sock.sendMessage(from, {
      text: `╭────〔 ⚠️ FORMAT TIDAK VALID 〕────
┊ 💬 Perintah tidak dikenali.
┊ Contoh format benar:
┊ #cuaca Jakarta
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

  const city = match[1].trim();
  const apiKey = process.env.OPENWEATHER_API_KEY;
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(
    city
  )}&appid=${apiKey}&units=metric&lang=id`;

  try {
    const res = await axios.get(url);
    const data = res.data;

    const description = data.weather[0].description;
    const temp = data.main.temp;
    const feelsLike = data.main.feels_like;
    const humidity = data.main.humidity;
    const wind = data.wind.speed;

    const message = `╭────〔 🌤️ RAMALAN CUACA 〕────
┊ 📍 Lokasi: ${data.name}
┊ 🌡️ Suhu: ${temp}°C (terasa seperti ${feelsLike}°C)
┊ 💧 Kelembapan: ${humidity}%
┊ 💨 Angin: ${wind} m/s
┊ 📖 Cuaca: ${description}
╰──────────────────────`;

    await sock.sendMessage(from, { text: message });

    await sock.sendMessage(from, {
      react: {
        text: "✅",
        key: msg.key,
      },
    });
  } catch (error) {
    console.error("❌ Gagal mengambil data cuaca:", error.message);
    await sock.sendMessage(from, {
      text: `╭────〔 ⚠️ GAGAL MENGAMBIL DATA 〕────
┊ 💬 Tidak bisa mendapatkan info cuaca.
┊ 📍 Kota: ${city}
┊ 📌 Pastikan nama kota benar.
╰──────────────────────`,
    });
    await sock.sendMessage(from, {
      react: {
        text: "❌",
        key: msg.key,
      },
    });
  }
}

async function handleChatAiCommand(text, msg, from, sock) {
  await sock.sendMessage(from, {
    react: {
      text: "⌛",
      key: msg.key,
    },
  });

  const match = text.match(/^#tanya\s+(.+)/i);

  if (!match) {
    await sock.sendMessage(from, {
      text: `╭────〔 ⚠️ FORMAT TIDAK VALID 〕────
┊ 💬 Perintah tidak dikenali.
┊ Contoh format benar:
┊ #tanya Apa itu cuaca?
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

  const prompt = match[1];
  const apiKey = process.env.AIML_API_KEY;
  const url = "https://api.aimlapi.com/v1/chat/completions";

  try {
    const response = await axios.post(
      url,
      {
        model: "deepseek/deepseek-r1",
        messages: [
          {
            role: "system",
            content:
              "Kamu adalah manusia yang paling cerdas di dunia. Kamu tahu segalanya dan bisa menjawab semua pertanyaan dengan singkat dan jelas, tanpa bertaanya lebih lanjut. Dan jawab menggunakan bahasa yang sama dengan user tanyakan.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 100,
        temperature: 0.7,
        stream: false,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    const reply =
      response?.data?.choices[0]?.message?.content ?? "Tidak ada jawaban!";

    await sock.sendMessage(from, {
      text: `╭────〔 🤖 JAWABAN AI 〕────
┊ 💬 Pertanyaan: ${prompt}
┊
┊ 🧠 Jawaban:
┊ ${reply}
╰──────────────────────`,
    });

    await sock.sendMessage(from, {
      react: { text: "✅", key: msg.key },
    });
  } catch (error) {
    console.error("❌ Gagal memproses chat AI:", err);
    await sock.sendMessage(from, {
      text: `╭────〔 ⚠️ GAGAL MEMPROSES 〕────
┊ 💬 Tidak bisa menjawab saat ini.
┊ 🚫 Alasan: ${err.message}
┊
┊ Coba lagi nanti ya.
╰──────────────────────`,
    });
    await sock.sendMessage(from, {
      react: { text: "❌", key: msg.key },
    });
  }
}

module.exports = {
  convertToSticker,
  menuInfo,
  sendStockInfo,
  handleReminderCommand,
  getWeatherInfo,
  handleChatAiCommand,
};
