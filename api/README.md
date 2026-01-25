# Ramazon Taqvim Bot - Yangilangan Versiya

## 📋 O'zgarishlar

### ✅ Amalga oshirilgan yangiliklar:

1. **Aladhan.com API integratsiyasi**

   - ❌ islomapi.uz o'rniga Aladhan.com API dan foydalanish
   - ✅ Xanafiy mazhabi (Hanafi school)
   - ✅ Karachi universiteti uslubi (method=1)
   - ✅ Toshkent vaqti (Asia/Tashkent)
   - ✅ Koordinatalar orqali namoz vaqtlarini olish

2. **Majburiy kanal funksiyasi**

   - ✅ Foydalanuvchi botdan foydalanish uchun kanalga obuna bo'lishi shart
   - ✅ Admin paneldan kanal sozlanadi
   - ✅ Kanal obunasini tekshirish

3. **Til tanlash optimizatsiyasi**

   - ✅ Til faqat birinchi /start da so'raladi
   - ✅ Profilda saqlanadi va har safar suralmayd
     i - ✅ Sozlamalardan o'zgartirishga imkon bor

4. **GPS joylashuv aniqlash**

   - ✅ Joylashuvni GPS orqali yuborish
   - ✅ Avtomatik shahar aniqlash (reverse geocoding)
   - ✅ Default: Tashkent
   - ✅ Koordinatalar bilan ishlash

5. **Admin Panel Backend API**
   - ✅ REST API (Express.js)
   - ✅ JWT autentifikatsiya
   - ✅ Foydalanuvchilar boshqaruvi
   - ✅ Admin qo'shish va rollar
   - ✅ Kanal sozlamalari
   - ✅ Tabriklar tasdiqlash
   - ✅ Statistika

---

## 🚀 O'rnatish va Ishga Tushirish

### 1. Bot

```bash
cd d:/projects/ramazonbot
npm install
npm start
```

### 2. Admin API

```bash
cd d:/projects/ramazonbot/admin-api
npm install
npm start
```

Admin API port: **3000**

### 3. Admin Panel (React + Vite) 🆕

```bash
cd d:/projects/ramazonbot/admin-panel
npm install
npm run dev
```

Admin Panel: **http://localhost:5174**

---

## 🔧 Konfiguratsiya

### .env fayl (Bot)

```env
BOT_TOKEN=your_bot_token_here
ADMIN_ID=1234567890
CHANNEL_ID=@your_channel
CHANNEL_USER=your_channel
BOT_USER=your_bot_username
ADMIN_USER=your_admin_username
RAMADAN_DATE=2026-02-17
MONGODB_URI=mongodb://localhost:27017/ramazonbot
```

