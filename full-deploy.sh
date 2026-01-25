#!/bin/bash

###############################################################################
# 🚀 Ramazonbot Full Deployment Script
# Auto: git pull, npm install, build, PM2 restart
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🚀 Ramazonbot Full Deployment${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd /root/ramazonbot

# 1. Git Pull
echo -e "${YELLOW}📥 Step 1/8: Git Pull...${NC}"
git pull origin main || git pull origin master || echo "Git pull skipped"
echo -e "${GREEN}✓ Git pull completed${NC}\n"

# 2. API - Install & Restart
echo -e "${YELLOW}📦 Step 2/8: API - npm install...${NC}"
cd /root/ramazonbot/api
npm install --silent
echo -e "${GREEN}✓ API dependencies installed${NC}"
echo -e "${YELLOW}🔄 Restarting API (PM2 ID: 9)...${NC}"
pm2 restart 9
sleep 2
# Check if API is running
if pm2 status | grep -q "9.*online"; then
  echo -e "${GREEN}✓ API restarted successfully${NC}\n"
else
  echo -e "${RED}✗ API failed to start. Checking logs:${NC}"
  pm2 logs 9 --lines 20 --nostream
  exit 1
fi

# 3. Admin Panel - Install & Build
echo -e "${YELLOW}📦 Step 3/8: Admin Panel - npm install...${NC}"
cd /root/ramazonbot/admin-panel
npm install --silent
echo -e "${GREEN}✓ Admin Panel dependencies installed${NC}"
echo -e "${YELLOW}🏗️  Building Admin Panel...${NC}"
npm run build --silent
echo -e "${GREEN}✓ Admin Panel built${NC}\n"

# 4. Admin Panel Nginx - Install & Restart
echo -e "${YELLOW}📦 Step 4/8: Admin Panel Nginx - npm install...${NC}"
cd /root/ramazonbot/admin-panel/nginx
npm install --silent
echo -e "${GREEN}✓ Admin Panel Nginx dependencies installed${NC}"
echo -e "${YELLOW}📦 Moving dist folder...${NC}"
# Remove old dist folder if exists
if [ -d "dist" ]; then
  echo -e "${YELLOW}🗑️  Removing old dist folder...${NC}"
  rm -rf dist
fi
# Copy new dist folder (safer than mv)
if [ -d "../dist" ]; then
  cp -r ../dist .
  echo -e "${GREEN}✓ Dist folder copied${NC}"
else
  echo -e "${RED}✗ Error: ../dist folder not found${NC}"
  exit 1
fi
echo -e "${YELLOW}🔄 Restarting Admin Panel (PM2 ID: 8)...${NC}"
pm2 restart 8
echo -e "${GREEN}✓ Admin Panel restarted${NC}\n"

# 5. Mini App (WebApp) - Install & Build
echo -e "${YELLOW}📦 Step 5/8: WebApp - npm install...${NC}"
cd /root/ramazonbot/mini-app
npm install --silent
echo -e "${GREEN}✓ WebApp dependencies installed${NC}"
echo -e "${YELLOW}🏗️  Building WebApp...${NC}"
npm run build --silent
echo -e "${GREEN}✓ WebApp built${NC}\n"

# 6. WebApp Nginx - Install & Restart
echo -e "${YELLOW}📦 Step 6/8: WebApp Nginx - npm install...${NC}"
cd /root/ramazonbot/mini-app/nginx
npm install --silent
echo -e "${GREEN}✓ WebApp Nginx dependencies installed${NC}"
echo -e "${YELLOW}📦 Moving dist folder...${NC}"
# Remove old dist folder if exists
if [ -d "dist" ]; then
  echo -e "${YELLOW}🗑️  Removing old dist folder...${NC}"
  rm -rf dist
fi
# Copy new dist folder (safer than mv)
if [ -d "../dist" ]; then
  cp -r ../dist .
  echo -e "${GREEN}✓ Dist folder copied${NC}"
else
  echo -e "${RED}✗ Error: ../dist folder not found${NC}"
  exit 1
fi
echo -e "${YELLOW}🔄 Restarting WebApp (PM2 ID: 7)...${NC}"
pm2 restart 7
echo -e "${GREEN}✓ WebApp restarted${NC}\n"

# 7. PM2 Save
echo -e "${YELLOW}💾 Step 7/8: Saving PM2 config...${NC}"
pm2 save
echo -e "${GREEN}✓ PM2 config saved${NC}\n"

# 8. Status Check
echo -e "${YELLOW}📊 Step 8/8: Checking status...${NC}"
pm2 status | grep ramazonbot
echo ""

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Deployment Completed Successfully!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}🔗 URLs:${NC}"
echo -e "  API:         https://ramazonbot-api.saidqodirxon.uz"
echo -e "  Admin Panel: https://ramazonbot-admin.saidqodirxon.uz"
echo -e "  WebApp:      https://ramazonbot.saidqodirxon.uz"
echo ""
echo -e "${GREEN}📋 Commands:${NC}"
echo -e "  View logs:   pm2 logs ramazonbot-api"
echo -e "  Status:      pm2 status"
echo -e "  Restart all: pm2 restart all"
echo ""
