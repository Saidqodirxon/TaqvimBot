#!/bin/bash

###############################################################################
# 🚀 PM2 Setup Script for Ramazonbot
# Sets up all PM2 processes with ecosystem config
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🚀 PM2 Setup for Ramazonbot${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd /root/ramazonbot/api

# Stop all existing ramazonbot processes
echo -e "${YELLOW}🛑 Stopping existing processes...${NC}"
pm2 delete all 2>/dev/null || true

# Start with ecosystem config
echo -e "${YELLOW}🚀 Starting processes with ecosystem config...${NC}"
pm2 start ecosystem.config.js

# Save PM2 config
echo -e "${YELLOW}💾 Saving PM2 config...${NC}"
pm2 save

# Setup PM2 startup
echo -e "${YELLOW}🔄 Setting up PM2 startup...${NC}"
pm2 startup

echo ""
echo -e "${GREEN}📊 Current status:${NC}"
pm2 status

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ PM2 Setup Completed!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}📋 Useful commands:${NC}"
echo -e "  pm2 status               - View all processes"
echo -e "  pm2 logs ramazonbot-api  - View API logs"
echo -e "  pm2 logs ramazonbot-cache-refresh - View cache refresh logs"
echo -e "  pm2 restart all          - Restart all processes"
echo -e "  pm2 monit                - Monitor processes"
echo ""
