# 🚨 BOT INFINITE LOOP FIX

## Muammo

Bot serverda ishga tushganda bir xil logni chiqarib infinite loop ga tushgan:

```
✅ Prayer data found for 41.2995_69.2401 on 2026-01-26
✅ Prayer data found for 41.2995_69.2401 on 2026-01-26
...
```

## Sabab

`api/utils/aladhan.js` faylida development uchun qo'yilgan `console.log` production da juda ko'p chiqib, log faylini to'ldirib yuborgan va botni sekinlashtirgan.

## Tuzatildi ✅

### 1. **aladhan.js - Verbose Logs O'chirildi**

```javascript
// OLD:
console.log(`✅ Prayer data found for ${locationKey} on ${dateStr}`);

// NEW:
// console.log(`✅ Prayer data found for ${locationKey} on ${dateStr}`);
```

```javascript
// OLD:
console.log(`💾 Saved prayer data for ${locationKey} on ${dateStr}`);

// NEW:
// console.log(`💾 Saved prayer data for ${locationKey} on ${dateStr}`);
```

### 2. **Restart Script Yaratildi**

`restart-bot.sh` - Bot va barcha servicelarni to'g'ri restart qilish uchun.

## Production Deploy

### 1. Serverdagi Proceslarni To'xtatish:

```bash
# Option 1: PM2 orqali
pm2 stop all
pm2 delete all

# Option 2: Manual
pkill -f "node bot.js"
pkill -f "node.*ramazonbot"
```

### 2. Yangilanishlarni Yuklash:

```bash
cd /root/ramazonbot
git pull
cd api
npm install
```

### 3. Botni Ishga Tushirish:

```bash
cd /root/ramazonbot/api

# PM2 bilan (tavsiya etiladi)
pm2 start ecosystem.config.js
pm2 save

# Yoki restart script bilan
bash ../restart-bot.sh
```

### 4. Logs Tekshirish:

```bash
# Barcha loglar
pm2 logs

# Faqat bot loglari
pm2 logs ramazonbot-api-9999 --lines 100

# Real-time monitoring
pm2 monit
```

## Kelajakda Bunday Muammolardan Qochish

### Production Logs Best Practices:

1. **Development vs Production:**

```javascript
// ❌ BAD - har doim chiqadi
console.log("Some debug info");

// ✅ GOOD - faqat development da
if (process.env.NODE_ENV !== "production") {
  console.log("Debug info");
}
```

2. **Use Logger with Levels:**

```javascript
// ✅ BEST
const logger = require("./utils/logger");
logger.debug("Detail info"); // Faqat debug mode da
logger.info("Important info"); // Foydalanuvchi ko'rishi kerak
logger.error("Error message"); // Xatolar
```

3. **Limit Loop Logs:**

```javascript
// ❌ BAD - har iteratsiyada log
for (let user of users) {
  console.log(`Processing user ${user.id}`);
}

// ✅ GOOD - faqat summary
console.log(`Processing ${users.length} users...`);
for (let user of users) {
  // Process without logging
}
console.log(`✅ Processed ${users.length} users`);
```

## Xatoliklarni Tuzatish

### Bot hali ham spam qilsa:

```bash
# 1. Loglarni tekshiring
pm2 logs ramazonbot-api-9999 | grep "Prayer data"

# 2. Procesni restart qiling
pm2 restart ramazonbot-api-9999

# 3. Kod yangilanganini tekshiring
cd /root/ramazonbot/api
grep -n "Prayer data found" utils/aladhan.js
# Natija: 43 qatorda comment bo'lishi kerak
```

### PM2 logs juda katta bo'lsa:

```bash
# Loglarni tozalash
pm2 flush

# Log fayllarini o'chirish
rm -f /root/.pm2/logs/*.log
```

## Quick Commands

```bash
# Status
pm2 status

# Restart
pm2 restart ramazonbot-api-9999

# Logs
pm2 logs --lines 50

# Stop
pm2 stop all

# Delete all
pm2 delete all

# Fresh start
pm2 start ecosystem.config.js
pm2 save
```
