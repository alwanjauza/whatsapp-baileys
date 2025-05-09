# 🤖 WhatsApp Bot Baileys - Multi-Functional Chatbot

WhatsApp Bot ini dibangun menggunakan [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) dengan berbagai fitur interaktif dan informatif, seperti konversi stiker, pengingat, info cuaca, AI Assistant, dan sistem auto order.

## 🔧 Fitur Utama

| Perintah                             | Deskripsi                                                     |
| ------------------------------------ | ------------------------------------------------------------- |
| `#menu`                              | Menampilkan daftar semua perintah yang tersedia               |
| `#cuaca [kota]`                      | Menampilkan informasi cuaca terkini untuk kota yang diberikan |
| `#tanya [pertanyaan]`                | Bertanya ke AI menggunakan AIMLAPI                            |
| `#remind me in [waktu] to [teks]`    | Menyetel pengingat otomatis                                   |
| Kirim gambar + `#sticker`            | Mengubah gambar menjadi stiker WhatsApp                       |
| `#stock` / `#buynow [kode] [jumlah]` | Menampilkan dan membeli stok produk                           |

Contoh:

```
#cuaca Jakarta
#tanya Apa itu kecerdasan buatan?
#remind me in 10 minutes to check oven
#buynow spo3b 2
```

---

## 📦 Instalasi

1. Clone repositori:

```bash
git clone https://github.com/username/whatsapp-baileys
cd whatsapp-baileys
```

2. Install dependensi:

```bash
npm install
```

---

## 🛠 Konfigurasi

Buat file `.env` pada root proyek:

```env
OPENWEATHER_API_KEY=your_openweather_api_key
AIML_API_KEY=your_aimlapi_key
```

---

## ▶️ Menjalankan Bot

```bash
node src/server.js
```

Untuk produksi, gunakan PM2:

```bash
pm2 start src/server.js --name whatsapp-bot
```

---

## 🧠 Struktur Proyek

```
src/
├── server.js        # Entry point bot
├── handler.js       # Command handler utama
└── utils.js         # Kumpulan fungsi: cuaca, AI, sticker, reminder, dsb
```

---

## ☁️ Auto Deploy (CI/CD)

Bot ini mendukung auto-deploy menggunakan GitHub Actions. Contoh `.github/workflows/deploy.yml`:

```yaml
name: Deploy WhatsApp Bot

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup SSH
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.SSH_PRIVATE_KEY }}" > ~/.ssh/id_rsa_ci_cd
          chmod 600 ~/.ssh/id_rsa_ci_cd
          ssh-keyscan -H "${{ secrets.SSH_HOST }}" >> ~/.ssh/known_hosts

      - name: Deploy to VPS
        run: |
          ssh -i ~/.ssh/id_rsa_ci_cd root@${{ secrets.SSH_HOST }} << 'EOF'
            export PATH=/root/.nvm/versions/node/v23.11.0/bin:$PATH
            cd /root/whatsapp-baileys
            git pull origin main
            pm2 restart whatsapp-bot || pm2 start src/server.js --name whatsapp-bot
          EOF
```

---

## 🧠 Integrasi AI dengan AIMLAPI

Untuk menggunakan fitur AI Chat:

- Pastikan kamu sudah memiliki API Key dari [https://aimlapi.com/app/](https://aimlapi.com/app/)
- Gunakan endpoint `/v1/chat/completions` dengan model `deepseek/deepseek-r1`
- Format prompt kamu di WhatsApp seperti:

```
#tanya Apa itu machine learning?
```

---

## ✨ Contoh Format Balasan

Format valid:

```
#remind me in 10 minutes to tidur
#cuaca Surabaya
#tanya Siapa itu Elon Musk?
```

Format valid akan dibalas:

```
╭────〔 🌤️ RAMALAN CUACA 〕────
┊ 📍 Lokasi: Jakarta
┊ 🌡️ Suhu: 27.97°C (terasa seperti 32.18°C)
┊ 💧 Kelembapan: 81%
┊ 💨 Angin: 2.06 m/s
┊ 📖 Cuaca: awan tersebar
╰──────────────────────

Format tidak valid akan dibalas:

```
╭────〔 ⚠️ FORMAT TIDAK VALID 〕────
┊ 💬 Perintah tidak dikenali.
┊ Contoh format benar:
┊ #tanya Apa itu cuaca?
┊
┊ Silakan coba lagi.
╰──────────────────────
```

---
## 👤 Dibuat Oleh

- Nama: Alwan Jauza
- GitHub: [@alwanjauza](https://github.com/alwanjauza)
- Kontak: +6282141083589
---

## 📄 Lisensi

Proyek ini dilisensikan di bawah lisensi MIT. Lihat LICENSE untuk informasi lebih lanjut.
```
