# 🤖 BOT TOKEN CONFIGURATION

## ✅ CURRENT ACTIVE BOT

**Bot:** @RealCoderUzBot  
**Token:** `6209529595:AAHWWUbbKOKFoKUDpA6Q0HDz-qo6M3aW-CQ`  
**Status:** ✅ ACTIVE  
**Location:** `.env` file

---

## 📋 AVAILABLE BOTS

### 1. RamazonCalendarBot (BETA)

- **Token:** `5255026450:AAEQFvab-nCdFPfEZ1l6phoDwgYF24G5qJE`
- **Username:** @RamazonCalendarBot
- **Name:** RAMAZON TAQVIMI 2026🌙 | BETA
- **Status:** ❌ Inactive (available for use)

### 2. RealCoderUzBot (PRODUCTION)

- **Token:** `6209529595:AAHWWUbbKOKFoKUDpA6Q0HDz-qo6M3aW-CQ`
- **Username:** @RealCoderUzBot
- **Name:** RealCoderUzBot
- **Status:** ✅ ACTIVE (currently in use)

---

## 🔧 HOW TO SWITCH BOTS

### Option 1: Edit `.env` file

```bash
cd api
nano .env
```

Change this line:

```env
# RealCoderUzBot (current)
BOT_TOKEN=6209529595:AAHWWUbbKOKFoKUDpA6Q0HDz-qo6M3aW-CQ

# To switch to RamazonCalendarBot, use:
# BOT_TOKEN=5255026450:AAEQFvab-nCdFPfEZ1l6phoDwgYF24G5qJE
```

### Option 2: Environment Variable

```bash
export BOT_TOKEN="5255026450:AAEQFvab-nCdFPfEZ1l6phoDwgYF24G5qJE"
pm2 restart ramazon-bot
```

---

## 🔍 VERIFY CURRENT BOT

Run this command to check which bot is active:

```bash
cd api
node check-bot-token.js
```

Output will show:

- ✅ Which token is active
- 🤖 Bot information (ID, username, name)
- 📊 Status of both available tokens

---

## 🌐 ADMIN PANEL API CONFIGURATION

### Current Setup:

```javascript
// admin-panel/src/api.js
export const API_URL =
  import.meta.env.VITE_API_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:3000/api/admin"
    : "https://ramazonbot-api.saidqodirxon.uz/api/admin");
```

### How It Works:

1. **Production:** Uses `https://ramazonbot-api.saidqodirxon.uz/api/admin`
2. **Local Dev:** Uses `http://localhost:3000/api/admin`
3. **Custom:** Can override with `VITE_API_URL` environment variable

### Testing Admin Panel Connection:

```bash
# Start API server
cd api
pm2 start ecosystem.config.js

# Start admin panel
cd admin-panel
npm run dev

# Check if login works
# Open: http://localhost:5173
# Login with admin credentials
```

---

## 🔐 AUTHENTICATION

### Admin Panel Authentication Flow:

1. User enters username/password
2. API validates credentials (`POST /api/admin/auth/login`)
3. Returns JWT token
4. Token stored in `localStorage.getItem("token")`
5. All subsequent requests include token in header:
   ```javascript
   Authorization: Bearer <token>
   ```

### Token Expiration:

- 401 response → Automatic logout
- Redirect to `/login`
- User must re-authenticate

---

## 📊 CURRENT STATUS

### Bot Status:

- ✅ **Active Bot:** @RealCoderUzBot (6209529595)
- ✅ **Webhook:** Configured
- ✅ **Database:** Connected
- ✅ **PM2:** Running

### Admin Panel Status:

- ✅ **API URL:** Auto-detected (local/production)
- ✅ **Authentication:** JWT-based
- ✅ **Token Storage:** localStorage
- ✅ **Auto-redirect:** On 401 errors

### Broadcast Settings:

- ✅ **Messages:** 3 languages (uz/ru/cr)
- ✅ **Buttons:** Dynamic (show/hide via admin)
- ✅ **Rate Limit:** 25 msg/sec
- ✅ **Target Users:** Users without location

---

## 🚀 DEPLOYMENT COMMANDS

### Start Bot with Current Token:

```bash
cd api
pm2 start ecosystem.config.js
pm2 logs ramazon-bot
```

### Restart After Token Change:

```bash
cd api
nano .env  # Change BOT_TOKEN
pm2 restart ramazon-bot
pm2 logs ramazon-bot  # Verify new token
```

### Check Token Status:

```bash
cd api
node check-bot-token.js
```

---

## ⚠️ IMPORTANT NOTES

1. **Token Security:**
   - Never commit `.env` to git
   - Keep tokens private
   - Rotate tokens if exposed

2. **Bot Selection:**
   - Use **RamazonCalendarBot** for testing
   - Use **RealCoderUzBot** for production

3. **Admin Panel:**
   - API URL auto-detects environment
   - No manual configuration needed
   - Works on localhost and production

4. **Database:**
   - Both bots use same MongoDB
   - Switching bots doesn't affect data
   - User data remains consistent

---

**Last Updated:** January 27, 2026  
**Status:** ✅ All systems operational
