#!/bin/bash

echo "🔧 Fixing Admin Panel Routes..."

# Navigate to project root
cd /root/ramazonbot || exit 1

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull

# Rebuild admin panel with new API_URL
echo "🏗️ Building admin panel..."
cd admin-panel
npm install
npm run build

# Restart services
echo "🔄 Restarting PM2 services..."
cd ..
pm2 restart ramazonbot-admin-9998
pm2 restart ramazonbot-api-9999
pm2 save

echo "✅ Admin panel routes fixed!"
echo ""
echo "🌐 Admin Panel: https://ramazonbot-admin.saidqodirxon.uz"
echo "🔌 API Server: https://ramazonbot-api.saidqodirxon.uz"
echo ""
echo "📝 Test the following:"
echo "   - Login page loads"
echo "   - Dashboard loads without 404"
echo "   - Settings page loads"
echo "   - Calendar/Monthly Prayer Times loads fast (<1s)"
