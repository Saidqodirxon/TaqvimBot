#!/bin/bash

# MongoDB Backup Cron Job Setup
# Har kuni soat 3:00 da backup yaratadi

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Cron job line
CRON_JOB="0 3 * * * cd $PROJECT_DIR/api && /usr/bin/node backup-mongodb.js >> $PROJECT_DIR/api/backup.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "backup-mongodb.js"; then
    echo "⚠️  Backup cron job allaqachon mavjud"
    echo "Hozirgi cron jobs:"
    crontab -l | grep "backup-mongodb.js"
else
    # Add cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "✅ Backup cron job qo'shildi!"
    echo "Har kuni soat 3:00 da avtomatik backup yaratiladi"
    echo ""
    echo "Cron job:"
    echo "$CRON_JOB"
fi

echo ""
echo "📋 Barcha cron jobs:"
crontab -l

echo ""
echo "ℹ️  Cron job ni o'chirish uchun:"
echo "   crontab -e"
echo "   yoki:"
echo "   crontab -r  (barcha cron jobs o'chiriladi)"
