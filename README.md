# 🕌 RAMAZON BOT - PROJECT STRUCTURE

## 📁 Root Directory

```
ramazonbot/
├── api/                    # Backend API va Bot
├── admin-panel/            # React admin panel
├── mini-app/              # Telegram mini app
├── .gitignore
├── ADMIN-PANEL-AUDIT.md   # Admin panel audit report
├── BOT-TOKEN-CONFIG.md    # Bot token konfiguratsiya
└── README.md
```

---

## 📂 api/ - Backend Structure

### Main Files:

- `bot.js` - **ASOSIY** Bot + Express API server
- `ecosystem.config.js` - PM2 process manager config
- `package.json` - Node.js dependencies
- `.env` - Environment variables (SECRET!)
- `.gitignore` - Git ignore rules

### Folders:

```
api/
├── config/              # Konfiguratsiya (translations.js)
├── middleware/          # Auth middleware
├── models/              # MongoDB models
├── modules/             # Core modules (db, functions, messageQueue)
├── routes/              # API endpoints
│   └── admin/          # Admin panel API routes
├── scenes/              # Telegraf scenes
├── scripts/             # Yordamchi skriptlar
│   ├── broadcast/      # Broadcast skriptlar
│   ├── cache/          # Cache skriptlar
│   ├── import/         # Import skriptlar
│   ├── test/           # Test skriptlar
│   ├── maintenance/    # Maintenance skriptlar
│   └── old/            # Eski fayllar (arxiv)
├── utils/               # Utility funksiyalar
└── data/                # Ma'lumotlar (JSON)
```

---

## 🎯 KEY FILES

### Backend (api/)

| File                  | Purpose               | Status    |
| --------------------- | --------------------- | --------- |
| `bot.js`              | Main bot + API server | ✅ Active |
| `ecosystem.config.js` | PM2 config            | ✅ Active |
| `.env`                | Environment variables | ✅ Active |

### Scripts (api/scripts/)

| Script      | Location       | Purpose                | Usage        |
| ----------- | -------------- | ---------------------- | ------------ |
| Broadcast   | `broadcast/`   | Professional broadcast | Production   |
| Cache       | `cache/`       | 60-day prayer cache    | Production   |
| Import      | `import/`      | User/data import       | As needed    |
| Test        | `test/`        | Testing tools          | Development  |
| Maintenance | `maintenance/` | DB maintenance         | Regular      |
| Old         | `old/`         | Archived files         | Archive only |

---

## 📋 SCRIPTS QUICK REFERENCE

### Production Scripts:

```bash
# Broadcast (professional)
node api/scripts/broadcast/broadcast-location-professional.js

# Cache refresh (60 days, 232 cities)
node api/scripts/cache/ultimate-pre-cache.js

# Check bot token
node api/scripts/test/check-bot-token.js

# Backup MongoDB
node api/scripts/maintenance/backup-mongodb.js

# Seed settings
node api/scripts/maintenance/seed-broadcast-settings.js
node api/scripts/maintenance/seed-translations.js
```

### Development Scripts:

```bash
# Test broadcast to admin
node api/scripts/broadcast/test-broadcast-professional.js

# Check cache status
node api/scripts/cache/check-cache-status.js

# Import users from JSON
node api/scripts/import/import-users-from-json.js

# Test Aladhan API
node api/scripts/test/test-aladhan.js
```

---

## 🚀 DEPLOYMENT

### Start Bot:

```bash
cd api
pm2 start ecosystem.config.js
pm2 logs ramazon-bot
```

### Start Admin Panel (Development):

```bash
cd admin-panel
npm run dev
```

### Start Admin Panel (Production):

```bash
cd admin-panel
npm run build
# Deploy dist/ to hosting
```

---

## 🗄️ DATABASE

**Type:** MongoDB  
**Collections:**

- `users` - 64,645 users
- `prayertimedata` - 15,890 prayer entries (60 days)
- `locations` - 232 cities
- `greetings` - User greetings
- `settings` - Bot settings
- `admins` - Admin users
- `suggestions` - User suggestions
- `translations` - Multi-language text

