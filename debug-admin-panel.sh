#!/bin/bash

echo "🔍 Admin Panel Debug Info"
echo "========================="
echo ""

# Check if PM2 process is running
echo "1. PM2 Status:"
pm2 status ramazonbot-admin-9998
echo ""

# Check if port is listening
echo "2. Port 9998 listening:"
sudo netstat -tulpn | grep 9998 || echo "Port 9998 not listening!"
echo ""

# Check dist folder
echo "3. Dist folder contents:"
ls -lh /root/ramazonbot/admin-panel/dist/
echo ""

# Check index.html exists
echo "4. Index.html check:"
if [ -f "/root/ramazonbot/admin-panel/dist/index.html" ]; then
    echo "✅ index.html exists"
    ls -lh /root/ramazonbot/admin-panel/dist/index.html
else
    echo "❌ index.html NOT FOUND!"
fi
echo ""

# Test localhost
echo "5. Test localhost:9998:"
curl -I http://localhost:9998 2>/dev/null | head -5
echo ""

# Check PM2 logs
echo "6. Recent PM2 logs:"
pm2 logs ramazonbot-admin-9998 --lines 10 --nostream
echo ""

# Check nginx config
echo "7. Nginx config for admin:"
sudo nginx -t
echo ""
sudo cat /etc/nginx/sites-available/ramazonbot-admin 2>/dev/null || echo "Nginx config not found"
echo ""

echo "========================="
echo "Debug info completed"
