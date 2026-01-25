@echo off
REM ############################################################################
REM  🧹 Ramazonbot Production Cleanup Script (Windows)
REM  Usage: cleanup-production.bat
REM  Description: Removes unnecessary files from production server
REM ############################################################################

setlocal enabledelayedexpansion

echo.
echo 🧹 Starting Ramazonbot Production Cleanup...
echo 📁 Current directory: %CD%
echo.

REM Confirm before proceeding
set /p CONFIRM="⚠️  This will delete files from ramazonbot folder. Continue? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo ❌ Cleanup cancelled.
    exit /b 0
)

echo.
echo 🗑️  Removing unnecessary files...
echo.

REM 1. Remove log files
echo 📄 Removing log files...
del /s /q *.log 2>nul
del /s /q npm-debug.log* 2>nul
del /s /q yarn-debug.log* 2>nul
del /s /q yarn-error.log* 2>nul

REM 2. Remove old/backup files
echo 💾 Removing old and backup files...
del /s /q *-old.js 2>nul
del /s /q *-backup.js 2>nul
del /s /q *.backup 2>nul

REM 3. Remove test/temp files
echo 🧪 Removing test and temp files...
del /s /q *.tmp 2>nul
del /s /q *.temp 2>nul
for /d /r . %%d in (.cache) do @if exist "%%d" rd /s /q "%%d" 2>nul

REM 4. Remove OS-specific files
echo 💻 Removing OS files...
del /s /q .DS_Store 2>nul
del /s /q Thumbs.db 2>nul
del /s /q desktop.ini 2>nul

REM 5. Remove IDE files
echo 🔧 Removing IDE files...
for /d /r . %%d in (.vscode) do @if exist "%%d" rd /s /q "%%d" 2>nul
for /d /r . %%d in (.idea) do @if exist "%%d" rd /s /q "%%d" 2>nul

REM 6. Remove source maps in production
echo 🏗️  Removing source maps...
del /s /q dist\*.map 2>nul

REM 7. Remove development-only files
echo 🛠️  Removing development files...
if exist "api\migrate-users.js" (
    echo   - Removing api\migrate-users.js
    del /q "api\migrate-users.js" 2>nul
)
if exist "api\update-all-users-to-mwl.js" (
    echo   - Removing api\update-all-users-to-mwl.js
    del /q "api\update-all-users-to-mwl.js" 2>nul
)
if exist "api\bot-old.js" (
    echo   - Removing api\bot-old.js
    del /q "api\bot-old.js" 2>nul
)

REM 8. Clean package manager artifacts
echo 📦 Cleaning package manager artifacts...
del /s /q package-lock.json.bak 2>nul
del /s /q yarn.lock.bak 2>nul

REM 9. Remove coverage reports
echo 📊 Removing test coverage...
for /d /r . %%d in (coverage) do @if exist "%%d" rd /s /q "%%d" 2>nul
for /d /r . %%d in (.nyc_output) do @if exist "%%d" rd /s /q "%%d" 2>nul

echo.
echo ✅ Cleanup completed!
echo.
echo 📊 Summary:
echo   - Log files removed
echo   - Old/backup files removed
echo   - Temp files removed
echo   - OS files removed
echo   - IDE files removed
echo   - Migration scripts removed
echo.

REM Show directory listing
echo 📋 Remaining structure:
dir /b
echo.

echo 🎉 Production cleanup complete!
echo ℹ️  Remember to:
echo   1. Test the application after cleanup
echo   2. Keep .env file secure
echo   3. Backup database before major changes
echo   4. Monitor logs for any issues
echo.

pause
