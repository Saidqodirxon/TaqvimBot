# 🐛 Logger Error Fix

## Muammo (Problem)

```
TypeError: logger.error is not a function
```

## Sabab (Cause)

Logger class'da `error()`, `info()`, `warn()` metodlari yo'q edi. Faqat `logError()` metodi bor edi.

## Yechim (Solution)

### 1. Logger metodlari qo'shildi

`api/utils/logger.js` ga quyidagi metodlar qo'shildi:

```javascript
// Standard error logging
error(message, error = null) {
  if (error) {
    console.error(message, error);
  } else {
    console.error(message);
  }
  
  // Critical errors send to Telegram
  if (error && error.stack && this.enabled) {
    this.logError(error, message).catch(() => {});
  }
}

// Info logging
info(message) {
  console.log(message);
}

// Warning logging
warn(message) {
  console.warn(message);
}
```

### 2. Bot.js startup errors tuzatildi

Startup errors `console.error` ga qaytarildi (logger ishlamay turganida error bermasligi uchun).

## Server'da Yangilash

### Birinchi usul: Manual

```bash
# 1. Upload yangilangan fayllarni
scp api/utils/logger.js root@server:/root/ramazonbot/api/utils/
scp api/bot.js root@server:/root/ramazonbot/api/

# 2. Restart bot
ssh root@server "cd /root/ramazonbot/api && pm2 restart ramazonbot"

# 3. Logs ko'rish
ssh root@server "pm2 logs ramazonbot"
```

### Ikkinchi usul: Git (tavsiya etiladi)

```bash
# Local'da
git add .
git commit -m "Fix logger error method"
git push origin main

# Server'da
ssh root@server
cd /root/ramazonbot
git pull origin main
cd api
pm2 restart ramazonbot
pm2 logs ramazonbot
```

### Uchinchi usul: Deploy script

```bash
# Server'ga script'larni upload qiling
scp quick-restart.sh root@server:/root/ramazonbot/
scp deploy.sh root@server:/root/ramazonbot/

# Server'da
ssh root@server
cd /root/ramazonbot
chmod +x quick-restart.sh deploy.sh

# Quick restart (faqat restart)
bash quick-restart.sh

# Full deploy (pull, install, build, restart)
bash deploy.sh
```

## Test Qilish

```bash
# 1. Bot status
pm2 status ramazonbot

# 2. Logs ko'rish
pm2 logs ramazonbot --lines 50

# 3. Test endpoint
curl https://ramazonbot-api.saidqodirxon.uz/api/miniapp/test

# 4. Health check
curl https://ramazonbot-api.saidqodirxon.uz/api/stats
```

## Logger Usage

### Console replacement

```javascript
// Eski
console.error("Error:", error);
console.log("Info message");
console.warn("Warning");

// Yangi
logger.error("Error:", error);
logger.info("Info message");
logger.warn("Warning");
```

### Telegram logging (critical errors only)

```javascript
// Automatic - error stack bilan
logger.error("Critical error", new Error("Something went wrong"));

// Manual - custom message
await logger.logError(error, "Context information");
```

## Scripts

### quick-restart.sh
- Tez restart qilish
- Logs ko'rsatish
- Status tekshirish

### deploy.sh
- Git pull
- Dependencies install
- Build frontend
- Restart bot
- Status ko'rsatish

### cleanup-production.sh
- Keraksiz fayllarni o'chirish
- Production optimization

## PM2 Commands

```bash
pm2 restart ramazonbot  # Restart
pm2 stop ramazonbot     # Stop
pm2 start ramazonbot    # Start
pm2 delete ramazonbot   # Remove
pm2 logs ramazonbot     # Live logs
pm2 logs ramazonbot --lines 100  # Last 100 lines
pm2 status              # All processes
pm2 save               # Save config
pm2 startup            # Auto-start on reboot
```

## Monitoring

```bash
# Logs real-time
pm2 logs ramazonbot

# Monit dashboard
pm2 monit

# Web dashboard (agar PM2 Plus bor bo'lsa)
pm2 plus
```

## Troubleshooting

### Bot ishlamayapti
```bash
pm2 logs ramazonbot  # Error log ko'rish
pm2 restart ramazonbot  # Restart
```

### Database connection error
```bash
# Check MongoDB
systemctl status mongod
# Restart MongoDB
systemctl restart mongod
```

### Port already in use
```bash
# Find process
lsof -i :3001
# Kill process
kill -9 <PID>
# Restart bot
pm2 restart ramazonbot
```

---

**Status**: ✅ Fixed
**Date**: $(date)
**Version**: 2.0.1
