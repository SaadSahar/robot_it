
markdownDownloadCopy codeأنت AI Agent/مهندس Full-Stack. لديك مشروع روبوت جامعي تقني يواجه مشكلة في التشغيل.

## 🔴 المشكلة الحالية

خادم Node.js فشل في التشغيل بسبب:
Error: listen EADDRINUSE: address already in use :::8080

**السبب**: المنفذ 8080 مستخدم بالفعل من عملية أخرى.

---

## 🎯 المطلوب منك

1. **حل مشكلة المنفذ المستخدم** (EADDRINUSE)
2. **التأكد من تشغيل المشروع بنجاح**
3. **اختبار المشروع** والتأكد من:
   - خادم TTS يعمل (Python - Port 5000)
   - خادم WebSocket يعمل (Node.js)
   - الواجهة تفتح في المتصفح
   - النطق العربي يعمل
4. **إصلاح أي أخطاء تظهر**
5. **التوقف فقط عندما يعمل المشروع بالكامل**

---

## 📁 هيكل المشروع


bot_it/
├── backend/
│   ├── server.js                 # Node.js WebSocket Server
│   ├── config.js                 # الإعدادات
│   ├── gemini-text-handler.js    # Vertex AI
│   └── tts-server.py             # Python TTS Server (يعمل ✅)
│
├── frontend/
│   ├── index.html
│   ├── app.js
│   └── styles.css
│
├── requirements.txt
├── start.bat
├── .env
└── package.json

---

## 🔧 الخطوة 1: حل مشكلة المنفذ

### الطريقة A: إيقاف العملية التي تستخدم المنفذ (Windows)

أنشئ ملف `kill-port.bat`:

```batch
@echo off
echo ============================================
echo 🔍 البحث عن العمليات على المنفذ 8080...
echo ============================================

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8080 ^| findstr LISTENING') do (
    echo 🛑 إيقاف العملية PID: %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo ✅ تم تحرير المنفذ 8080
echo ============================================

الطريقة B: تعديل backend/server.js للتعامل مع المنفذ المستخدم
استبدل قسم تشغيل الخادم في نهاية الملف بـ:
javascriptDownloadCopy code// ============================================
// 🚀 تشغيل الخادم مع معالجة المنفذ المستخدم
// ============================================

const DEFAULT_PORT = process.env.PORT || 8080;
let currentPort = DEFAULT_PORT;

function startServer(port) {
    const server = app.listen(port, () => {
        console.log('============================================================');
        console.log('🤖 Voice Chatbot Server Started');
        console.log('============================================================');
        console.log(`📡 Server running at: http://localhost:${port}`);
        console.log(`🔌 WebSocket endpoint: ws://localhost:${port}`);
        console.log(`🧠 Model: ${config.model}`);
        console.log(`🎤 Wake word: "${config.wakeWord}"`);
        console.log(`📊 Debug mode: ${config.debug}`);
        console.log('============================================================');
    });

    // إعداد WebSocket
    const wss = new WebSocket.Server({ server });
    
    wss.on('connection', handleConnection);

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`⚠️ المنفذ ${port} مستخدم، جاري المحاولة على المنفذ ${port + 1}...`);
            currentPort = port + 1;
            
            if (currentPort > DEFAULT_PORT + 10) {
                console.error('❌ فشل العثور على منفذ متاح!');
                console.log('💡 الحل: شغّل kill-port.bat أو أغلق البرامج التي تستخدم المنافذ');
                process.exit(1);
            }
            
            startServer(currentPort);
        } else {
            console.error('❌ خطأ في الخادم:', err);
            process.exit(1);
        }
    });
    
    return server;
}

// بدء التشغيل
startServer(DEFAULT_PORT);
الطريقة C: تغيير المنفذ في .env
envDownloadCopy codePORT=3000
# أو أي منفذ آخر متاح مثل: 3001, 5001, 9000

🔧 الخطوة 2: تحديث start.bat الشامل
استبدل محتوى start.bat بالكامل:
batchDownloadCopy code@echo off
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
start "TTS-Server" /min cmd /c "python backend\tts-server.py"

