#!/bin/bash

# Quick fix deployment script for ramazonbot
# Usage: ./deploy-fix.sh

echo "🚀 Deploying fixes to server..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if on main branch
BRANCH=$(git branch --show-current)
if [ "$BRANCH" != "main" ]; then
    echo -e "${RED}❌ Not on main branch. Currently on: $BRANCH${NC}"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}⚠️  You have uncommitted changes. Committing now...${NC}"
    git add -A
    echo "Enter commit message (or press Enter for default):"
    read commit_msg
    if [ -z "$commit_msg" ]; then
        commit_msg="Fix: Performance and middleware optimizations"
    fi
    git commit -m "$commit_msg"
fi

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to push to GitHub${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Pushed to GitHub${NC}"

# Deploy to server
echo ""
echo "🖥️  Deploying to server..."
echo "Run this command on your server:"
echo ""
echo -e "${YELLOW}cd /root/ramazonbot && git pull && pm2 restart all${NC}"
echo ""
echo "Or run automatically (if SSH configured):"
echo ""
echo -e "${YELLOW}ssh root@YOUR_SERVER 'cd /root/ramazonbot && git pull && pm2 restart all'${NC}"
echo ""

echo -e "${GREEN}✅ Deployment preparation complete!${NC}"
