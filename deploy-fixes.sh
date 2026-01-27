#!/bin/bash

echo "🚀 Deploying fixes..."

cd /root/ramazonbot || exit 1

# Pull latest changes
echo "📥 Pulling latest code..."
git pull

# Rebuild admin panel
echo "🏗️ Rebuilding admin panel..."
cd admin-panel
npm run build

# Install nginx dependencies if needed
if [ ! -d "nginx/node_modules" ]; then
  echo "📦 Installing nginx dependencies..."
  cd nginx
  npm install
  cd ..
fi

# Restart PM2 services
echo "🔄 Restarting services..."
cd ..
pm2 restart ramazonbot-admin-9998
pm2 restart ramazonbot-api-9999

# Set menu button
echo "🔘 Setting menu button..."
cd api
node scripts/maintenance/set-menu-button.js

# Save PM2 state
pm2 save

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Changes:"
echo "   1. ✅ Fixed localhost URL in BroadcastLocation"
echo "   2. ✅ Removed reminder spam logs"
echo "   3. ✅ Menu button URL set to mini app"
echo ""
echo "🧪 Test:"
echo "   1. Open admin panel: https://ramazonbot-admin.saidqodirxon.uz"
echo "   2. Go to Broadcast Location page (no 404 errors)"
echo "   3. Check bot logs: pm2 logs ramazonbot-api-9999"
echo "   4. Check menu button in Telegram bot"
