# Location Reset - Ishga Tushirish Bo'yicha Qo'llanma

## ❗ MUHIM OGOHLANTIRISH

Bu script **BARCHA** foydalanuvchilar (64,648 ta) uchun locationni `null` qiladi va ularni qaytadan location tanlashga majbur qiladi.

## 📋 Nima qiladi?

1. Barcha userlarning `location`, `locationId`, `locationRequestedAt` fieldlarini `null` qiladi
2. `needsLocationUpdate: true` qo'yadi
3. Foydalanuvchilar keyingi botga kirishda location tanlash so'raladi
4. Bu "undefined" muammosini hal qiladi (default Tashkent location xato bo'lgan holatlarda)

## 🚀 Ishga Tushirish

### Production Serverda

```bash
# 1. Serverga ulaning
ssh root@your-server

# 2. Bot papkasiga o'ting
cd /root/ramazonbot/api

# 3. Scriptni ishga tushiring
node scripts/maintenance/reset-all-locations-to-null.js
```

### Kutilayotgan Output

```
======================================================================
🔄 RESET ALL USER LOCATIONS TO NULL
======================================================================

✅ MongoDB connected

📊 Total users in database: 64648

🔄 Resetting all user locations...
✅ Successfully reset 64648 users' locations

📊 VERIFICATION:
   - Users with location: 0 (should be 0) ✅
   - Users needing location update: 64648 (should be 64648) ✅

✅ Location reset completed successfully!
⚠️  All users will be asked to select location on next interaction

MongoDB connection closed
```

## ✅ Tekshirish

Script ishlagandan keyin:

```bash
# MongoDB ga ulaning
mongo ramazonbot

# Barcha userlar location=null ekanligini tekshiring
db.users.countDocuments({ location: null })
# Result: 64648

# needsLocationUpdate=true ekanligini tekshiring
db.users.countDocuments({ needsLocationUpdate: true })
# Result: 64648

# Bitta user ma'lumotlarini ko'ring
db.users.findOne({}, { location: 1, locationId: 1, needsLocationUpdate: 1 })
# Result:
# {
#   "_id": ObjectId("..."),
#   "location": null,
#   "locationId": null,
#   "needsLocationUpdate": true
# }
```

## 📊 Botda Ko'rinishi

Scriptdan keyin userlar botga kirganlarida:

1. ❌ Main menu ko'rinmaydi
2. 📍 "Joylashuvingizni tanlang" xabari chiqadi
3. 🗺 Location yuborish tugmasi paydo bo'ladi
4. ✅ User location tanlagandan keyin normal ishlaydi

## 🔄 Orqaga Qaytish (Rollback)

Agar xatolik yuz bersa va eski holatga qaytish kerak bo'lsa:

```bash
# MongoDB backup dan restore qiling
mongorestore --uri="mongodb://..." --archive=backup.archive

# YoKI agar backup yo'q bo'lsa, default location qo'ying:
mongo ramazonbot
db.users.updateMany(
  {},
  {
    $set: {
      location: {
        latitude: 41.2995,
        longitude: 69.2401,
        name: "Toshkent",
        timezone: "Asia/Tashkent"
      },
      locationId: "default-tashkent",
      needsLocationUpdate: false
    }
  }
)
```

## 📈 Monitoring

Script ishlagandan keyin bir necha kun davomida monitoring qiling:

```bash
# Nechta user location tanladi?
mongo ramazonbot
db.users.countDocuments({ locationId: { $ne: null } })

# Nechta user hali tanlmagan?
db.users.countDocuments({ needsLocationUpdate: true })

# Bot logs
pm2 logs ramazonbot-api-9999 | grep "location"
```

## ⚠️ Ehtiyot Choralari

1. **Backup oling!** Script ishlatishdan oldin:
   ```bash
   cd /root/ramazonbot/api
   node backup-mongodb.js
   ```

2. **Test muhitda sinab ko'ring** (agar bor bo'lsa)

3. **Foydalanuvchilarni ogohlantiring** - Telegram kanalda elon qiling:
   ```
   📢 Diqqat!
   
   Botda texnik ishlar olib borildi. 
   Iltimos, joylashuvingizni qaytadan tanlang.
   
   /start - Boshlash
   ```

4. **Kunning sokin vaqtida ishlating** - Kechqurun yoki tushdan keyin

5. **PM2 logs ni kuzating**:
   ```bash
   pm2 logs ramazonbot-api-9999 --lines 100
   ```

## 🎯 Maqsad

Bu script default/xato location tanlanganlarni tozalaydi va userlardan **to'g'ri** location so'raydi. Natijada:

- ✅ "undefined" xatolari yo'qoladi
- ✅ Namoz vaqtlari to'g'ri ko'rsatiladi  
- ✅ Qibla yo'nalishi aniq bo'ladi
- ✅ Eslatmalar o'z vaqtida keladi

## 📞 Muammo Bo'lsa

Agar script xatolik bersa:

1. Output ni to'liq nusxa oling
2. MongoDB logs tekshiring: `tail -f /var/log/mongodb/mongod.log`
3. Bot logs tekshiring: `pm2 logs ramazonbot-api-9999`
4. Kerak bo'lsa backup dan restore qiling

---

**DIQQAT:** Script faqat 1 marta ishlatilsin! Qayta ishlatsangiz ham zarar yo'q, lekin userlar yana location tanlashga majbur bo'ladi.
