#!/bin/bash

###############################################################################
# 🚀 Quick API Deploy (CORS and Menu Updates)
# Updates: CORS headers + Dynamic menu button
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🚀 Quick API Deploy (CORS + Menu)${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd /root/ramazonbot

# 1. Git Pull
echo -e "${YELLOW}📥 Step 1/3: Git Pull...${NC}"
git pull origin main || git pull origin master
echo -e "${GREEN}✓ Git pull completed${NC}\n"

# 2. Install dependencies
echo -e "${YELLOW}📦 Step 2/3: Installing dependencies...${NC}"
cd /root/ramazonbot/api
npm install --production --silent
echo -e "${GREEN}✓ Dependencies installed${NC}\n"

# 3. Restart API
echo -e "${YELLOW}🔄 Step 3/3: Restarting API (PM2 ID: 9)...${NC}"
pm2 restart 9
sleep 2
pm2 logs 9 --lines 20 --nostream
echo -e "${GREEN}✓ API restarted${NC}\n"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Deploy Completed!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}🧪 Test CORS:${NC}"
echo -e "  curl -I -X OPTIONS https://ramazonbot-api.saidqodirxon.uz/api/miniapp/test \\"
echo -e "    -H 'Origin: https://ramazonbot-admin.saidqodirxon.uz'"
echo ""
echo -e "${GREEN}🤖 Test Bot Menu:${NC}"
echo -e "  Send any message to @RealCoderUzBot"
echo -e "  Check if 'Taqvim' button appears in menu"
echo ""
