#!/bin/bash

###############################################################################
# 📤 Upload and Deploy to Server
# Usage: bash upload-and-deploy.sh [server_user@server_ip]
# Example: bash upload-and-deploy.sh root@64.23.175.234
###############################################################################

set -e

# Server details
SERVER=${1:-"root@server"}  # Default or from argument
REMOTE_PATH="/root/ramazonbot"

echo "📤 Uploading and Deploying Ramazonbot..."
echo "🖥️  Server: $SERVER"
echo "📁 Remote path: $REMOTE_PATH"
echo ""

# Confirm
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled."
    exit 0
fi

echo ""
echo "1️⃣  Uploading updated files..."

# Upload critical files
echo "  - Logger fix..."
scp api/utils/logger.js $SERVER:$REMOTE_PATH/api/utils/

echo "  - Bot.js fix..."
scp api/bot.js $SERVER:$REMOTE_PATH/api/

echo "  - Mini app routes..."
scp api/routes/admin/miniapp.js $SERVER:$REMOTE_PATH/api/routes/admin/

echo "  - Mini app frontend..."
scp mini-app/src/App.jsx $SERVER:$REMOTE_PATH/mini-app/src/

echo "  - Scripts..."
scp quick-restart.sh $SERVER:$REMOTE_PATH/
scp deploy.sh $SERVER:$REMOTE_PATH/
scp cleanup-production.sh $SERVER:$REMOTE_PATH/

echo ""
echo "2️⃣  Making scripts executable..."
ssh $SERVER "chmod +x $REMOTE_PATH/*.sh"

echo ""
echo "3️⃣  Restarting bot..."
ssh $SERVER "cd $REMOTE_PATH/api && pm2 restart ramazonbot"

echo ""
echo "4️⃣  Checking status..."
ssh $SERVER "pm2 status ramazonbot"

echo ""
echo "5️⃣  Recent logs..."
ssh $SERVER "pm2 logs ramazonbot --lines 20 --nostream"

echo ""
echo "✅ Upload and deployment complete!"
echo ""
echo "🔗 Test endpoints:"
echo "  curl https://ramazonbot-api.saidqodirxon.uz/api/miniapp/test"
echo ""
echo "📋 View live logs:"
echo "  ssh $SERVER \"pm2 logs ramazonbot\""
echo ""
