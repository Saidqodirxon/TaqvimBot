#!/bin/bash

# 🔄 Bot Restart Script
# Botni to'g'ri restart qilish va monitoring

echo "🔄 Restarting Ramazon Bot..."

# 1. Stop all PM2 processes
echo "1️⃣ Stopping all processes..."
pm2 stop all

# 2. Wait for processes to stop
sleep 3

# 3. Restart with ecosystem config
echo "2️⃣ Starting services..."
cd /root/ramazonbot/api
pm2 start ecosystem.config.js

# 4. Save PM2 state
echo "3️⃣ Saving PM2 state..."
pm2 save

# 5. Show status
echo ""
echo "✅ Services restarted!"
echo ""
pm2 status

echo ""
echo "📋 View logs:"
echo "   pm2 logs ramazonbot-api-9999"
echo ""
