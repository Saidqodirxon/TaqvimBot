#!/bin/bash

# 🔧 Admin Panel Server Fix Script

echo "🔧 Fixing Admin Panel Server..."
echo ""

# Navigate to project
cd /root/ramazonbot || exit 1

# 1. Check dist folder
echo "1️⃣ Checking dist folder..."
if [ -f "admin-panel/dist/index.html" ]; then
  echo "✅ dist/index.html exists"
else
  echo "❌ dist/index.html missing - rebuilding..."
  cd admin-panel
  npm run build
  cd ..
fi
echo ""

# 2. Check nginx dependencies
echo "2️⃣ Checking nginx server dependencies..."
cd admin-panel/nginx
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
else
  echo "✅ node_modules exists"
fi
cd ../..
echo ""

# 3. Stop admin panel
echo "3️⃣ Stopping admin panel..."
pm2 stop ramazonbot-admin-9998 2>/dev/null || echo "⚠️ Process not found"
pm2 delete ramazonbot-admin-9998 2>/dev/null || echo "⚠️ Process not found"
echo ""

# 4. Start fresh
echo "4️⃣ Starting admin panel..."
cd admin-panel/nginx
PORT=9998 pm2 start server.main.js --name ramazonbot-admin-9998
cd ../..
echo ""

# 5. Test
echo "5️⃣ Testing..."
sleep 3
curl -I http://localhost:9998 2>&1 | head -5
echo ""

# 6. Save PM2
echo "6️⃣ Saving PM2..."
pm2 save
echo ""

echo "✅ Admin Panel Server Fixed!"
echo ""
echo "🌐 Admin Panel: https://ramazonbot-admin.saidqodirxon.uz"
echo ""
echo "📝 Check logs:"
echo "   pm2 logs ramazonbot-admin-9998"
