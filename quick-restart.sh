#!/bin/bash

###############################################################################
# 🔄 Ramazonbot Quick Restart Script
# Usage: bash quick-restart.sh
# Description: Restart bot with PM2 and show logs
###############################################################################

set -e

echo "🔄 Restarting Ramazonbot..."
echo ""

# Navigate to project directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check if PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 not found. Installing PM2..."
    npm install -g pm2
fi

# Restart the bot
echo "🔄 Restarting bot..."
cd api
pm2 restart ramazonbot 2>/dev/null || pm2 start bot.js --name ramazonbot

# Wait a moment for startup
sleep 2

# Show status
echo ""
echo "📊 Status:"
pm2 status ramazonbot

# Show recent logs
echo ""
echo "📋 Recent logs:"
pm2 logs ramazonbot --lines 20 --nostream

echo ""
echo "✅ Bot restarted!"
echo ""
echo "💡 Useful commands:"
echo "  pm2 logs ramazonbot       - View live logs"
echo "  pm2 restart ramazonbot    - Restart bot"
echo "  pm2 stop ramazonbot       - Stop bot"
echo "  pm2 delete ramazonbot     - Remove from PM2"
echo ""
