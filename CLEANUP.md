# 🧹 Production Cleanup Scripts

## O'zgarishlar (Changes)

### 1. ✅ Mini App API Tuzatishlari

#### `/api/miniapp/user/:userId`

- ❌ **Eski**: Default test ID ishlatilardi (1551855614)
- ✅ **Yangi**: Faqat haqiqiy Telegram user ID bilan ishlaydi
- ✅ Validatsiya: userId bo'sh yoki noto'g'ri bo'lsa → 400 error

#### `/api/miniapp/test` (Yangi)

- ✅ **Test endpoint** qo'shildi
- ✅ Sizning ID (1551855614) bilan test qilish uchun
- ✅ Test mode flag bilan qaytadi

#### `/api/miniapp/prayer-times`

- ✅ **500 error** tuzatildi
- ✅ Yaxshilangan error handling
- ✅ To'liq logging qo'shildi
- ✅ Parameter validatsiyasi

### 2. 📱 Mini App (Frontend)

- ❌ **Eski**: Default ID bilan ochilardi
- ✅ **Yangi**: Faqat Telegram WebApp kontekstida ishlaydi
- ✅ Agar Telegram dan ochilmasa → xato ko'rsatadi

### 3. 🧹 Cleanup Scripts

Serverdan keraksiz fayllarni o'chirish uchun:

- `cleanup-production.sh` - Linux/Mac
- `cleanup-production.bat` - Windows

---

## 🚀 Ishlatish (Usage)

### Test Endpoint

```bash
# Test endpoint (sizning ID bilan)
curl https://ramazonbot-api.saidqodirxon.uz/api/miniapp/test

# Haqiqiy user (Telegram dan kelganda)
curl https://ramazonbot-api.saidqodirxon.uz/api/miniapp/user/USER_ID
```

### Prayer Times

```bash
# To'g'ri request
curl -X POST https://ramazonbot-api.saidqodirxon.uz/api/miniapp/prayer-times \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1551855614,
    "latitude": 41.2995,
    "longitude": 69.2401
  }'

# Noto'g'ri request (400 error)
curl -X POST https://ramazonbot-api.saidqodirxon.uz/api/miniapp/prayer-times \
  -H "Content-Type: application/json" \
  -d '{"userId": 123}'  # latitude/longitude yo'q
```

### Cleanup Script (Server)

#### Linux/Mac:

```bash
# Upload script to server
scp cleanup-production.sh user@server:/path/to/ramazonbot/

# Run on server
cd /path/to/ramazonbot
chmod +x cleanup-production.sh
bash cleanup-production.sh
```

#### Windows Server:

```powershell
# Upload cleanup-production.bat to server
# Double-click or run:
cleanup-production.bat
```

---

## 📋 Cleanup Script Nima O'chiradi?

### ✅ O'chiriladigan fayllar:

- `*.log` - Barcha log fayllar
- `*-old.js` - Eski backup fayllar
- `*-backup.js` - Backup fayllar
- `*.tmp`, `*.temp` - Vaqtinchalik fayllar
- `.DS_Store`, `Thumbs.db` - OS fayllar
- `.vscode/`, `.idea/` - IDE sozlamalari
- `migrate-users.js` - Migration scriptlar
- `update-all-users-to-mwl.js` - Migration scriptlar
- `bot-old.js` - Eski bot versiyasi
- `coverage/`, `.nyc_output/` - Test coverage
- `dist/*.map` - Source maps (production uchun kerak emas)

### ⚠️ Saqlanadi:

- `.env` - Environment variables
- `node_modules/` - Dependencies
- `dist/` - Build fayllar (map'siz)
- `package.json` - Package config
- Barcha asosiy source fayllar

---

## 🤖 Telegram Bot Menu Setup

### WebApp URL sozlash:

1. **BotFather** ga boring: [@BotFather](https://t.me/BotFather)
2. `/mybots` buyrug'ini yuboring
3. Botingizni tanlang
4. `Bot Settings` → `Menu Button` → `Configure Menu Button`
5. URL kiriting:
   ```
   https://ramazonbot.saidqodirxon.uz
   ```

### Bot code (optional):

```javascript
// api/bot.js da
bot.setChatMenuButton({
  menu_button: {
    type: "web_app",
    text: "📅 Taqvim",
    web_app: {
      url: process.env.MINI_APP_URL || "https://ramazonbot.saidqodirxon.uz",
    },
  },
});
```

---

## 🔍 Debugging

### Mini App ishlamasa:

```javascript
// Browser console da tekshiring:
console.log("Telegram WebApp:", window.Telegram?.WebApp);
console.log("User:", window.Telegram?.WebApp?.initDataUnsafe?.user);
```

### API error'larni tekshirish:

```bash
# Server loglarni ko'rish
pm2 logs ramazonbot

# Specific error topish
pm2 logs ramazonbot | grep "Mini app"
pm2 logs ramazonbot | grep "Prayer times"
```

### Test qilish:

```bash
# 1. Test endpoint
curl https://ramazonbot-api.saidqodirxon.uz/api/miniapp/test

# 2. User endpoint (to'g'ri ID bilan)
curl https://ramazonbot-api.saidqodirxon.uz/api/miniapp/user/1551855614

# 3. User endpoint (noto'g'ri ID)
curl https://ramazonbot-api.saidqodirxon.uz/api/miniapp/user/invalid
# Natija: {"error": "Invalid user ID"}

# 4. Prayer times
curl -X POST https://ramazonbot-api.saidqodirxon.uz/api/miniapp/prayer-times \
  -H "Content-Type: application/json" \
  -d '{"userId": 1551855614, "latitude": 41.2995, "longitude": 69.2401}'
```

---

## 📝 Response Format

### Success (200):

```json
{
  "userId": 1551855614,
  "firstName": "John",
  "language": "uz",
  "location": {
    "name": "Tashkent",
    "latitude": 41.2995,
    "longitude": 69.2401
  },
  "prayerSettings": {...},
  "reminderSettings": {...}
}
```

### Error (400 - Bad Request):

```json
{
  "error": "Invalid user ID"
}
```

### Error (404 - Not Found):

```json
{
  "error": "User not found"
}
```

### Error (500 - Server Error):

```json
{
  "error": "Internal server error",
  "message": "Detailed error message"
}
```

---

## ⚡ Production Checklist

- [x] Default test ID o'chirildi
- [x] `/test` endpoint qo'shildi
- [x] Prayer times 500 error tuzatildi
- [x] Cleanup script yaratildi
- [x] Telegram WebApp integration
- [x] Error handling yaxshilandi
- [x] Logging qo'shildi
- [ ] Server'da cleanup script run qiling
- [ ] Telegram menu button sozlang
- [ ] Production'da test qiling

---

## 🆘 Muammolar?

### Mini app ochilmasa:

1. Telegram Menu Button to'g'ri sozlanganmi?
2. HTTPS ishlamoqdami?
3. CORS sozlamalari to'g'rimi?

### 500 error:

1. Server loglarni tekshiring: `pm2 logs ramazonbot`
2. Database connection bormi?
3. User database'da mavjudmi?

### Test endpoint ishlamasa:

1. User ID (1551855614) database'da bormi?
2. Server restart qiling: `pm2 restart ramazonbot`
3. Logs tekshiring

---

**Yangilangan**: $(date)
**Version**: 2.0.0
**Status**: ✅ Production Ready
