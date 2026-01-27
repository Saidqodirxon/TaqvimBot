#!/bin/bash

echo "🚀 Admin Panel Deploy Boshlandi..."
echo "===================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Pull latest changes
echo -e "${YELLOW}1. Git pull...${NC}"
cd /root/ramazonbot
git pull origin main

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Git pull failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Git pull successful${NC}"

# 2. Install dependencies (if needed)
echo -e "${YELLOW}2. Checking dependencies...${NC}"
cd /root/ramazonbot/admin-panel

if [ ! -d "node_modules" ]; then
    echo "Installing npm packages..."
    npm install
fi

# 3. Build admin panel
echo -e "${YELLOW}3. Building admin panel...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Build successful${NC}"

# 4. Check dist folder
if [ ! -d "dist" ]; then
    echo -e "${RED}❌ Dist folder not found!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dist folder exists${NC}"

# 5. Restart PM2 service
echo -e "${YELLOW}4. Restarting PM2 services...${NC}"
pm2 restart ramazonbot-admin-9998

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ PM2 restart failed!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ PM2 restarted${NC}"

# 6. Check status
echo -e "${YELLOW}5. Checking PM2 status...${NC}"
pm2 status ramazonbot-admin-9998

# 7. Show logs
echo -e "${YELLOW}6. Showing recent logs...${NC}"
pm2 logs ramazonbot-admin-9998 --lines 20 --nostream

echo ""
echo "===================================="
echo -e "${GREEN}✅ Admin Panel Deploy Completed!${NC}"
echo "===================================="
echo ""
echo "Admin Panel: https://ramazonbot-admin.saidqodirxon.uz"
echo ""
echo "Test qilish uchun:"
echo "  curl http://localhost:9998"
echo ""
