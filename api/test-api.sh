#!/bin/bash

# Test API endpoints

echo "Testing API endpoints..."
echo ""

# Wait for server to start
sleep 2

echo "1. Testing /api/miniapp/test endpoint..."
curl -s http://localhost:9999/api/miniapp/test || echo "Failed"
echo ""
echo ""

echo "2. Testing /api/miniapp/prayer-times endpoint..."
curl -s -X POST http://localhost:9999/api/miniapp/prayer-times \
  -H "Content-Type: application/json" \
  -d '{"userId": 1551855614, "latitude": 41.2995, "longitude": 69.2401}' || echo "Failed"
echo ""
echo ""

echo "3. Testing /api/miniapp/weekly-prayer-times endpoint..."
curl -s -X POST http://localhost:9999/api/miniapp/weekly-prayer-times \
  -H "Content-Type: application/json" \
  -d '{"userId": 1551855614, "latitude": 41.2995, "longitude": 69.2401}' || echo "Failed"
echo ""
