# 🆘 Server Troubleshooting Guide

## Bot localda ishlaydi lekin serverda ishlamaydi?

### Tezkor diagnostika

Serverda ushbu komandani ishga tushiring:

```bash
cd /root/ramazonbot
bash server-debug.sh
```

### Eng ko'p uchraydigan muammolar

#### 1. MongoDB connection error

**Alomat:**

```
Error: connect ECONNREFUSED
MongoServerError: Authentication failed
```

**Yechim:**

```bash
# .env faylni tekshiring
cat /root/ramazonbot/api/.env | grep MONGODB_URI

# To'g'ri formatda bo'lishi kerak:
# mongodb://username:password@host:port/database
# yoki
# mongodb+srv://username:password@cluster.mongodb.net/database
```

#### 2. BOT_TOKEN xato

**Alomat:**

```
Error: 401 Unauthorized
Invalid token
```

**Yechim:**

```bash
# BotFather'dan yangi token oling va .env'ga qo'shing
nano /root/ramazonbot/api/.env

# BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

#### 3. Port band

**Alomat:**

```
Error: listen EADDRINUSE: address already in use :::9999
```

**Yechim:**

```bash
# 9999 portni ishlatayotgan processni toping va to'xtating
lsof -ti:9999 | xargs kill -9

# Yoki boshqa portdan foydalaning
# .env faylda: PORT=9998
```

#### 4. Dependency issues

**Alomat:**

```
Error: Cannot find module 'telegraf'
Error: Cannot find module 'mongoose'
```

**Yechim:**

```bash
cd /root/ramazonbot/api
rm -rf node_modules package-lock.json
npm install
pm2 restart all
```

#### 5. Permission errors

**Alomat:**

```
EACCES: permission denied
```

**Yechim:**

```bash
# Ownershipni to'g'irlash
chown -R root:root /root/ramazonbot

# Executable qilish
chmod +x /root/ramazonbot/api/bot.js
chmod +x /root/ramazonbot/*.sh
```

### Avtomatik fix (xavfli - faqat to'liq ishlamasa)

```bash
cd /root/ramazonbot
bash server-fix.sh
```

⚠️ **DIQQAT:** Bu script barcha PM2 processlarni o'chiradi va qayta boshlaydi!

### Qo'lda fix (tavsiya etiladi)

```bash
# 1. To'xtatish
pm2 stop all

# 2. Yangi kodlarni olish
cd /root/ramazonbot
git pull

# 3. Dependencies yangilash
cd api
npm install

# 4. .env tekshirish
cat .env

# 5. Ishga tushirish
pm2 restart all

# 6. Loglarni kuzatish
pm2 logs
```

### Loglarni tekshirish

```bash
# Real-time logs
pm2 logs

# Oxirgi 100 qator
pm2 logs --lines 100

# Faqat errors
pm2 logs --err

# Specific process
pm2 logs ramazonbot-api
```

### PM2 commands

```bash
# Status
pm2 status

# List all processes
pm2 list

# Restart
pm2 restart all

# Stop
pm2 stop all

# Delete all
pm2 delete all

# Save config
pm2 save

# Startup on boot
pm2 startup
```

### MongoDB tekshirish

```bash
# Connection test
mongosh "YOUR_MONGODB_URI"

# Check database
use ramazonbot
db.users.countDocuments()
db.settings.find()
```

### Network issues

```bash
# Check if API is accessible
curl http://localhost:9999/health

# Check from outside
curl http://YOUR_SERVER_IP:9999/health

# If timeout, check firewall
ufw status
ufw allow 9999
```

### Memory issues

```bash
# Check memory
free -h

# If low memory, increase swap
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# Add to /etc/fstab for persistence
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Environment variables missing

```bash
# Create .env from template
cd /root/ramazonbot/api
cat > .env << EOF
BOT_TOKEN=your_bot_token_here
MONGODB_URI=your_mongodb_uri_here
ADMIN_ID=your_telegram_id
BOT_USER=your_bot_username
ADMIN_USER=your_username
PORT=9999
RAMADAN_DATE=2026-02-28
MINI_APP_URL=https://your-mini-app-url
EOF

# Edit with nano
nano .env
```

### Restart everything (nuclear option)

```bash
# 1. Complete cleanup
pm2 delete all
pm2 kill

# 2. Fresh start
cd /root/ramazonbot/api
pm2 start ecosystem.config.js

# 3. Save and monitor
pm2 save
pm2 logs
```

### Still not working?

1. **Check bot token** with BotFather
2. **Check MongoDB** is accessible from server
3. **Check firewall** rules
4. **Check server time** is correct: `date`
5. **Check disk space**: `df -h`
6. **Restart server**: `reboot` (last resort)

### Get help

Share these with support:

```bash
# System info
uname -a
node --version
npm --version
pm2 --version

# Full logs
pm2 logs --lines 200 > bot-logs.txt

# PM2 config
pm2 list
cat /root/ramazonbot/api/ecosystem.config.js

# Environment (without secrets)
cat /root/ramazonbot/api/.env | grep -v "TOKEN\|URI\|PASSWORD"
```

### Quick checklist

- [ ] Git pull done?
- [ ] npm install done?
- [ ] .env file exists?
- [ ] MongoDB accessible?
- [ ] Bot token valid?
- [ ] Port 9999 free?
- [ ] PM2 processes running?
- [ ] Logs show no errors?
- [ ] Firewall allows port?
- [ ] Server has enough memory?

Agar bularning hammasi ✅ bo'lsa, bot ishlashi kerak!
