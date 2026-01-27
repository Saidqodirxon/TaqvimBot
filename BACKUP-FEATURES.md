# Backup System Features

## ✅ Implemented Features

### 1. **Backup Telegram Guruhga Yuborish**

- Admin panelda har bir backup uchun **Send** tugmasi qo'shildi
- Backup faylini log kanalga yuborish API endpoint: `POST /api/backups/send/:filename`
- Fayl hajmi 50 MB dan kichik bo'lishi kerak (Telegram bot cheklovi)
- Xavfsizlik: Faqat superadmin yuborishi mumkin

### 2. **Avtomatik Backup Scheduler**

- **Cron-based** avtomatik backup tizimi
- Database dan sozlamalar o'qiydi (enabled, cronTime, keepDays)
- Default: Har kuni 03:00 da avtomatik backup
- Eski backuplar avtomatik o'chiriladi (default: 7 kun)
- PM2 ecosystem config ga qo'shildi: `ramazonbot-backup-scheduler`

### 3. **Admin Panel Interface**

- **Send** tugmasi (🔵 ko'k rang) qo'shildi
- Download tugmasi (🟢 yashil rang)
- Delete tugmasi (🔴 qizil rang)
- Har bir tugma individual tooltips bilan
- Loading state ko'rsatadi

### 4. **Log Group Integration**

- Backup yaratilganda avtomatik log kanalga yuboriladi
- Manual send ham qo'shildi (tugma orqali)
- Message format:
  ```
  🔐 MongoDB Backup
  📊 Database: ramazonbot
  📅 Sana: DD.MM.YYYY HH:mm:ss
  📦 Original size: XX MB
  🗜️ Compressed: YY MB
  📁 Fayl: backup-YYYY-MM-DD-HH-mm-ss.tar.gz
  ✅ Backup muvaffaqiyatli yaratildi!
  ```

## 📁 New/Updated Files

### API Files

1. **`routes/admin/backups.js`**
   - ➕ Added `POST /send/:filename` endpoint
   - ✏️ Updated import path for backup script

2. **`scripts/maintenance/backup-mongodb.js`**
   - ✏️ Fixed logger path: `../../utils/logger`
   - ✏️ Fixed Settings model path: `../../models/Settings`

3. **`scripts/maintenance/backup-scheduler.js`** (NEW)
   - Cron-based scheduler
   - Database-driven configuration
   - Graceful shutdown handling
   - Next run time calculator
   - Timezone-aware (Asia/Tashkent)

4. **`scripts/test/test-backup.js`** (NEW)
   - Test script for backup functionality
   - Usage: `node scripts/test/test-backup.js`

5. **`ecosystem.config.js`**
   - ➕ Added `ramazonbot-backup-scheduler` app
   - Runs on PM2 with auto-restart
   - Logs: `./logs/backup-scheduler-{error,out}.log`

### Admin Panel Files

1. **`admin-panel/src/pages/Backups.jsx`**
   - ➕ Imported `Send` icon from lucide-react
   - ➕ Added `sendBackupMutation` with API call
   - ➕ Added `handleSendToGroup()` function
   - ➕ Added Send button in backup actions

2. **`admin-panel/src/pages/Backups.css`**
   - ➕ Added `.btn-icon.send` styles (blue theme)
   - Hover effects

## 🚀 Usage

### Admin Panel

1. Backups sahifasiga kiring
2. Har bir backup card da 3 ta tugma:
   - **Download** (🟢) - Faylni yuklab olish
   - **Send** (🔵) - Telegram guruhga yuborish
   - **Delete** (🔴) - Backupni o'chirish

### Manual Backup Creation

```bash
# Admin panel orqali "Yangi Backup" tugmasini bosing
# yoki terminal orqali:
node scripts/maintenance/backup-mongodb.js
```

### Scheduled Backups

```bash
# PM2 orqali ishga tushirish:
pm2 start ecosystem.config.js --only ramazonbot-backup-scheduler

# Status ko'rish:
pm2 status ramazonbot-backup-scheduler

# Logs ko'rish:
pm2 logs ramazonbot-backup-scheduler
```

### Schedule Settings (Admin Panel)

1. Backups sahifasida "Schedule" tugmasini bosing
2. Sozlamalar:
   - **Avtomatik backup yoqilgan** - checkbox
   - **Cron Time** - vaqt formati: `minute hour day month weekday`
     - Misol: `0 3 * * *` = Har kuni 03:00 da
     - Misol: `0 */6 * * *` = Har 6 soatda bir marta
   - **Saqlash muddati** - necha kun saqlanadi (1-90)

## 📊 API Endpoints

### Send Backup to Telegram

```http
POST /api/backups/send/:filename
Authorization: Bearer <token>
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Backup muvaffaqiyatli log kanalga yuborildi"
}
```

**Errors:**

- 403: Faqat superadmin yuborishi mumkin
- 404: Backup fayli topilmadi
- 400: Fayl hajmi > 50 MB
- 400: Log kanal sozlanmagan

## ⚙️ Environment Variables

```bash
# Bot token (backup yuborish uchun)
BOT_TOKEN=your_bot_token

# MongoDB connection
MONGODB_URI=mongodb://...

# JWT secret (admin auth)
JWT_SECRET=your_secret
```

## 📦 Dependencies

```json
{
  "node-cron": "^4.2.1", // Existing
  "cron-parser": "^4.9.0", // New - for parsing cron expressions
  "telegraf": "^4.x", // Existing
  "moment-timezone": "^0.x" // Existing
}
```

## 🔧 PM2 Ecosystem

```javascript
{
  name: "ramazonbot-backup-scheduler",
  script: "./scripts/maintenance/backup-scheduler.js",
  instances: 1,
  max_memory_restart: "200M",
}
```

## ✅ Checklist

- [x] Send backup to Telegram API endpoint
- [x] Admin panel Send button (UI + mutation)
- [x] Backup scheduler with cron
- [x] PM2 ecosystem configuration
- [x] Test script
- [x] Error handling
- [x] Security checks (superadmin only)
- [x] File size validation (50 MB limit)
- [x] Log channel configuration check
- [x] Documentation

## 🎯 Next Steps

1. **Production Deploy:**

   ```bash
   cd /root/ramazonbot
   git pull
   cd api
   npm install
   pm2 restart ecosystem.config.js
   pm2 save
   ```

2. **Verify Scheduler:**

   ```bash
   pm2 logs ramazonbot-backup-scheduler
   ```

3. **Test Send:**
   - Admin panelda Backups sahifasiga kiring
   - Send tugmasini bosing
   - Telegram log kanalda faylni tekshiring

## 📝 Notes

- Backup fayllari: `api/backups/` papkada
- Format: `backup-YYYY-MM-DD-HH-mm-ss.tar.gz`
- Eski backuplar avtomatik o'chiriladi
- Log kanal Settings sahifasida sozlanadi
- Scheduler database dan sozlamalarni o'qiydi
- Server qayta ishga tushganda schedule qayta yuklanadi
