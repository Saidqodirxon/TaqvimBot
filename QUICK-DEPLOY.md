# ⚡ Quick Deployment Commands

## 🚀 Full Deployment (Copy & Paste)

```bash
# 1. Backup
cd /root/ramazonbot/api
node backup-mongodb.js

# 2. Pull changes
cd /root/ramazonbot
git pull

# 3. Set location update flag for all users
cd api
node scripts/maintenance/set-location-update-flag.js

# 4. Rebuild admin panel
cd ../admin-panel
npm run build

# 5. Restart services
pm2 restart ramazonbot-api-9999
pm2 restart ramazonbot-admin
pm2 logs ramazonbot-api-9999 --lines 50
```

## 📝 Manual Integration (bot.js)

**Add to** `api/bot.js`:

```javascript
// Add import at top
const updateUserInfo = require("./middleware/updateUserInfo");

// Add middleware after bot initialization and session
bot.use(updateUserInfo);
```

**Location**: After these lines in bot.js:
```javascript
const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());
// ADD HERE ↓
bot.use(updateUserInfo);
```

## ✅ Verification Commands

```bash
# Check if location flags are set
mongo ramazonbot --eval "db.users.countDocuments({ needsLocationUpdate: true })"
# Should show: 64605

# Check middleware is working (watch logs while users interact)
pm2 logs ramazonbot-api-9999 | grep "Updated auto-generated firstName"

# Check admin panel works
curl http://localhost:5173/  # or your admin URL

# Check Redis page loads
# Open browser: http://your-admin-url/redis
```

## 🔍 Quick Tests

### Test 1: Statistics
- Open admin panel
- Go to Dashboard
- Verify "Nofaol (Botni to'xtatgan)" card shows

### Test 2: Redis Page
- Sidebar → Redis
- Toggle Redis on/off
- Verify settings save

### Test 3: Location Edit
- Joylashuvlar → Select location
- Oylik Namoz Vaqtlari
- Verify location card appears
- Click "✏️ Tahrirlash"

### Test 4: Terms Delay
- Settings → Terms section
- Verify "⏰ Dastlabki kechiktirish" field exists

## 🆘 Rollback (If Needed)

```bash
cd /root/ramazonbot
git log --oneline -5  # Find commit hash
git reset --hard <previous-commit-hash>
git push --force

# Reset database flags
mongo ramazonbot --eval "db.users.updateMany({}, { \$set: { needsLocationUpdate: false, isActive: true } })"

# Rebuild admin
cd admin-panel
npm run build

# Restart
pm2 restart all
```

## 📊 Expected Numbers

After deployment:
- `needsLocationUpdate: true` → **64,605 users**
- `isActive: true` → **~64,000 users** (minus blocked)
- `isActive: false` → **~500-1000 users** (will grow over time)
- Generated usernames (User\d+) → **Will decrease over time**

## 🎯 Success Indicators

✅ Admin panel loads without errors
✅ Dashboard shows "Nofaol" card
✅ Redis page accessible at /redis
✅ Location edit form works in prayer times
✅ Terms settings has initial delay field
✅ No "Recovery" link in sidebar
✅ No errors in `pm2 logs`
✅ Users see location selection prompt

---

**Deployment Time**: ~5 minutes  
**Manual Steps**: 1 (add middleware to bot.js)  
**User Impact**: Location re-selection required  
**Downtime**: None (zero-downtime deployment)
