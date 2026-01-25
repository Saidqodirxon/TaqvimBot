#!/bin/bash

###############################################################################
# 🧹 Ramazonbot Production Cleanup Script
# Usage: bash cleanup-production.sh
# Description: Removes unnecessary files from production server
###############################################################################

set -e  # Exit on error

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "🧹 Starting Ramazonbot Production Cleanup..."
echo "📁 Current directory: $SCRIPT_DIR"
echo ""

# Confirm before proceeding
read -p "⚠️  This will delete files from ramazonbot folder. Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cleanup cancelled."
    exit 0
fi

echo ""
echo "🗑️  Removing unnecessary files..."
echo ""

# Counter for deleted items
DELETED_COUNT=0

# 1. Remove log files
echo "📄 Removing log files..."
find . -name "*.log" -type f ! -path "*/node_modules/*" -print -delete 2>/dev/null && DELETED_COUNT=$((DELETED_COUNT+1)) || true
find . -name "npm-debug.log*" -type f ! -path "*/node_modules/*" -print -delete 2>/dev/null || true
find . -name "yarn-debug.log*" -type f ! -path "*/node_modules/*" -print -delete 2>/dev/null || true
find . -name "yarn-error.log*" -type f ! -path "*/node_modules/*" -print -delete 2>/dev/null || true

# 2. Remove old/backup files
echo "💾 Removing old and backup files..."
find . -name "*-old.js" -type f ! -path "*/node_modules/*" -print -delete 2>/dev/null || true
find . -name "*-backup.js" -type f ! -path "*/node_modules/*" -print -delete 2>/dev/null || true
find . -name "*.backup" -type f ! -path "*/node_modules/*" -print -delete 2>/dev/null || true

# 3. Remove test/temp files
echo "🧪 Removing test and temp files..."
find . -name "*.tmp" -type f ! -path "*/node_modules/*" -print -delete 2>/dev/null || true
find . -name "*.temp" -type f ! -path "*/node_modules/*" -print -delete 2>/dev/null || true
find . -name ".cache" -type d ! -path "*/node_modules/*" -print -exec rm -rf {} + 2>/dev/null || true

# 4. Remove OS-specific files
echo "💻 Removing OS files..."
find . -name ".DS_Store" -type f -print -delete 2>/dev/null || true
find . -name "Thumbs.db" -type f -print -delete 2>/dev/null || true
find . -name "desktop.ini" -type f -print -delete 2>/dev/null || true

# 5. Remove IDE files (optional - comment out if needed)
echo "🔧 Removing IDE files..."
find . -name ".vscode" -type d ! -path "*/node_modules/*" -print -exec rm -rf {} + 2>/dev/null || true
find . -name ".idea" -type d ! -path "*/node_modules/*" -print -exec rm -rf {} + 2>/dev/null || true

# 6. Remove build artifacts that shouldn't be in production
echo "🏗️  Checking build artifacts..."
# Keep dist/ but remove source maps in production
find . -path "*/dist/*.map" -type f -print -delete 2>/dev/null || true

# 7. Remove development-only files
echo "🛠️  Removing development files..."
# Remove migration scripts (one-time use only)
if [ -f "api/migrate-users.js" ]; then
    echo "  - Removing api/migrate-users.js"
    rm -f api/migrate-users.js
fi
if [ -f "api/update-all-users-to-mwl.js" ]; then
    echo "  - Removing api/update-all-users-to-mwl.js"
    rm -f api/update-all-users-to-mwl.js
fi
if [ -f "api/bot-old.js" ]; then
    echo "  - Removing api/bot-old.js"
    rm -f api/bot-old.js
fi

# 8. Clean npm/yarn artifacts
echo "📦 Cleaning package manager artifacts..."
find . -name "package-lock.json.bak" -type f -print -delete 2>/dev/null || true
find . -name "yarn.lock.bak" -type f -print -delete 2>/dev/null || true

# 9. Remove coverage reports
echo "📊 Removing test coverage..."
find . -name "coverage" -type d ! -path "*/node_modules/*" -print -exec rm -rf {} + 2>/dev/null || true
find . -name ".nyc_output" -type d ! -path "*/node_modules/*" -print -exec rm -rf {} + 2>/dev/null || true

# 10. Remove git-related (if not needed in production)
# Uncomment if you don't need .git in production
# echo "📚 Removing git files..."
# rm -rf .git 2>/dev/null || true
# rm -f .gitignore 2>/dev/null || true

echo ""
echo "✅ Cleanup completed!"
echo ""
echo "📊 Summary:"
echo "  - Log files removed"
echo "  - Old/backup files removed"
echo "  - Temp files removed"
echo "  - OS files removed"
echo "  - IDE files removed"
echo "  - Migration scripts removed"
echo ""

# Show disk usage
echo "💾 Current disk usage:"
du -sh . 2>/dev/null || echo "Unable to calculate disk usage"
echo ""

# List remaining important files
echo "📋 Remaining structure:"
ls -lah --group-directories-first 2>/dev/null || ls -lah 2>/dev/null || echo "Unable to list files"
echo ""

echo "🎉 Production cleanup complete!"
echo "ℹ️  Remember to:"
echo "  1. Test the application after cleanup"
echo "  2. Keep .env file secure"
echo "  3. Backup database before major changes"
echo "  4. Monitor logs for any issues"