:: انتظار 3 ثواني لبدء خادم TTS
echo      ⏳ Waiting for TTS server to start...
timeout /t 3 /nobreak >nul

:: التحقق من تشغيل خادم TTS
curl -s http://localhost:5000/health >nul 2>&1
if errorlevel 1 (
    echo      ⚠️ TTS Server may not be running yet, continuing...
) else (
    echo      ✅ TTS Server is running
)

:: تشغيل خادم Node.js
echo      🌐 Starting Main Server (Node.js)...
start "Node-Server" /min cmd /c "npm start"

:: انتظار 3 ثواني لبدء خادم Node.js
echo      ⏳ Waiting for main server to start...
timeout /t 3 /nobreak >nul

echo      ✅ Servers started
echo.

:: ============================================
:: 6️⃣ فتح المتصفح
:: ============================================
echo [6/6] 🌐 فتح المتصفح...

:: تحديد المنفذ الصحيح
set "MAIN_PORT=8080"
curl -s http://localhost:8080 >nul 2>&1
if errorlevel 1 (
    set "MAIN_PORT=3000"
    curl -s http://localhost:3000 >nul 2>&1
    if errorlevel 1 (
        echo      ⚠️ الخادم الرئيسي قد لا يكون جاهزاً بعد
        echo      💡 جرب فتح: http://localhost:8080 أو http://localhost:3000
    )
)

timeout /t 2 /nobreak >nul
start http://localhost:%MAIN_PORT%

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

🔧 الخطوة 3: إنشاء ملف stop.bat لإيقاف الخوادم
batchDownloadCopy code@echo off
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

🔧 الخطوة 4: تحديث backend/config.js
تأكد أن المنفذ قابل للتغيير:
javascriptDownloadCopy code// backend/config.js
require('dotenv').config();

const config = {
    // المنفذ - يمكن تغييره من .env
    port: parseInt(process.env.PORT) || 8080,
    
    // باقي الإعدادات...
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
    wakeWord: process.env.WAKE_WORD || 'روبوت',
    debug: process.env.DEBUG_MODE === 'true',
    
    // إعدادات TTS
    ttsServer: process.env.TTS_SERVER || 'http://localhost:5000',
    
    // Google Cloud
    apiKey: process.env.GOOGLE_CLOUD_API_KEY,
};

// التحقق من الإعدادات
function validateConfig() {
    if (!config.apiKey) {
        console.error('❌ GOOGLE_CLOUD_API_KEY غير موجود في .env');
        process.exit(1);
    }
    console.log('✓ Configuration validated');
    console.log(`🧠 Model: ${config.model} (REST API)`);
    console.log(`🎤 Wake word: "${config.wakeWord}"`);
    console.log(`📊 Debug mode: ${config.debug}`);
}

validateConfig();

module.exports = config;

🔧 الخطوة 5: تحديث backend/server.js الكامل
javascriptDownloadCopy code// backend/server.js
const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const config = require('./config');
const { generateResponse } = require('./gemini-text-handler');

const app = express();

// Serve static files
app.use(express.static(path.join(__dirname, '../frontend')));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        service: 'Voice Chatbot Server',
        port: currentPort 
    });
});

// ============================================
// 🔧 Wake Word Detection
// ============================================
function checkWakeWord(text) {
    const cleanText = text.trim().toLowerCase();
    const wakeWord = config.wakeWord.toLowerCase();
    
    if (cleanText.startsWith(wakeWord)) {
        return {
            wake: true,
            cleanText: text.trim().substring(config.wakeWord.length).trim(),
            reason: `تم كشف كلمة "${config.wakeWord}"`,
            rawText: text
        };
    }
    
    return {
        wake: false,
        cleanText: text,
        reason: 'لم يتم العثور على كلمة التنبيه',
        rawText: text
    };
}

