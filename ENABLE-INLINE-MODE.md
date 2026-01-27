# Inline Mode Yoqish - BotFather Sozlamalari

## ✅ Bajarilgan Ishlar

Inline mode backend qismida to'liq yozilgan va `bot.js` ga ulangan:

1. ✅ `utils/inlineMode.js` - Inline query handler yozilgan
2. ✅ `bot.js` - `bot.on("inline_query", handleInlineQuery)` qo'shilgan
3. ✅ Bugun/Ertaga namoz vaqtlari
4. ✅ Ramazon hisobi (necha kun qoldi)
5. ✅ Redis cache (tez ishlash uchun)

## 🔧 BotFather Sozlamalari (SHART!)

Inline mode ishlay olishi uchun BotFather da sozlash kerak:

### 1. BotFather ga o'ting

Telegram da `@BotFather` ni oching

### 2. Inline Mode ni yoqish

```
/mybots
→ @YourBotName (masalan @RamazonCalendarBot)
→ Bot Settings
→ Inline Mode
→ Turn on
```

### 3. Inline Placeholder ni sozlash (ixtiyoriy)

```
/mybots
→ @YourBotName
→ Bot Settings
→ Inline Mode
→ Edit inline placeholder

Yozing:
Bugun, ertaga, ramazon
```

Bu text ilinadi qidiruv maydonida ko'rsatiladi.

### 4. Inline Feedback ni yoqish (ixtiyoriy, statistika uchun)

```
/mybots
→ @YourBotName
→ Bot Settings
→ Inline Mode
→ Inline feedback
→ 100%
```

## 🚀 Inline Mode Ishlatish

Sozlamalardan keyin userlar inline mode ishlata oladi:

### Ishlash tartibi:

1. **Istalgan chatda** (guruh yoki shaxsiy) yozadi:
   ```
   @RamazonCalendarBot bugun
   ```

2. **3 variant paydo bo'ladi:**
   - 📅 Bugungi namoz vaqtlari
   - 📅 Ertangi namoz vaqtlari
   - 🌙 Ramazonga necha kun qoldi

3. **Bitta variantni tanlaydi** - chat ga chiroyli formatda yuboriladi

### Query variantlari:

| Query | Natija |
|-------|---------|
| `@bot` yoki `@bot bugun` | Barcha 3 variant |
| `@bot today` | Bugungi namoz vaqtlari |
| `@bot ertaga` | Ertangi namoz vaqtlari |
| `@bot tomorrow` | Ertangi namoz vaqtlari |
| `@bot ramazon` | Ramazon hisobi |
| `@bot ramadan` | Ramazon hisobi |

## 📊 Inline Mode Xususiyatlari

### 1. Bugungi Namoz Vaqtlari

```
🕌 Bugungi namoz vaqtlari
📅 28.01.2026
📍 Toshkent

🌅 Bomdod: 06:15
☀️ Quyosh chiqishi: 07:42
🌞 Peshin: 12:48
🌤 Asr: 15:18
🌆 Shom: 17:43
🌙 Xufton: 19:05

@RamazonCalendarBot
```

### 2. Ertangi Namoz Vaqtlari

```
🕌 Ertangi namoz vaqtlari
📅 29.01.2026
📍 Toshkent

🌅 Bomdod: 06:14
☀️ Quyosh chiqishi: 07:41
🌞 Peshin: 12:49
🌤 Asr: 15:19
🌆 Shom: 17:44
🌙 Xufton: 19:06

@RamazonCalendarBot
```

### 3. Ramazon Hisobi

```
🌙 Ramazon oyiga qoldi

📅 Boshlanish sanasi: 28.02.2026
⏳ Qolgan kunlar: 31 kun

"Ramazon oyi, unda Qur'on nozil qilingan oy..."
(Baqara surasi, 185-oyat)

@RamazonCalendarBot
```

## 🎯 Foydalanish Holatlari

### User botni ro'yxatdan o'tmagan

