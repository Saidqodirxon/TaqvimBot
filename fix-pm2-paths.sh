#!/bin/bash

# 🚀 Quick Fix - PM2 Ecosystem Path Errors
# Use this if you get "Cannot find module" errors

echo "🔧 Fixing PM2 ecosystem paths..."

cd /root/ramazonbot/api

# Stop all processes
echo "1️⃣ Stopping all services..."
pm2 stop all

# Delete all processes
echo "2️⃣ Cleaning PM2..."
pm2 delete all

# Start fresh with correct paths
echo "3️⃣ Starting with correct paths..."
pm2 start ecosystem.config.js

# Save PM2 state
echo "4️⃣ Saving PM2 state..."
pm2 save

# Show status
echo ""
echo "✅ All services restarted!"
echo ""
pm2 status

echo ""
echo "📋 Check logs:"
echo "   pm2 logs"
