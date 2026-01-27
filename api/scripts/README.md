# 📁 SCRIPTS DIRECTORY STRUCTURE

Barcha yordamchi skriptlar kategoriyalarga bo'lingan:

## 📂 scripts/broadcast/

Broadcast xabarlari yuborish skriptlari:

- `broadcast-location-professional.js` - Professional rate-limited broadcast (ISHLATILADI)
- `broadcast-location-request.js` - Oddiy broadcast (eski)
- `broadcast-to-channel.js` - Kanalga xabar yuborish
- `test-broadcast-professional.js` - Test broadcast admin ga
- `test-location-broadcast.js` - Joylashuv broadcast testi

**Asosiy:** `broadcast-location-professional.js`

---

## 📂 scripts/cache/

Prayer time cache skriptlari:

- `ultimate-pre-cache.js` - Asosiy pre-cache (60 kun, 232 city) - ISHLATILADI
- `cache-refresh-scheduler.js` - Cache yangilash scheduler
- `check-cache-status.js` - Cache holatini tekshirish
- `pre-cache-all-cities.js` - Barcha shaharlar uchun cache
- `pre-cache-uzbekistan-full.js` - To'liq O'zbekiston cache
- `pre-cache-uzbekistan.js` - Oddiy O'zbekiston cache
- `smart-pre-cache.js` - Aqlli cache (parallel)
- `test-pre-cache.js` - Cache test

**Asosiy:** `ultimate-pre-cache.js`

---

## 📂 scripts/import/

Ma'lumotlarni import qilish:

- `import-users-from-json.js` - Userlarni JSON dan import - ISHLATILADI
- `import-all-cities.js` - Barcha shaharlarni import
- `import-cities-fast.js` - Tez shahar import
- `import-extended-cities.js` - Kengaytirilgan shaharlar
- `import-old-users.js` - Eski userlar
- `extract-users-from-logs.js` - Loglardan userlarni ajratib olish

**Asosiy:** `import-users-from-json.js`

---

## 📂 scripts/test/

Test va debugging skriptlari:

- `check-bot-token.js` - Bot tokenni tekshirish - ISHLATILADI
- `test-aladhan.js` - Aladhan API test
- `test-api.js` - Admin API test
- `test-bot-load.js` - Bot load test

**Asosiy:** `check-bot-token.js`

---

## 📂 scripts/maintenance/

Database maintenance va seedlar:

- `backup-mongodb.js` - MongoDB backup - ISHLATILADI
- `seed-broadcast-settings.js` - Broadcast settings seed - ISHLATILADI
- `seed-translations.js` - Translations seed - ISHLATILADI
- `create-indexes.js` - Database indexlar yaratish
- `update-all-users-to-mwl.js` - User metodlarini yangilash

**Asosiy:**

- `backup-mongodb.js`
- `seed-broadcast-settings.js`
- `seed-translations.js`

---

## 📂 scripts/old/

Eski/ishlatilmaydigan fayllar:

- `bot-old.js` - Eski bot versiyasi
- `migrate-cache-to-data.js` - Cache migratsiya (tugallangan)
- `migrate-users.js` - User migratsiya (tugallangan)
- `list-collections.js` - Collection ro'yxati
- `complete-data-update.js` - Data update (tugallangan)
- `rename-cache-collection.js` - Collection rename (tugallangan)

**Status:** Arxiv maqsadida saqlanadi

---

## 🚀 ENG KO'P ISHLATILADIGAN SKRIPTLAR

### 1. Broadcast yuborish:

```bash
cd api/scripts/broadcast
node broadcast-location-professional.js
```

### 2. Cache yangilash (60 kun, 232 city):

```bash
cd api/scripts/cache
node ultimate-pre-cache.js
```

### 3. Bot token tekshirish:

```bash
cd api/scripts/test
node check-bot-token.js
```

### 4. Userlarni import qilish:

```bash
cd api/scripts/import
node import-users-from-json.js
```

### 5. Settings seed:

```bash
cd api/scripts/maintenance
node seed-broadcast-settings.js
node seed-translations.js
```

### 6. MongoDB backup:

```bash
cd api/scripts/maintenance
node backup-mongodb.js
```

---

## 📋 ASOSIY FAYLLAR (API root)

Bot va API:

- `bot.js` - Main bot + Express API server
- `ecosystem.config.js` - PM2 configuration
- `package.json` - Dependencies
- `.env` - Environment variables

---

**Oxirgi yangilanish:** 2026-01-27  
**Status:** ✅ Tartibga keltirilgan
