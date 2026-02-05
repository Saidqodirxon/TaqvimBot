#!/bin/bash

# Environment Variables
export BOT_TOKEN='PLACEHOLDER_TOKEN'
export MIN_APP_URL='https://ramazon.saidqodirxon.uz'
export ADMIN_ID=119050519
export MONGODB_URI='mongodb://127.0.0.1:27017/ramazonbot'
export PORT=9999
export JWT_SECRET='2938429384234029384029384029384'
export ADMIN_USER=admin
export ADMIN_PASSWORD=admin
export RAMADAN_DATE=2026-02-17
export BOT_USER=Ramazon_taqvim_2025_bot
export REDIS_HOST=localhost
export REDIS_PORT=6379

# Start with PM2
pm2 start bot.js --name ramazonbot-api