### .env fayl (Admin API)

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/ramazonbot
JWT_SECRET=your_secret_key_here
ADMIN_ID=1234567890
```

---

## 📡 Admin API Endpoints

### Autentifikatsiya

- `POST /api/auth/login` - Kirish
- `POST /api/auth/register` - Birinchi admin yaratish (superadmin)

### Foydalanuvchilar

- `GET /api/users` - Barcha foydalanuvchilar (pagination)
- `GET /api/users/search?query=` - Foydalanuvchilarni qidirish
- `GET /api/users/:userId` - Foydalanuvchi ma'lumotlari
- `PATCH /api/users/:userId/block` - Bloklash/blokdan chiqarish
- `PATCH /api/users/:userId/admin` - Admin huquqini berish

### Sozlamalar

- `GET /api/settings` - Barcha sozlamalar
- `GET /api/settings/:key` - Muayyan sozlama
- `PUT /api/settings/:key` - Sozlamani yangilash
- `POST /api/settings/required-channel` - Majburiy kanalini o'rnatish
- `POST /api/settings/greeting-channel` - Tabrik kanalini o'rnatish

### Tabriklar

- `GET /api/greetings` - Barcha tabriklar
- `PATCH /api/greetings/:id/approve` - Tabrikni tasdiqlash
- `PATCH /api/greetings/:id/reject` - Tabrikni rad etish
- `DELETE /api/greetings/:id` - Tabrikni o'chirish

### Statistika

- `GET /api/stats` - Dashboard statistikasi
- `GET /api/stats/growth` - Foydalanuvchilar o'sish grafigi (30 kun)

---

## 🗂 Fayl Strukturasi

```
ramazonbot/
├── bot.js                 # Asosiy bot fayli (yangilangan)
├── bot-old.js             # Eski versiya (backup)
├── bot.js.backup          # Backup
├── config/
│   └── translations.js    # Yangilangan tarjimalar
├── models/
│   ├── User.js            # Yangilangan (location, role)
│   ├── Settings.js        # Yangilangan (static methods)
│   ├── Greeting.js
│   └── Location.js
├── scenes/
│   ├── greeting.js
│   ├── suggestion.js
│   └── location.js        # Yangilangan (GPS)
├── utils/
│   ├── aladhan.js         # 🆕 Aladhan API
│   ├── channel.js         # 🆕 Majburiy kanal
│   ├── translator.js
│   ├── keyboards.js
│   ├── database.js        # Yangilangan
│   ├── location.js
│   └── helpers.js
├── modules/
│   └── db.js
├── admin-api/             # 🆕 Admin Panel Backend
│   ├── server.js
│   ├── models/
│   │   └── Admin.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── settings.js
│   │   ├── greetings.js
│   │   └── stats.js
│   ├── middleware/
│   │   └── auth.js
│   └── package.json
└── package.json
```

---

## 🔑 Asosiy Xususiyatlar

### Bot

- ✅ 3 til: O'zbekcha (Lotin), Ўзбекча (Кирилл), Русский
- ✅ Namoz vaqtlari (Aladhan API)
- ✅ GPS joylashuv aniqlash
- ✅ Ramazonga qancha qoldi (countdown)
- ✅ Tabrik yuborish (admin tasdiqlaydi)
- ✅ Taklif yuborish
- ✅ Majburiy kanal obunasi
- ✅ Admin panel

### Admin API

- ✅ JWT autentifikatsiya
- ✅ Foydalanuvchilar boshqaruvi
- ✅ Qidiruv va filterlash
- ✅ Bloklash/blokdan chiqarish
- ✅ Admin huquqlarini boshqarish
- ✅ Kanal sozlamalari
- ✅ Tabriklar tasdiqlash
- ✅ To'liq statistika
- ✅ O'sish grafiklari

---

## 📊 MongoDB Schema

### User Model

```javascript
{
  userId: Number,        // Telegram ID
  firstName: String,
  username: String,
  is_block: Boolean,
  language: String,      // uz, cr, ru (null agar tanlanmagan)
  location: {
    name: String,        // Shahar nomi
    latitude: Number,    // GPS koordinata
    longitude: Number,   // GPS koordinata
    timezone: String     // Vaqt zonasi
  },
  hasJoinedChannel: Boolean,
  isAdmin: Boolean,
  role: String,          // user, admin, superadmin
  lastActive: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Settings Model

```javascript
{
  key: String,           // Sozlama nomi
  value: Mixed,          // Qiymat (any type)
  description: String    // Tavsif
}
```

---

## 🛠 API dan Foydalanish

### 1. Birinchi admin yaratish

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "userId": 1234567890,
    "username": "admin",
    "password": "securepassword123",
    "firstName": "Admin"
  }'
```

### 2. Kirish va token olish

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "securepassword123"
  }'
```

### 3. Foydalanuvchilarni ko'rish

```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### 4. Majburiy kanalini o'rnatish

```bash
curl -X POST http://localhost:3000/api/settings/required-channel \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "channelId": "@your_channel",
    "channelUsername": "your_channel",
    "channelTitle": "Bizning Kanal"
  }'
```

---

## 🧪 Test Qilish

### Bot test qilish

1. `/start` - Til tanlash (birinchi marta)
2. `/start` - Asosiy menyu (ikkinchi marta - til so'ralmaydi)
3. 📅 Taqvim - Namoz vaqtlarini ko'rish
4. 📍 Joylashuv - GPS yuborish
5. 💌 Tabrik yuborish - Admin tasdiqlaydi
6. ℹ️ Bot haqida → ⚙️ Sozlamalar → 🌐 Tilni o'zgartirish

### Admin API test qilish

Postman yoki Insomnia ishlatilishi tavsiya etiladi.

---

## 🐛 Xatolarni Tuzatish

### Bot ishlamasa:

1. MongoDB ulanishini tekshiring
2. `.env` fayldagi ma'lumotlarni tekshiring
3. BOT_TOKEN to'g'riligini tekshiring
4. Internet ulanishini tekshiring

### Admin API ishlamasa:

1. Port 3000 band emasligini tekshiring
2. MongoDB ulanishini tekshiring
3. JWT_SECRET o'rnatilganligini tekshiring

---

## 📝 Keyingi Qadamlar

### React + Vite Admin Panel (7-bosqich)

Keyingi bosqichda:

- Frontend admin panel (React + Vite)
- Dashboard bilan grafiklar
- Foydalanuvchilar jadval
- Sozlamalar sahifasi
- Tabriklar tasdiqlash interfeysi

Yaratish uchun:

```bash
npm create vite@latest admin-panel -- --template react
cd admin-panel
npm install
npm install axios react-router-dom @tanstack/react-query
```

---

## 👨‍💻 Muallif

**SaidqodirxonUz**

- GitHub: [@SaidqodirxonUz](https://github.com/SaidqodirxonUz)
- Telegram: @SaidqodirxonUz

---

## 📄 Litsenziya

ISC License

---

## 🙏 Minnatdorchilik

- Aladhan API - https://aladhan.com/prayer-times-api
- Telegraf.js - https://telegraf.js.org
- MongoDB - https://mongodb.com
