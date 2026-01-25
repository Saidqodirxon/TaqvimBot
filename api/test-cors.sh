#!/bin/bash

echo "🧪 Testing CORS Configuration"
echo "=============================="
echo ""

BASE_URL="http://localhost:9999/api"

echo "1. Testing OPTIONS preflight for /miniapp/prayer-times"
echo "-------------------------------------------------------"
curl -v -X OPTIONS "${BASE_URL}/miniapp/prayer-times" \
  -H "Origin: https://ramazonbot-admin.saidqodirxon.uz" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  2>&1 | grep -E "(< HTTP|< Access-Control|< Content-Type)"

echo ""
echo ""

echo "2. Testing actual POST request with Origin header"
echo "--------------------------------------------------"
curl -v -X POST "${BASE_URL}/miniapp/prayer-times" \
  -H "Origin: https://ramazonbot.saidqodirxon.uz" \
  -H "Content-Type: application/json" \
  -d '{"userId": 1551855614, "latitude": 41.2995, "longitude": 69.2401}' \
  2>&1 | grep -E "(< HTTP|< Access-Control|< Content-Type)" | head -10

echo ""
echo ""

echo "3. Testing from admin origin"
echo "----------------------------"
curl -v -X POST "${BASE_URL}/miniapp/test" \
  -H "Origin: https://ramazonbot-admin.saidqodirxon.uz" \
  2>&1 | grep -E "(< HTTP|< Access-Control)" | head -10

echo ""
echo "✅ CORS tests completed!"
