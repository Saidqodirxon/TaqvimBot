#!/bin/bash

# Quick fix script for common server issues
# Run on server: bash <(curl -s https://raw.githubusercontent.com/USERNAME/REPO/main/server-fix.sh)

echo "🔧 RamazonBot Auto-Fix Script"
echo "============================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

cd /root/ramazonbot

# 1. Stop all processes
echo "⏹️  Stopping all PM2 processes..."
pm2 stop all
pm2 delete all

# 2. Pull latest code
echo "📥 Pulling latest code..."
git fetch origin main
git reset --hard origin/main

# 3. Install dependencies
echo "📦 Installing dependencies..."
cd /root/ramazonbot/api
npm install --production

# 4. Check .env
echo "🔍 Checking .env file..."
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ .env file not found!${NC}"
    echo "Please create .env file with:"
    echo "  BOT_TOKEN=your_bot_token"
    echo "  MONGODB_URI=your_mongodb_uri"
    echo "  ADMIN_ID=your_telegram_id"
    echo "  PORT=9999"
    exit 1
fi

# 5. Test MongoDB connection
echo "🗄️  Testing MongoDB connection..."
node -e "
const mongoose = require('mongoose');
require('dotenv').config();
mongoose.connect(process.env.MONGODB_URI)
  .then(() => { console.log('✅ MongoDB connected'); process.exit(0); })
  .catch(err => { console.error('❌ MongoDB error:', err.message); process.exit(1); });
" 2>&1

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ MongoDB connection failed!${NC}"
    echo "Check your MONGODB_URI in .env"
    exit 1
fi

# 6. Start with PM2
echo "🚀 Starting bot with PM2..."
pm2 start ecosystem.config.js
pm2 save

# 7. Wait and check status
echo "⏳ Waiting 10 seconds..."
sleep 10

# 8. Check if running
pm2 list

echo ""
echo "📊 Checking logs..."
pm2 logs --lines 30 --nostream

# 9. Final status
PM2_ONLINE=$(pm2 jlist 2>/dev/null | grep -c "online")
if [ "$PM2_ONLINE" -gt 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Bot is running!${NC}"
    echo ""
    echo "Monitor logs with: pm2 logs"
    echo "Check status: pm2 status"
    echo "Restart: pm2 restart all"
else
    echo ""
    echo -e "${RED}❌ Bot failed to start${NC}"
    echo "Check logs: pm2 logs"
    exit 1
fi