Agar user botga `/start` bosmagan yoki location tanlamagan bo'lsa:

```
⚠️ Botga ro'yxatdan o'tish kerak

📍 Namoz vaqtlarini ko'rish uchun avval 
@RamazonCalendarBot ga o'ting va 
joylashuvingizni tanlang.
```

### Redis Cache

- Bugungi vaqtlar: **1 soat** cache
- Ertangi vaqtlar: **12 soat** cache  
- Ramazon hisobi: **12 soat** cache
- Xato: **10 soniya** cache

Bu tezlik uchun va API chaqiruvlarni kamaytirish uchun.

## ✅ Tekshirish

BotFather sozlamalaridan keyin:

### 1. Telegram da sinab ko'ring

Istalgan chatda yozing:
```
@RamazonCalendarBot
```

Agar inline query paydo bo'lmasa:
- ❌ BotFather da inline mode yoqilmagan
- ✅ Qaytadan BotFather sozlamalarini tekshiring

### 2. Bot logs tekshiring

```bash
pm2 logs ramazonbot-api-9999 | grep "inline"
```

Inline query kelganida shu log chiqadi:
```
Inline query from user: 123456789
Inline query: "bugun"
```

### 3. Redis cache tekshiring

```bash
redis-cli
> KEYS inline:*
# Natija:
# 1) "inline:today:123456789"
# 2) "inline:tomorrow:123456789"
# 3) "inline:ramadan:countdown"

> GET inline:today:123456789
# User uchun bugungi namoz vaqtlari cache
```

## 🚀 Deploy

Inline mode yoqish uchun code deploy qiling:

```bash
cd /root/ramazonbot
git pull
pm2 restart ramazonbot-api-9999
pm2 logs ramazonbot-api-9999 --lines 50
```

## 📈 Statistika

Inline mode qancha ishlatilganini kuzatish:

```bash
# Bot logs
pm2 logs ramazonbot-api-9999 | grep "inline" | wc -l

# Redis cache keys
redis-cli KEYS "inline:*" | wc -l
```

## 🎨 Customization

Agar inline natijalarni o'zgartirmoqchi bo'lsangiz:

`api/utils/inlineMode.js` faylini tahrirlang:
- `getTodayPrayerTimes()` - Bugun uchun
- `getTomorrowPrayerTimes()` - Ertaga uchun
- `getRamadanCountdown()` - Ramazon uchun

Har bir funksiya `InlineQueryResult` object qaytaradi.

## 🔒 Xavfsizlik

- User ro'yxatdan o'tmagan bo'lsa inline ishlamaydi
- User location tanlamagan bo'lsa xabar beradi
- Xato yuz bersa graceful error message
- Cache bilan API chaqiruvlar kamayadi

## 📞 Muammo Bo'lsa

### Inline query ishlamayapti

1. ✅ BotFather da inline mode yoqilganini tekshiring
2. ✅ Bot qayta ishga tushganini tekshiring: `pm2 restart ramazonbot-api-9999`
3. ✅ Logs tekshiring: `pm2 logs ramazonbot-api-9999`
4. ✅ User botga `/start` bosganini va location tanlaganini tekshiring

### Inline natijalar ko'rinmayapti

1. ✅ Redis ishlayotganini tekshiring: `redis-cli PING` → `PONG`
2. ✅ MongoDB connection: Bot logs da `MongoDB connected` borligini tekshiring
3. ✅ User data: `db.users.findOne({ userId: 123456789 })` - location borligini tekshiring

### Xato xabarlari

Agar inline query xato bersa, bot graceful error message ko'rsatadi:
```
❌ Xatolik yuz berdi
Ma'lumotlarni yuklashda muammo
```

Logs tekshiring:
```bash
pm2 logs ramazonbot-api-9999 --err
```

---

**ESLATMA:** Inline mode BotFather da yoqilgandan keyin darhol ishlaydi. Deploy qilish kifoya!