// ============================================
// 🔌 WebSocket Connection Handler
// ============================================
function handleConnection(ws) {
    const sessionId = Math.random().toString(36).substring(2, 15);
    console.log(`✓ New client connected: ${sessionId}`);

    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data.toString());
            
            if (config.debug) {
                console.log(`📥 [SERVER] Message type: ${message.type}`, JSON.stringify(message, null, 2));
            }

            if (message.type === 'final_transcript') {
                const text = message.text;
                console.log(`📝 [SERVER] Final transcript received: "${text}"`);
                
                // Check wake word
                const wakeResult = checkWakeWord(text);
                console.log(`🔍 [SERVER] Wake word check:`, JSON.stringify(wakeResult, null, 2));
                
                // Send wake debug info
                ws.send(JSON.stringify({
                    type: 'wake_debug',
                    ...wakeResult
                }));

                if (wakeResult.wake) {
                    // Send thinking status
                    ws.send(JSON.stringify({
                        type: 'status',
                        status: 'thinking',
                        message: 'جاري المعالجة...'
                    }));

                    try {
                        // Generate response
                        console.log(`📤 [SERVER] Sending to Gemini: ${wakeResult.cleanText}`);
                        const response = await generateResponse(wakeResult.cleanText);
                        console.log(`📥 [SERVER] Gemini response: ${response}`);

                        // Send response
                        ws.send(JSON.stringify({
                            type: 'assistant_text',
                            text: response
                        }));

                        // Send done
                        ws.send(JSON.stringify({
                            type: 'assistant_done',
                            text: response
                        }));

                    } catch (error) {
                        console.error(`❌ [SERVER] Error:`, error.message);
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: error.message
                        }));
                    }
                }

                // Send ready status
                ws.send(JSON.stringify({
                    type: 'status',
                    status: 'ready',
                    message: 'جاهز للاستماع'
                }));
            }
        } catch (error) {
            console.error(`❌ [SERVER] Parse error:`, error.message);
        }
    });

    ws.on('close', () => {
        console.log(`✓ Client disconnected: ${sessionId}`);
    });

    ws.on('error', (error) => {
        console.error(`❌ [SERVER] WebSocket error:`, error.message);
    });

    // Send initial ready status
    ws.send(JSON.stringify({
        type: 'status',
        status: 'ready',
        message: 'متصل وجاهز'
    }));
}

// ============================================
// 🚀 Server Startup with Port Handling
// ============================================
const DEFAULT_PORT = config.port;
let currentPort = DEFAULT_PORT;
let server = null;
let wss = null;

function startServer(port) {
    server = app.listen(port);
    
    server.on('listening', () => {
        currentPort = port;
        
        // إعداد WebSocket
        wss = new WebSocket.Server({ server });
        wss.on('connection', handleConnection);
        
        console.log('============================================================');
        console.log('🤖 Voice Chatbot Server Started');
        console.log('============================================================');
        console.log(`📡 Server running at: http://localhost:${port}`);
        console.log(`🔌 WebSocket endpoint: ws://localhost:${port}`);
        console.log(`🧠 Model: ${config.model}`);
        console.log(`🎤 Wake word: "${config.wakeWord}"`);
        console.log(`🔊 TTS Server: ${config.ttsServer}`);
        console.log(`📊 Debug mode: ${config.debug}`);
        console.log('============================================================');
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`⚠️ المنفذ ${port} مستخدم، جاري المحاولة على المنفذ ${port + 1}...`);
            
            if (port > DEFAULT_PORT + 10) {
                console.error('❌ فشل العثور على منفذ متاح!');
                console.log('💡 الحل: شغّل الأمر التالي لتحرير المنفذ:');
                console.log('   Windows: netstat -ano | findstr :8080');
                console.log('            taskkill /F /PID <PID>');
                process.exit(1);
            }
            
            // محاولة المنفذ التالي
            startServer(port + 1);
        } else {
            console.error('❌ خطأ في الخادم:', err.message);
            process.exit(1);
        }
    });
}

// بدء التشغيل
startServer(DEFAULT_PORT);

