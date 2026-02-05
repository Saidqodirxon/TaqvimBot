#!/bin/bash

# Admin Panel Build & Run Script

# 1. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 2. Build for production
echo "🏗️ Building admin panel..."
npm run build

# 3. Serve with PM2 (using 'serve' package)
# Make sure 'serve' is installed globally: npm install -g serve
echo "🚀 Starting Admin Panel with PM2..."
pm2 start "serve -s dist -l 5000" --name ramazonbot-admin

echo "✅ Admin Panel is running on port 5000"