---

## 🔐 ENVIRONMENT VARIABLES

Key variables in `api/.env`:

```env
BOT_TOKEN=<telegram_bot_token>
MONGODB_URI=<mongodb_connection_string>
PORT=3000
ADMIN_ID=<admin_user_id>
```

---

## 📦 DEPENDENCIES

### Backend (api/package.json):

- `telegraf` - Telegram bot framework
- `express` - Web server
- `mongoose` - MongoDB ODM
- `axios` - HTTP client
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT auth
- `moment-timezone` - Date/time
- `node-cron` - Task scheduler

### Admin Panel (admin-panel/package.json):

- `react` - UI framework
- `react-router-dom` - Routing
- `@tanstack/react-query` - Data fetching
- `axios` - HTTP client
- `lucide-react` - Icons
- `vite` - Build tool

---

## 🌐 API ENDPOINTS

**Base URL:** `http://localhost:3000/api` (local)  
**Production:** `https://ramazonbot-api.saidqodirxon.uz/api`

### Main Routes:

- `/auth` - Authentication
- `/users` - User management
- `/greetings` - Greeting management
- `/settings` - Bot settings
- `/stats` - Statistics
- `/broadcast` - Broadcast system
- `/locations` - Location management
- `/prayers` - Prayer management
- `/admins` - Admin management
- `/bot-info` - Bot information

---

## 📱 BOT FEATURES

### User Commands:

- `/start` - Main menu
- `/help` - Help information
- `/language` - Change language
- `/settings` - User settings

### Inline Features:

- 📅 Calendar (Daily/Weekly)
- 🕌 Prayer times
- 🧭 Qibla direction
- 💌 Send greeting
- 📍 Location selection
- 🔔 Reminder settings
- 💡 Send suggestion

---

## 🎨 ADMIN PANEL PAGES

- `/` - Dashboard (statistics)
- `/users` - User management
- `/greetings` - Greeting approval
- `/broadcast` - General broadcast
- `/broadcast-location` - Location broadcast ⭐
- `/locations` - City management
- `/prayers` - Prayer management
- `/settings` - Bot settings
- `/admins` - Admin management
- `/suggestions` - User suggestions

---

## ⚙️ CONFIGURATION

### Bot Token:

Currently using: **@RealCoderUzBot** (Production)
Alternative: **@RamazonCalendarBot** (Testing)

See `BOT-TOKEN-CONFIG.md` for details.

### Admin Panel API:

Auto-detects environment:

- **Local:** `http://localhost:3000/api`
- **Production:** `https://ramazonbot-api.saidqodirxon.uz/api`

---

## 📝 DOCUMENTATION

- `ADMIN-PANEL-AUDIT.md` - Full audit report
- `BOT-TOKEN-CONFIG.md` - Token configuration
- `api/scripts/README.md` - Scripts documentation
- `README.md` - This file

---

## 🛠️ MAINTENANCE

### Regular Tasks:

1. **Daily:** Monitor logs (`pm2 logs`)
2. **Weekly:** Check cache status
3. **Monthly:** Database backup
4. **As needed:** Update translations, settings

### Quick Commands:

```bash
# Check bot status
pm2 status

# Restart bot
pm2 restart ramazon-bot

# View logs
pm2 logs ramazon-bot

# Check which bot is active
node api/scripts/test/check-bot-token.js

# Refresh cache
node api/scripts/cache/ultimate-pre-cache.js
```

---

## ✅ PROJECT STATUS

**Status:** ✅ Production Ready  
**Bot:** @RealCoderUzBot  
**Users:** 64,645  
**Cities:** 232  
**Prayer Data:** 60 days cached

**Last Updated:** 2026-01-27  
**Version:** 1.0.0

---

## 🤝 SUPPORT

For issues or questions, contact the development team.

**Developer:** Saidqodirxon  
**Project:** Ramazon Bot 2026
