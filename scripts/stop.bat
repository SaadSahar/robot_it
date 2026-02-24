@echo off
echo ============================================
echo 🛑 إيقاف جميع الخوادم...
echo ============================================

:: إيقاف Node.js
taskkill /F /IM node.exe >nul 2>&1
echo ✅ Node.js servers stopped

:: إيقاف Python
taskkill /F /IM python.exe >nul 2>&1
echo ✅ Python servers stopped

echo.
echo ✅ تم إيقاف جميع الخوادم
echo ============================================
pause
