#!/bin/bash

###############################################################################
# 🚀 Ramazonbot Full Deploy Script
# Usage: bash deploy.sh
# Description: Complete deployment - pull, install, build, restart
###############################################################################

set -e

echo "🚀 Starting Ramazonbot Deployment..."
echo ""

# Navigate to project directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# 1. Git pull (if using git)
if [ -d ".git" ]; then
    echo "📥 Pulling latest changes..."
    git pull origin main || git pull origin master || echo "⚠️  Git pull skipped"
    echo ""
fi

# 2. Install dependencies
echo "📦 Installing dependencies..."

# API
if [ -d "api" ]; then
    echo "  - API dependencies..."
    cd api
    npm install --production
    cd ..
fi

# Admin Panel
if [ -d "admin-panel" ]; then
    echo "  - Admin Panel dependencies..."
    cd admin-panel
    npm install
    echo "  - Building Admin Panel..."
    npm run build
    cd ..
fi

# Mini App
if [ -d "mini-app" ]; then
    echo "  - Mini App dependencies..."
    cd mini-app
    npm install
    echo "  - Building Mini App..."
    npm run build
    cd ..
fi

echo ""
echo "✅ Build completed!"
echo ""

# 3. Restart bot
echo "🔄 Restarting bot..."
cd api

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 not found. Installing PM2..."
    npm install -g pm2
fi

# Restart or start bot
pm2 restart ramazonbot 2>/dev/null || pm2 start bot.js --name ramazonbot
pm2 save

echo ""
echo "📊 Status:"
pm2 status ramazonbot

echo ""
echo "✅ Deployment completed!"
echo ""
echo "🔗 URLs:"
echo "  Admin Panel: https://ramazonbot-admin.saidqodirxon.uz"
echo "  Mini App: https://ramazonbot.saidqodirxon.uz"
echo "  API: https://ramazonbot-api.saidqodirxon.uz"
echo ""
echo "📋 View logs:"
echo "  pm2 logs ramazonbot"
echo ""
