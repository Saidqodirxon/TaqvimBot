# 🚀 Production Deploy Guide

## Menu Button Setup

### 1. Menu Button Sozlash

```bash
cd /root/ramazonbot/api
node scripts/maintenance/set-menu-button.js
```

**Natija:**

- Telegram Web App da **Menu** tugmasi paydo bo'ladi (chap pastki burchakdagi ≡ tugma)
- Tugma bosilganda mini-app ochiladi
- Bu har bir foydalanuvchi uchun `initData` yuboradi

**Tekshirish:**

1. Telegram botga /start yuboring
2. Keyboard yonidagi ≡ (menu) tugmasini bosing
3. "📅 Taqvim" tugmasi ko'rinishi kerak
4. Bosganingizda WebApp ochilishi kerak

---

## Ecosystem Deploy

### 2. PM2 orqali Deploy Qilish

#### **Birinchi marta o'rnatish:**

```bash
# 1. Repository clone qiling
cd /root
git clone <your-repo-url> ramazonbot
cd ramazonbot

# 2. API dependencies o'rnatish
cd api
npm install

# 3. Admin Panel build
cd ../admin-panel
npm install
npm run build

# 4. Mini App build
cd ../mini-app
npm install
npm run build

# 5. .env faylni sozlang
cd ../api
nano .env
# BOT_TOKEN, MONGODB_URI, JWT_SECRET va boshqalarni kiriting

# 6. PM2 bilan ishga tushirish
pm2 start ecosystem.config.js

# 7. PM2 ni avtomatik restart qilish
pm2 startup
pm2 save
```

#### **Yangilanishlar (Updates):**

```bash
# Git dan yangilanishlarni oling
cd /root/ramazonbot
git pull

# Dependencies yangilash (kerak bo'lsa)
cd api
npm install

# Admin panel rebuild (UI o'zgargan bo'lsa)
cd ../admin-panel
npm run build

# Mini app rebuild (UI o'zgargan bo'lsa)
cd ../mini-app
npm run build

# PM2 restart
cd ../api
pm2 restart ecosystem.config.js

# Yoki alohida restart:
pm2 restart ramazonbot-api-9999
pm2 restart ramazonbot-backup-scheduler
pm2 restart ramazonbot-cache-refresh
```

### 3. PM2 Commands

#### **Status Ko'rish:**

```bash
pm2 status
pm2 list
```

#### **Logs Ko'rish:**

```bash
# Barcha loglar
pm2 logs

# Faqat bot loglari
pm2 logs ramazonbot-api-9999

# Backup scheduler loglari
pm2 logs ramazonbot-backup-scheduler

# Cache refresh loglari
pm2 logs ramazonbot-cache-refresh
```

#### **Restart/Stop/Delete:**

```bash
# Barcha processlarni restart
pm2 restart all

# Bitta processni restart
pm2 restart ramazonbot-api-9999

# Stop qilish
pm2 stop ramazonbot-api-9999

# Delete qilish
pm2 delete ramazonbot-api-9999

# Barchasini delete
pm2 delete all
```

#### **Monitoring:**

```bash
pm2 monit
```

---

## Ecosystem Config Tuzilishi

```javascript
module.exports = {
  apps: [
    {
      name: "ramazonbot-api-9999", // Bot + API Server
      script: "./bot.js",
      cwd: "/root/ramazonbot/api",
      env: { PORT: "9999" },
    },
    {
      name: "ramazonbot-cache-refresh", // Cache yangilash
      script: "./cache-refresh-scheduler.js",
    },
    {
      name: "ramazonbot-backup-scheduler", // Avtomatik backup
      script: "./scripts/maintenance/backup-scheduler.js",
    },
    {
      name: "ramazonbot-admin-9998", // Admin Panel
      script: "./nginx/server.main.js",
      cwd: "/root/ramazonbot/admin-panel",
      env: { PORT: "9998" },
    },
    {
      name: "ramazonbot-webapp-9997", // Mini App
      script: "./nginx/server.main.js",
      cwd: "/root/ramazonbot/mini-app",
      env: { PORT: "9997" },
    },
  ],
};
```

---

## Deploy Checklist

### ✅ Pre-Deploy

- [ ] `.env` fayl to'ldirilgan
- [ ] MongoDB connection string to'g'ri
- [ ] BOT_TOKEN to'g'ri
- [ ] MINI_APP_URL to'g'ri
- [ ] ADMIN_ID sozlangan
- [ ] JWT_SECRET kuchli parol

### ✅ Build

