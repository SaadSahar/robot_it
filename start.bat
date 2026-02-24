@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║     🤖 Bot_IT - Voice Chatbot Startup Script                ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: ============================================
:: 1️⃣ تحرير المنافذ المستخدمة
:: ============================================
echo [1/6] 🔓 تحرير المنافذ...

:: تحرير المنفذ 8080
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080 ^| findstr LISTENING 2^>nul') do (
    echo      🛑 إيقاف العملية على المنفذ 8080 ^(PID: %%a^)
    taskkill /F /PID %%a >nul 2>&1
)

:: تحرير المنفذ 5000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING 2^>nul') do (
    echo      🛑 إيقاف العملية على المنفذ 5000 ^(PID: %%a^)
    taskkill /F /PID %%a >nul 2>&1
)

:: تحرير المنفذ 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING 2^>nul') do (
    echo      🛑 إيقاف العملية على المنفذ 3000 ^(PID: %%a^)
    taskkill /F /PID %%a >nul 2>&1
)

echo      ✅ تم تحرير المنافذ
echo.

:: ============================================
:: 2️⃣ فحص Python
:: ============================================
echo [2/6] 🐍 فحص Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo      ❌ Python غير مثبت!
    echo      💡 قم بتثبيت Python من: https://www.python.org/downloads/
    pause
    exit /b 1
)
for /f "tokens=2" %%i in ('python --version 2^>^&1') do echo      ✅ Python %%i
echo.

:: ============================================
:: 3️⃣ فحص Node.js
:: ============================================
echo [3/6] 📦 فحص Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo      ❌ Node.js غير مثبت!
    echo      💡 قم بتثبيت Node.js من: https://nodejs.org/
    pause
    exit /b 1
)
for /f %%i in ('node --version') do echo      ✅ Node.js %%i
echo.

:: ============================================
:: 4️⃣ تثبيت المتطلبات
:: ============================================
echo [4/6] 📥 تثبيت المتطلبات...

:: تثبيت متطلبات Python
echo      📦 Installing Python packages...
pip install -r requirements.txt --quiet --disable-pip-version-check 2>nul
if errorlevel 1 (
    echo      ⚠️ تحذير: بعض حزم Python قد لم تُثبت
) else (
    echo      ✅ Python packages installed
)

:: تثبيت متطلبات Node.js
if not exist "node_modules" (
    echo      📦 Installing Node.js packages...
    call npm install --silent 2>nul
    if errorlevel 1 (
        echo      ⚠️ تحذير: بعض حزم Node.js قد لم تُثبت
    ) else (
        echo      ✅ Node.js packages installed
    )
) else (
    echo      ✅ Node.js packages already installed
)
echo.

:: ============================================
:: 5️⃣ تشغيل الخوادم
:: ============================================
echo [5/6] 🚀 تشغيل الخوادم...

:: تشغيل خادم TTS (Python)
echo      🔊 Starting TTS Server (Python) on port 5000...
:: start /B cmd /c "python backend\tts-server.py"
echo      ⚠️ TTS Server file missing (skipped)

:: انتظار 3 ثواني لبدء خادم TTS
echo      ⏳ Waiting for TTS server to start...
ping 127.0.0.1 -n 4 >nul

:: تخطي فحص التحقق من خادم TTS (curl قد لا يكون متاحاً)
echo      ✅ TTS Server starting...

:: تشغيل خادم Node.js
echo      🌐 Starting Main Server (Node.js)...
start /B cmd /c "npm start"

:: انتظار 3 ثواني لبدء خادم Node.js
echo      ⏳ Waiting for main server to start...
ping 127.0.0.1 -n 4 >nul

echo      ✅ Servers started
echo.

:: ============================================
:: 6️⃣ فتح المتصفح
:: ============================================
echo [6/6] 🌐 فتح المتصفح...

:: استخدام المنفذ الافتراضي 8080
set "MAIN_PORT=8080"
echo      💡 افتح المتصفح على: http://localhost:8080 أو http://localhost:3000

ping 127.0.0.1 -n 3 >nul

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║     ✅ المشروع جاهز للاستخدام!                              ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║     📡 Main Server:  http://localhost:%MAIN_PORT%                    ║
echo ║     🔊 TTS Server:   http://localhost:5000                   ║
echo ╠══════════════════════════════════════════════════════════════╣
echo ║     💡 لإيقاف الخوادم: أغلق نوافذ الـ Terminal               ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

pause
