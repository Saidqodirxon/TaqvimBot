#!/bin/bash
# Quick deployment for ramazonbot - Run on server

echo "🚀 Deploying ramazonbot..."

cd /root/ramazonbot || exit 1

# Pull latest code
echo "📥 Git pull..."
git pull

# Stop bot
echo "⏹️  Stopping bot..."
pm2 stop all

# Install dependencies (if package.json changed)
echo "📦 Checking dependencies..."
cd api
npm install --production

# Build mini-app (if changed)
echo "🏗️  Building mini app..."
cd ../mini-app
npm install --production
npm run build

# Restart everything
echo "🔄 Restarting services..."
cd ../api
pm2 restart all

# Show status
echo ""
echo "✅ Deployment complete!"
echo ""
pm2 status
echo ""
echo "📊 Logs: pm2 logs"