- [ ] `npm install` api da
- [ ] `npm run build` admin-panel da
- [ ] `npm run build` mini-app da

### ✅ PM2 Setup

- [ ] `pm2 start ecosystem.config.js`
- [ ] `pm2 status` - barcha processlar running
- [ ] `pm2 startup` - avtomatik restart
- [ ] `pm2 save` - config saqlash

### ✅ Post-Deploy Tests

- [ ] Bot /start ishlaydi
- [ ] Menu button ko'rinadi (≡ tugma)
- [ ] Mini app ochiladi
- [ ] Admin panel login qilish mumkin
- [ ] Backup scheduler ishlayapti
- [ ] Cache refresh ishlayapti

---

## Xatoliklarni Tuzatish

### Bot ishlamayapti:

```bash
# Logs tekshiring
pm2 logs ramazonbot-api-9999 --lines 100

# Environment variables tekshiring
pm2 env ramazonbot-api-9999

# Restart
pm2 restart ramazonbot-api-9999
```

### Backup ishlamayapti:

```bash
# Backup scheduler loglarini ko'ring
pm2 logs ramazonbot-backup-scheduler

# Manual backup test
cd /root/ramazonbot/api
node scripts/test/test-backup.js
```

### Cache yangilanmayapti:

```bash
# Cache scheduler loglarini ko'ring
pm2 logs ramazonbot-cache-refresh

# Manual cache test
cd /root/ramazonbot/api
node scripts/cache/ultimate-pre-cache.js
```

### Menu button ko'rinmayapti:

```bash
# Menu buttonni qayta sozlang
cd /root/ramazonbot/api
node scripts/maintenance/set-menu-button.js

# Botni restart qiling
pm2 restart ramazonbot-api-9999
```

---

## Ports

| Service     | Port | URL                     |
| ----------- | ---- | ----------------------- |
| Bot API     | 9999 | `http://localhost:9999` |
| Admin Panel | 9998 | `http://localhost:9998` |
| Mini App    | 9997 | `http://localhost:9997` |

**Nginx Reverse Proxy:**

```nginx
# Admin Panel
location /admin {
    proxy_pass http://localhost:9998;
}

# Mini App
location /app {
    proxy_pass http://localhost:9997;
}

# API
location /api {
    proxy_pass http://localhost:9999;
}
```

---

## Backup Strategy

### Avtomatik Backup:

- **Schedule:** Har kuni 03:00 da (sozlash mumkin)
- **Saqlash:** 7 kun (eski backuplar avtomatik o'chiriladi)
- **Format:** `.tar.gz` (JSON export + metadata)
- **Joylashuv:** `api/backups/`
- **Telegram:** Log kanalga avtomatik yuboriladi

### Manual Backup:

```bash
# Script orqali
node scripts/maintenance/backup-mongodb.js

# Admin panel orqali
# Backups sahifasiga kiring → "Yangi Backup" tugmasini bosing
```

---

## Monitoring

### Health Check:

```bash
# API status
curl http://localhost:9999/health

# PM2 status
pm2 status

# Disk space
df -h

# Memory usage
free -m
```

### Logs Location:

```
/root/ramazonbot/api/logs/
  ├── pm2-api-error.log
  ├── pm2-api-out.log
  ├── backup-scheduler-error.log
  ├── backup-scheduler-out.log
  ├── cache-refresh-error.log
  └── cache-refresh-out.log
```

---

## Quick Commands Reference

```bash
# Git update
cd /root/ramazonbot && git pull

# Install dependencies
cd api && npm install

# Rebuild frontends
cd admin-panel && npm run build
cd mini-app && npm run build

# PM2 operations
pm2 restart ecosystem.config.js   # Restart all
pm2 status                        # Status
pm2 logs                          # Logs
pm2 monit                         # Monitoring

# Menu button
cd api && node scripts/maintenance/set-menu-button.js

# Manual backup
cd api && node scripts/maintenance/backup-mongodb.js

# Manual cache refresh
cd api && node scripts/cache/ultimate-pre-cache.js
```

---

## 📝 Notes

1. **mongodump o'rniga:** Backup endi mongoose orqali JSON export qiladi (cross-platform)
2. **Menu button:** Telegram Web App uchun `setChatMenuButton` ishlatiladi
3. **Scheduler:** Backup va cache refresh avtomatik PM2 orqali ishga tushadi
4. **Logs:** Barcha loglar `api/logs/` da saqlanadi
5. **Admin access:** Faqat superadmin backup yaratishi/yuborishi mumkin
