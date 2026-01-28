#!/bin/bash

# Server debugging script for ramazonbot
# Run this on your server to diagnose issues

echo "🔍 RamazonBot Server Diagnostics"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Check Node.js
echo -e "${BLUE}1. Checking Node.js...${NC}"
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js installed: $NODE_VERSION${NC}"
else
    echo -e "${RED}❌ Node.js not found${NC}"
fi
echo ""

# Check PM2
echo -e "${BLUE}2. Checking PM2...${NC}"
if command -v pm2 &> /dev/null; then
    PM2_VERSION=$(pm2 --version)
    echo -e "${GREEN}✅ PM2 installed: $PM2_VERSION${NC}"
    echo ""
    pm2 list
else
    echo -e "${RED}❌ PM2 not found${NC}"
fi
echo ""

# Check MongoDB connection
echo -e "${BLUE}3. Checking MongoDB...${NC}"
if command -v mongosh &> /dev/null; then
    echo -e "${GREEN}✅ MongoDB client installed${NC}"
    # Try to ping MongoDB
    mongosh --eval "db.adminCommand('ping')" --quiet 2>&1 | grep -q "ok"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ MongoDB is responding${NC}"
    else
        echo -e "${YELLOW}⚠️  MongoDB connection issue (check connection string)${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  mongosh not installed (can't test MongoDB)${NC}"
fi
echo ""

# Check .env file
echo -e "${BLUE}4. Checking .env file...${NC}"
if [ -f "/root/ramazonbot/api/.env" ]; then
    echo -e "${GREEN}✅ .env file exists${NC}"
    
    # Check critical variables (without showing values)
    if grep -q "BOT_TOKEN=" /root/ramazonbot/api/.env; then
        echo -e "${GREEN}✅ BOT_TOKEN found${NC}"
    else
        echo -e "${RED}❌ BOT_TOKEN missing${NC}"
    fi
    
    if grep -q "MONGODB_URI=" /root/ramazonbot/api/.env; then
        echo -e "${GREEN}✅ MONGODB_URI found${NC}"
    else
        echo -e "${RED}❌ MONGODB_URI missing${NC}"
    fi
    
    if grep -q "ADMIN_ID=" /root/ramazonbot/api/.env; then
        echo -e "${GREEN}✅ ADMIN_ID found${NC}"
    else
        echo -e "${RED}❌ ADMIN_ID missing${NC}"
    fi
else
    echo -e "${RED}❌ .env file not found at /root/ramazonbot/api/.env${NC}"
fi
echo ""

# Check logs
echo -e "${BLUE}5. Recent PM2 logs (last 20 lines)...${NC}"
if command -v pm2 &> /dev/null; then
    pm2 logs --lines 20 --nostream 2>&1 | tail -20
else
    echo -e "${RED}❌ PM2 not available${NC}"
fi
echo ""

# Check disk space
echo -e "${BLUE}6. Disk space...${NC}"
df -h / | tail -1 | awk '{print "Used: " $3 "/" $2 " (" $5 ")"}'
echo ""

# Check memory
echo -e "${BLUE}7. Memory usage...${NC}"
free -h | grep Mem | awk '{print "Used: " $3 "/" $2}'
echo ""

# Check port 9999
echo -e "${BLUE}8. Checking port 9999...${NC}"
if netstat -tuln | grep -q ":9999"; then
    echo -e "${GREEN}✅ Port 9999 is in use (API is running)${NC}"
else
    echo -e "${RED}❌ Port 9999 is not in use (API not running)${NC}"
fi
echo ""

# Check Git status
echo -e "${BLUE}9. Git status...${NC}"
cd /root/ramazonbot
CURRENT_BRANCH=$(git branch --show-current)
CURRENT_COMMIT=$(git log -1 --oneline)
echo -e "Branch: ${GREEN}$CURRENT_BRANCH${NC}"
echo -e "Commit: ${GREEN}$CURRENT_COMMIT${NC}"

# Check if behind origin
git fetch origin main --quiet 2>&1
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u})
if [ $LOCAL = $REMOTE ]; then
    echo -e "${GREEN}✅ Up to date with origin${NC}"
else
    echo -e "${YELLOW}⚠️  Behind origin - run 'git pull'${NC}"
fi
echo ""

# Final recommendations
echo -e "${BLUE}10. Recommendations:${NC}"
echo ""

# Check if bot is running
PM2_STATUS=$(pm2 jlist 2>/dev/null | grep -c "online")
if [ "$PM2_STATUS" -gt 0 ]; then
    echo -e "${GREEN}✅ Bot processes are running${NC}"
    echo ""
    echo "If bot is not responding:"
    echo "  1. Check logs: pm2 logs"
    echo "  2. Restart: pm2 restart all"
    echo "  3. Check .env variables"
else
    echo -e "${RED}❌ No PM2 processes running${NC}"
    echo ""
    echo "To start the bot:"
    echo "  cd /root/ramazonbot/api"
    echo "  pm2 start ecosystem.config.js"
    echo "  pm2 save"
fi

echo ""
echo "📊 Full logs command:"
echo -e "${YELLOW}pm2 logs --lines 100${NC}"
echo ""
