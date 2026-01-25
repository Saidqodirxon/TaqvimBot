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

# Check if PM2 ecosystem config exists and use it
if [ -f "ecosystem.config.js" ]; then
  echo -e "${YELLOW}🔄 Starting/Restarting with PM2 ecosystem...${NC}"
  
  # Delete old processes by name to avoid conflicts
  echo -e "${YELLOW}🛑 Stopping old processes...${NC}"
  pm2 delete ramazonbot-api-9999 2>/dev/null || true
  pm2 delete ramazonbot-cache-refresh 2>/dev/null || true
  pm2 delete ramazonbot-admin-9998 2>/dev/null || true
  pm2 delete ramazonbot-webapp-9997 2>/dev/null || true
  
  # Start all processes from ecosystem
  pm2 start ecosystem.config.js
  pm2 save
  sleep 3
  
  # Check if all processes are running
  if pm2 status | grep -q "ramazonbot-api-9999.*online"; then
    echo -e "${GREEN}✓ API (9999) started successfully${NC}"
  else
    echo -e "${RED}✗ API failed to start. Checking logs:${NC}"
    pm2 logs ramazonbot-api-9999 --lines 20 --nostream
    exit 1
  fi
  
  if pm2 status | grep -q "ramazonbot-cache-refresh.*online"; then
    echo -e "${GREEN}✓ Cache refresh scheduler started${NC}"
  else
    echo -e "${YELLOW}⚠ Cache refresh scheduler not running (non-critical)${NC}"
  fi
  
  if pm2 status | grep -q "ramazonbot-admin-9998.*online"; then
    echo -e "${GREEN}✓ Admin Panel (9998) started successfully${NC}"
  else
    echo -e "${YELLOW}⚠ Admin Panel not running${NC}"
  fi
  
  if pm2 status | grep -q "ramazonbot-webapp-9997.*online"; then
    echo -e "${GREEN}✓ WebApp (9997) started successfully${NC}"
  else
    echo -e "${YELLOW}⚠ WebApp not running${NC}"
  fi
else
  echo -e "${YELLOW}🔄 Restarting API (PM2 ID: 9)...${NC}"
  pm2 restart 9
  sleep 2
  # Check if API is running
  if pm2 status | grep -q "9.*online"; then
    echo -e "${GREEN}✓ API restarted successfully${NC}"
  else
    echo -e "${RED}✗ API failed to start. Checking logs:${NC}"
    pm2 logs 9 --lines 20 --nostream
    exit 1
  fi
fi
echo ""

# 3. Admin Panel - Install & Build
echo -e "${YELLOW}📦 Step 3/8: Admin Panel - npm install...${NC}"
cd /root/ramazonbot/admin-panel
npm install --silent
echo -e "${GREEN}✓ Admin Panel dependencies installed${NC}"
echo -e "${YELLOW}🏗️  Building Admin Panel...${NC}"
npm run build --silent
echo -e "${GREEN}✓ Admin Panel built${NC}"

# 3b. Admin Panel Nginx - Prepare dist
echo -e "${YELLOW}📦 Admin Panel Nginx - preparing...${NC}"
cd /root/ramazonbot/admin-panel/nginx
npm install --silent
# Remove old dist folder if exists
if [ -d "dist" ]; then
  echo -e "${YELLOW}🗑️  Removing old dist...${NC}"
  rm -rf dist
fi
# Copy new dist folder
if [ -d "../dist" ]; then
  mv ../dist .
  echo -e "${GREEN}✓ Admin Panel dist moved${NC}"
else
  echo -e "${RED}✗ Admin Panel dist folder not found${NC}"
  exit 1
fi
echo ""

# 4. Mini App (WebApp) - Install & Build
echo -e "${YELLOW}📦 Step 4/8: WebApp - npm install...${NC}"
cd /root/ramazonbot/mini-app
npm install --silent
echo -e "${GREEN}✓ WebApp dependencies installed${NC}"
echo -e "${YELLOW}🏗️  Building WebApp...${NC}"
npm run build --silent
echo -e "${GREEN}✓ WebApp built${NC}"

# 4b. WebApp Nginx - Prepare dist
echo -e "${YELLOW}📦 WebApp Nginx - preparing...${NC}"
cd /root/ramazonbot/mini-app/nginx
npm install --silent
# Remove old dist folder if exists
if [ -d "dist" ]; then
  echo -e "${YELLOW}🗑️  Removing old dist...${NC}"
  rm -rf dist
fi
# Copy new dist folder
if [ -d "../dist" ]; then
  mv ../dist .
  echo -e "${GREEN}✓ WebApp dist moved${NC}"
else
  echo -e "${RED}✗ WebApp dist folder not found${NC}"
  exit 1
fi
echo ""

# 5. PM2 Save
echo -e "${YELLOW}💾 Step 5/8: Saving PM2 config...${NC}"
pm2 save
echo -e "${GREEN}✓ PM2 config saved${NC}\n"

# 6. Status Check
echo -e "${YELLOW}📊 Step 6/8: Checking status...${NC}"
pm2 status | grep ramazonbot
echo ""

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Deployment Completed Successfully!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}🔗 URLs:${NC}"
echo -e "  API:         https://ramazonbot-api.saidqodirxon.uz (Port 9999)"
echo -e "  Admin Panel: https://ramazonbot-admin.saidqodirxon.uz (Port 9998)"
echo -e "  WebApp:      https://ramazonbot.saidqodirxon.uz (Port 9997)"
echo ""
echo -e "${GREEN}📋 Commands:${NC}"
echo -e "  View API logs:    pm2 logs ramazonbot-api-9999"
echo -e "  View Admin logs:  pm2 logs ramazonbot-admin-9998"
echo -e "  View WebApp logs: pm2 logs ramazonbot-webapp-9997"
echo -e "  Status:           pm2 status"
echo -e "  Restart all:      pm2 restart all"
echo ""