// معالجة إيقاف التطبيق
process.on('SIGINT', () => {
    console.log('\n🛑 إيقاف الخادم...');
    if (wss) wss.close();
    if (server) server.close();
    process.exit(0);
});

🔧 الخطوة 6: تحديث frontend/app.js - TTS_SERVER URL ديناميكي
في بداية الملف:
javascriptDownloadCopy code// ============================================
// ⚙️ الإعدادات
// ============================================

// تحديد URLs تلقائياً
const HOSTNAME = window.location.hostname || 'localhost';
const WS_PORT = window.location.port || '8080';
const TTS_PORT = '5000';

const WS_URL = `ws://${HOSTNAME}:${WS_PORT}`;
const TTS_SERVER = `http://${HOSTNAME}:${TTS_PORT}`;

console.log('🔧 [CONFIG] WebSocket URL:', WS_URL);
console.log('🔧 [CONFIG] TTS Server URL:', TTS_SERVER);

✅ معايير القبول والاختبار
اختبر الخطوات التالية بالترتيب:
1️⃣ تحرير المنافذ:
batchDownloadCopy code:: في Terminal جديد
netstat -ano | findstr :8080
netstat -ano | findstr :5000
:: إذا وجدت عمليات، أوقفها:
taskkill /F /PID <رقم_العملية>
2️⃣ تشغيل المشروع:
batchDownloadCopy codecd bot_it
start.bat
3️⃣ التحقق من الخوادم:

* افتح http://localhost:5000/health ← يجب أن ترى {"status":"ok"}
* افتح http://localhost:8080 ← يجب أن تفتح الواجهة

4️⃣ اختبار النطق:

* افتح Console (F12)
* اكتب: testArabicTTS()
* يجب أن تسمع: "مرحباً، هذا اختبار للنطق باللغة العربية"

5️⃣ اختبار الروبوت الكامل:

* قل: "روبوت ما هي لغة بايثون"
* يجب أن:

يظهر النص في الدردشة
يُسمع الرد بالعربية




🔍 إذا استمرت المشكلة
تحقق من هذه النقاط:
javascriptDownloadCopy code// في Console المتصفح
checkTTS()  // هل خادم TTS يعمل؟
testArabicTTS()  // هل النطق يعمل؟
سجلات الخطأ المتوقعة:
✅ [TTS] خادم TTS يعمل: {status: 'ok'}
✅ خادم TTS جاهز

إذا ظهر خطأ:
❌ [TTS] خادم TTS لا يعمل!
💡 [TTS] شغّل الخادم: python backend/tts-server.py


📋 ملخص الأوامر
batchDownloadCopy code:: إيقاف كل شيء
stop.bat

:: تشغيل كل شيء
start.bat

:: أو يدوياً:
:: Terminal 1:
python backend/tts-server.py

:: Terminal 2:
npm start

🎯 الهدف النهائي:
عندما تشغّل start.bat:

1. ✅ تُحرر المنافذ تلقائياً
2. ✅ يعمل خادم TTS على 5000
3. ✅ يعمل خادم Node.js على 8080 (أو منفذ بديل)
4. ✅ يفتح المتصفح تلقائياً
5. ✅ النطق العربي يعمل بشكل صحيح

توقف عن العمل فقط عندما يعمل كل شيء بنجاح!

---

## Key Takeaways

- **Port Conflict Solution**: المشكلة الرئيسية هي أن المنفذ 8080 مستخدم من عملية أخرى. الحل يتضمن تحرير المنفذ تلقائياً أو استخدام منفذ بديل.

- **Auto Port Selection**: تم تعديل server.js للبحث تلقائياً عن منفذ متاح إذا كان المنفذ الافتراضي مشغولاً.

- **Improved start.bat**: السكربت الجديد يحرر المنافذ أولاً، ثم يشغل الخوادم، ويتحقق من عملها قبل فتح المتصفح.

- **Stop Script**: ملف stop.bat جديد لإيقاف جميع الخوادم بسهولة.

- **Testing Checklist**: معايير قبول واضحة للتحقق من نجاح التشغيل.