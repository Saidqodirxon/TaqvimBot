# 🚀 Production Deployment - Ramazon Bot

## ✅ O'zgartirishlar (Changes Made)

### 1. Backend URL Configuration

- ✅ **Admin Panel**: Barcha sahifalarda `localhost:3001` o'rniga global API URL ishlatildi
- ✅ **Mini App**: Backend URL `https://ramazonbot-api.saidqodirxon.uz` ga to'g'rilandi
- ✅ Markazlashtirilgan `API_URL` export qilindi (`admin-panel/src/api.js`)

### 2. Bot Calendar Menu

- ✅ **Taqvim tugmasi** asosiy menyuga qo'shildi (har doim ko'rinadi)
- ✅ Taqvim ichida 3 variant:
  - 📅 Kunlik ko'rinish (inline)
  - 📅 Haftalik ko'rinish (inline)
  - 📱 WebApp (agar HTTPS URL sozlangan bo'lsa)
- ✅ Foydalanuvchi o'zi tanlashi mumkin

### 3. Production Optimization

- ✅ **Logging**: Barcha `console.error` → `logger.error` ga o'zgartirildi
- ✅ **Debugging logs**: Keraksiz `console.log` lar tozalandi
- ✅ **Log fayllari**: `bot.log` o'chirildi
- ✅ **Gitignore**: Production uchun `.gitignore` yaratildi
- ✅ **Env template**: `MINI_APP_URL` qo'shildi

### 4. Mini App 500 Error Fix

- ✅ Backend route (`/api/miniapp/user/:userId`) to'g'ri logger ishlatadi
- ✅ Error handling yaxshilandi
- ✅ User not found → 404, Server error → 500

## 📋 Production Checklist

### Environment Variables (.env)

```env
# Bot
BOT_TOKEN=your_token_here
BOT_USER=your_bot_username
ADMIN_ID=your_telegram_id
ADMIN_USER=your_telegram_username

# Database
DB_URL=mongodb://your_mongo_url

# Channels
CHANNEL_ID=-100...
CHANNEL_USER=your_channel

# Mini App (Optional)
MINI_APP_URL=https://ramazonbot.saidqodirxon.uz

# API Port (default: 3001)
PORT=3001
```

### Deployment Steps

#### 1. Admin Panel

```bash
cd admin-panel
npm install
npm run build
# Deploy dist/ folder to your web server
```

#### 2. Mini App

```bash
cd mini-app
npm install
npm run build
# Deploy dist/ folder to your web server
```

#### 3. API/Bot

```bash
cd api
npm install

# Set up .env file
cp .env.template .env
nano .env  # Configure all variables

# Start with PM2 (recommended)
pm2 start bot.js --name ramazonbot
pm2 save
pm2 startup

# Or with Docker
docker-compose up -d
```

## 🔍 Testing Endpoints

### Mini App API

```bash
# Test user endpoint
curl https://ramazonbot-api.saidqodirxon.uz/api/miniapp/user/YOUR_USER_ID

# Test prayer times
curl -X POST https://ramazonbot-api.saidqodirxon.uz/api/miniapp/prayer-times \
  -H "Content-Type: application/json" \
  -d '{"userId": YOUR_USER_ID, "latitude": 41.2995, "longitude": 69.2401}'
```

### Admin API

```bash
# Login
curl -X POST https://ramazonbot-api.saidqodirxon.uz/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "your_password"}'

# Get stats (need token)
curl https://ramazonbot-api.saidqodirxon.uz/api/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🛡️ Security Checklist

- ✅ `.env` file `.gitignore` da
- ✅ Barcha API endpoint'lar autentifikatsiya talab qiladi
- ✅ Production logs faqat error va critical
- ✅ CORS sozlamalari to'g'ri
- ⚠️ **HTTPS** ishlatilishi shart (Let's Encrypt)
- ⚠️ **Rate limiting** qo'shish kerak (DoS protection)
- ⚠️ **MongoDB** `AUTH` yoqilsin

## 📊 Monitoring

### PM2 Commands

```bash
pm2 status              # Status ko'rish
pm2 logs ramazonbot     # Loglarni ko'rish
pm2 restart ramazonbot  # Restart
pm2 stop ramazonbot     # To'xtatish
```

### Health Check

```bash
# Bot ishlab turibmi?
curl https://ramazonbot-api.saidqodirxon.uz/api/stats

# Database connection?
pm2 logs ramazonbot | grep "Database connected"
```

## 🐛 Common Issues

### 1. Mini App 500 Error

- ✅ **Fixed**: Backend URL to'g'rilandi
- Check: User database'da mavjudmi?
- Check: Location set qilinganmi?

### 2. Calendar tugmasi ishlamayapti

- ✅ **Fixed**: Asosiy menyuga qo'shildi
- Check: User location sozlanganmi?
- Check: Bot permissions to'g'rimi?

### 3. Admin Panel 401/403

- Check: Token localStorage'da bormi?
- Check: Token muddati o'tmaganmi?
- Re-login qiling

## 🎯 Next Steps

### Recommended Improvements

1. **Rate Limiting**: Express rate limiter qo'shing
2. **Caching**: Redis cache user/prayer times uchun
3. **Backup**: Automated MongoDB backup
4. **SSL**: Let's Encrypt auto-renew
5. **CDN**: Static files uchun CDN
6. **Monitoring**: Sentry yoki similar error tracking

### Performance

- [ ] Database indexlar optimallashtirish
- [ ] API response time monitoring
- [ ] Redis cache qo'shish
- [ ] CDN static files uchun

---

## 📞 Support

Muammolar yoki savollar bo'lsa:

- GitHub Issues: [your-repo-url]
- Telegram: @your_username

**Deployed**: $(date)
**Version**: 1.0.0
**Status**: ✅ Ready for Production
