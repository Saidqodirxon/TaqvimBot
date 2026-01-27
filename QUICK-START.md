# 🚀 QUICK START GUIDE

## ⚡ Tezkor Ishga Tushirish

### 1️⃣ Bot ni ishga tushirish:

```bash
cd api
pm2 start ecosystem.config.js
pm2 logs ramazon-bot
```

### 2️⃣ Admin panel (Development):

```bash
cd admin-panel
npm run dev
# Open: http://localhost:5173
```

---

## 📋 Tez-tez ishlatiladigan buyruqlar

### Bot Status:

```bash
pm2 status ramazon-bot          # Status ko'rish
pm2 logs ramazon-bot            # Loglarni ko'rish
pm2 restart ramazon-bot         # Qayta ishga tushirish
pm2 stop ramazon-bot            # To'xtatish
pm2 delete ramazon-bot          # O'chirish
```

### Broadcast yuborish:

```bash
cd api/scripts/broadcast
node broadcast-location-professional.js
```

### Cache yangilash (60 kun):

```bash
cd api/scripts/cache
node ultimate-pre-cache.js
```

### Bot tokenni tekshirish:

```bash
cd api/scripts/test
node check-bot-token.js
```

### Settings yangilash:

```bash
cd api/scripts/maintenance
node seed-broadcast-settings.js
node seed-translations.js
```

### MongoDB backup:

```bash
cd api/scripts/maintenance
node backup-mongodb.js
```

---

## 🔑 Muhim Ma'lumotlar

**Bot:** @RealCoderUzBot  
**Admin Panel:** http://localhost:5173 (local)  
**API:** http://localhost:3000 (local)  
**MongoDB:** 64,645 users | 232 cities | 15,890 prayer data

---

## 📁 Papka Tuzilmasi

```
ramazonbot/
├── api/                          # Backend
│   ├── bot.js                   # Main bot
│   ├── ecosystem.config.js      # PM2 config
│   ├── .env                     # Environment (SECRET!)
│   └── scripts/                 # Yordamchi skriptlar
│       ├── broadcast/           # Broadcast
│       ├── cache/               # Cache
│       ├── import/              # Import
│       ├── test/                # Test
│       ├── maintenance/         # Maintenance
│       └── old/                 # Arxiv
├── admin-panel/                 # Admin panel
└── README.md                    # To'liq dokumentatsiya
```

---

## 🆘 Yordam

**To'liq dokumentatsiya:** `README.md`  
**Scripts qo'llanma:** `api/scripts/README.md`  
**Admin panel audit:** `ADMIN-PANEL-AUDIT.md`  
**Bot token config:** `BOT-TOKEN-CONFIG.md`
