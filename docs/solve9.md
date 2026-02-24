

📋 البرومبت الشامل للـ AI Agent
markdownDownloadCopy codeأنت AI Agent/مهندس Full-Stack. المشروع هو روبوت جامعي تقني:
- المايكروفون على الروبوت يرسل الصوت للابتوب
- الابتوب هو مركز المعالجة
- السماعة على الروبوت تخرج الصوت

## 🔴 المشكلة الحالية
Web Speech Synthesis API لا يعمل للعربية على جهاز المستخدم:
- لا توجد أصوات عربية مثبتة على Windows
- الصوت الإنجليزي لا يستطيع نطق العربية
- النتيجة: صمت تام عند محاولة النطق

## ✅ الحل المطلوب
استبدال Web Speech Synthesis بـ **Edge-TTS** (Python) لأنه:
- مجاني 100%
- جودة صوت عالية جداً
- يدعم العربية بشكل ممتاز
- لا يحتاج تثبيت أصوات على النظام
- لا يحتاج API Key

---

## 📁 هيكل المشروع بعد التعديل

bot_it/
├── backend/
│   ├── server.js                 # Node.js WebSocket Server
│   ├── config.js                 # الإعدادات
│   ├── gemini-text-handler.js    # Vertex AI
│   └── tts-server.py             # ✨ جديد: Python TTS Server
│
├── frontend/
│   ├── index.html
│   ├── app.js                    # ✨ معدّل: يستدعي TTS من Python
│   └── styles.css
│
├── requirements.txt              # ✨ جديد: متطلبات Python
├── start.bat                     # ✨ جديد: تشغيل الخادمين معاً
├── .env
└── package.json

---

## 🔧 التعديلات المطلوبة

### 1️⃣ إنشاء ملف `requirements.txt`

```txt
edge-tts==6.1.9
aiohttp==3.9.1
aiofiles==23.2.1

2️⃣ إنشاء ملف backend/tts-server.py
pythonDownloadCopy code#!/usr/bin/env python3
"""
🔊 خادم TTS باستخدام Edge-TTS
يوفر API بسيط لتحويل النص العربي إلى صوت MP3
"""

import asyncio
import edge_tts
from aiohttp import web
import base64
import io
import json
import os

# ============================================
# ⚙️ الإعدادات
# ============================================

# الأصوات العربية المتاحة في Edge-TTS
ARABIC_VOICES = {
    'ar-SA-HamedNeural': 'سعودي - حامد (ذكر)',
    'ar-SA-ZariyahNeural': 'سعودي - زارية (أنثى)',
    'ar-EG-SalmaNeural': 'مصري - سلمى (أنثى)',
    'ar-EG-ShakirNeural': 'مصري - شاكر (ذكر)',
    'ar-AE-FatimaNeural': 'إماراتي - فاطمة (أنثى)',
    'ar-AE-HamdanNeural': 'إماراتي - حمدان (ذكر)',
    'ar-KW-FahedNeural': 'كويتي - فهد (ذكر)',
    'ar-KW-NouraNeural': 'كويتي - نورة (أنثى)',
    'ar-QA-AmalNeural': 'قطري - أمل (أنثى)',
    'ar-QA-MoazNeural': 'قطري - معاذ (ذكر)',
}

# الصوت الافتراضي
DEFAULT_VOICE = os.getenv('TTS_VOICE', 'ar-SA-HamedNeural')
PORT = int(os.getenv('TTS_PORT', 5000))

# ============================================
# 🔊 دوال TTS
# ============================================

async def text_to_speech(text: str, voice: str = DEFAULT_VOICE) -> bytes:
    """
    تحويل النص إلى صوت MP3
    
    Args:
        text: النص المراد تحويله
        voice: اسم الصوت (من قائمة ARABIC_VOICES)
    
    Returns:
        bytes: ملف MP3 كـ bytes
    """
    communicate = edge_tts.Communicate(text, voice)
    
    # جمع الصوت في الذاكرة
    audio_data = io.BytesIO()
    
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data.write(chunk["data"])
    
    audio_data.seek(0)
    return audio_data.read()

async def text_to_speech_base64(text: str, voice: str = DEFAULT_VOICE) -> str:
    """
    تحويل النص إلى صوت Base64
    
    Returns:
        str: الصوت كـ Base64 string
    """
    audio_bytes = await text_to_speech(text, voice)
    return base64.b64encode(audio_bytes).decode('utf-8')

# ============================================
# 🌐 API Endpoints
# ============================================

async def handle_synthesize(request: web.Request) -> web.Response:
    """
    POST /synthesize
    
    Body: {
        "text": "النص المراد تحويله",
        "voice": "ar-SA-HamedNeural" (اختياري)
    }
    
    Response: {
        "success": true,
        "audio": "base64...",
        "format": "mp3"
    }
    """
    try:
        data = await request.json()
        text = data.get('text', '').strip()
        voice = data.get('voice', DEFAULT_VOICE)
        
        if not text:
            return web.json_response({
                'success': False,
                'error': 'النص فارغ'
            }, status=400)
        
        print(f'🔊 [TTS] تحويل النص: "{text[:50]}..."')
        print(f'🎤 [TTS] الصوت: {voice}')
        
        # تحويل النص إلى صوت
        audio_base64 = await text_to_speech_base64(text, voice)
        
        print(f'✅ [TTS] تم التحويل بنجاح ({len(audio_base64)} bytes)')
        
        return web.json_response({
            'success': True,
            'audio': audio_base64,
            'format': 'mp3',
            'voice': voice
        })
        
    except Exception as e:
        print(f'❌ [TTS] خطأ: {str(e)}')
        return web.json_response({
            'success': False,
            'error': str(e)
        }, status=500)

async def handle_synthesize_stream(request: web.Request) -> web.StreamResponse:
    """
    POST /synthesize/stream
    
    يرسل الصوت كـ stream (للملفات الكبيرة)
    """
    try:
        data = await request.json()
        text = data.get('text', '').strip()
        voice = data.get('voice', DEFAULT_VOICE)
        
        if not text:
            return web.json_response({'error': 'النص فارغ'}, status=400)
        
        # إعداد الاستجابة
        response = web.StreamResponse(
            status=200,
            headers={
                'Content-Type': 'audio/mpeg',
                'Content-Disposition': 'inline; filename="speech.mp3"'
            }
        )
        await response.prepare(request)
        
        # إرسال الصوت كـ stream
        communicate = edge_tts.Communicate(text, voice)
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                await response.write(chunk["data"])
        
        await response.write_eof()
        return response
        
    except Exception as e:
        return web.json_response({'error': str(e)}, status=500)

async def handle_voices(request: web.Request) -> web.Response:
    """
    GET /voices
    
    قائمة الأصوات العربية المتاحة
    """
    return web.json_response({
        'voices': ARABIC_VOICES,
        'default': DEFAULT_VOICE
    })

async def handle_health(request: web.Request) -> web.Response:
    """
    GET /health
    
    فحص حالة الخادم
    """
    return web.json_response({
        'status': 'ok',
        'service': 'Edge-TTS Server',
        'default_voice': DEFAULT_VOICE
    })

# ============================================
# 🔧 CORS Middleware
# ============================================

@web.middleware
async def cors_middleware(request: web.Request, handler):
    """إضافة CORS headers"""
    if request.method == 'OPTIONS':
        response = web.Response()
    else:
        response = await handler(request)
    
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    
    return response

# ============================================
# 🚀 تشغيل الخادم
# ============================================

def create_app() -> web.Application:
    """إنشاء التطبيق"""
    app = web.Application(middlewares=[cors_middleware])
    
    # تسجيل الـ routes
    app.router.add_get('/health', handle_health)
    app.router.add_get('/voices', handle_voices)
    app.router.add_post('/synthesize', handle_synthesize)
    app.router.add_post('/synthesize/stream', handle_synthesize_stream)
    
    # OPTIONS للـ CORS
    app.router.add_route('OPTIONS', '/synthesize', lambda r: web.Response())
    app.router.add_route('OPTIONS', '/synthesize/stream', lambda r: web.Response())
    
    return app

def main():
    """نقطة الدخول"""
    print('=' * 60)
    print('🔊 Edge-TTS Server للعربية')
    print('=' * 60)
    print(f'📡 Port: {PORT}')
    print(f'🎤 Default Voice: {DEFAULT_VOICE}')
    print(f'📋 Available Voices: {len(ARABIC_VOICES)}')
    print('=' * 60)
    print('🌐 Endpoints:')
    print(f'   GET  http://localhost:{PORT}/health')
    print(f'   GET  http://localhost:{PORT}/voices')
    print(f'   POST http://localhost:{PORT}/synthesize')
    print(f'   POST http://localhost:{PORT}/synthesize/stream')
    print('=' * 60)
    
    app = create_app()
    web.run_app(app, host='0.0.0.0', port=PORT, print=None)

if __name__ == '__main__':
    main()
3️⃣ تعديل frontend/app.js - قسم TTS
احذف جميع دوال Web Speech Synthesis القديمة واستبدلها بـ:
javascriptDownloadCopy code// ============================================
// 🔊 نظام TTS باستخدام Edge-TTS (Python Server)
// ============================================

const TTS_SERVER = 'http://localhost:5000';

// الأصوات العربية المتاحة
const ARABIC_VOICES = {
    'ar-SA-HamedNeural': 'سعودي - حامد (ذكر)',
    'ar-SA-ZariyahNeural': 'سعودي - زارية (أنثى)',
    'ar-EG-SalmaNeural': 'مصري - سلمى (أنثى)',
    'ar-EG-ShakirNeural': 'مصري - شاكر (ذكر)',
};

// الصوت الحالي
let currentVoice = 'ar-SA-HamedNeural';

// قائمة انتظار النطق
let speechQueue = [];
let isSpeaking = false;

/**
 * تحويل النص إلى صوت
 * @param {string} text - النص المراد نطقه
 * @param {string} voice - الصوت المستخدم (اختياري)
 */
async function speakText(text, voice = currentVoice) {
    if (!text || text.trim() === '') {
        console.warn('⚠️ [TTS] النص فارغ');
        return;
    }
    
    console.log(`🔊 [TTS] إضافة للقائمة: "${text.substring(0, 50)}..."`);
    
    // إضافة للقائمة
    speechQueue.push({ text, voice });
    
    // بدء النطق إذا لم يكن قيد التشغيل
    if (!isSpeaking) {
        processQueue();
    }
}

/**
 * معالجة قائمة الانتظار
 */
async function processQueue() {
    if (speechQueue.length === 0) {
        isSpeaking = false;
        updateStatus('ready', 'جاهز للاستماع');
        showVoiceIndicator(false);
        return;
    }
    
    isSpeaking = true;
    const { text, voice } = speechQueue.shift();
    
    try {
        updateStatus('speaking', 'جاري الرد الصوتي...');
        showVoiceIndicator(true);
        
        console.log(`🎤 [TTS] نطق: "${text.substring(0, 50)}..."`);
        console.log(`🎤 [TTS] الصوت: ${voice}`);
        
        // طلب التحويل من خادم Python
        const response = await fetch(`${TTS_SERVER}/synthesize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, voice })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'فشل التحويل');
        }
        
        // تشغيل الصوت
        await playAudioBase64(data.audio);
        
        console.log('✅ [TTS] انتهى النطق');
        
    } catch (error) {
        console.error('❌ [TTS] خطأ:', error.message);
        
        // تحقق من أن خادم Python يعمل
        if (error.message.includes('fetch') || error.message.includes('network')) {
            console.error('💡 [TTS] تأكد أن خادم Python يعمل: python backend/tts-server.py');
        }
    }
    
    // معالجة العنصر التالي
    processQueue();
}

/**
 * تشغيل صوت من Base64
 * @param {string} base64Audio - الصوت كـ Base64
 */
function playAudioBase64(base64Audio) {
    return new Promise((resolve, reject) => {
        const audio = new Audio();
        audio.src = `data:audio/mp3;base64,${base64Audio}`;
        
        audio.onended = () => {
            console.log('🔊 [TTS] انتهى تشغيل الصوت');
            resolve();
        };
        
        audio.onerror = (e) => {
            console.error('❌ [TTS] خطأ في تشغيل الصوت:', e);
            reject(e);
        };
        
        audio.play().catch(reject);
    });
}

/**
 * إيقاف النطق
 */
function stopSpeaking() {
    speechQueue = [];
    isSpeaking = false;
    // إيقاف أي صوت قيد التشغيل
    const audios = document.querySelectorAll('audio');
    audios.forEach(a => a.pause());
}

/**
 * تغيير الصوت
 * @param {string} voice - اسم الصوت
 */
function setVoice(voice) {
    if (ARABIC_VOICES[voice]) {
        currentVoice = voice;
        console.log(`🎤 [TTS] تم تغيير الصوت إلى: ${ARABIC_VOICES[voice]}`);
    }
}

/**
 * الحصول على قائمة الأصوات من الخادم
 */
async function getAvailableVoices() {
    try {
        const response = await fetch(`${TTS_SERVER}/voices`);
        const data = await response.json();
        console.log('📋 [TTS] الأصوات المتاحة:', data.voices);
        return data.voices;
    } catch (error) {
        console.error('❌ [TTS] خطأ في جلب الأصوات:', error);
        return ARABIC_VOICES;
    }
}

/**
 * فحص حالة خادم TTS
 */
async function checkTTSServer() {
    try {
        const response = await fetch(`${TTS_SERVER}/health`);
        const data = await response.json();
        console.log('✅ [TTS] خادم TTS يعمل:', data);
        return true;
    } catch (error) {
        console.error('❌ [TTS] خادم TTS لا يعمل!');
        console.log('💡 [TTS] شغّل الخادم: python backend/tts-server.py');
        return false;
    }
}

// ============================================
// 🧪 دوال الاختبار
// ============================================

window.testArabicTTS = async function() {
    const testText = 'مرحباً، هذا اختبار للنطق باللغة العربية. هل تسمعني؟';
    console.log('🧪 [TEST] اختبار النطق العربي:', testText);
    await speakText(testText);
};

window.testVoices = async function() {
    const voices = await getAvailableVoices();
    console.table(voices);
};

window.checkTTS = checkTTSServer;

// ============================================
// 🚀 التهيئة عند تحميل الصفحة
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔄 [TTS] فحص خادم TTS...');
    
    const isRunning = await checkTTSServer();
    
    if (isRunning) {
        console.log('✅ [TTS] خادم TTS جاهز');
        await getAvailableVoices();
    } else {
        console.warn('⚠️ [TTS] خادم TTS غير متاح');
        // إظهار تحذير للمستخدم
        showTTSWarning();
    }
});

/**
 * إظهار تحذير TTS
 */
function showTTSWarning() {
    const warning = document.createElement('div');
    warning.id = 'tts-warning';
    warning.innerHTML = `
        <div style="
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: #ff9800;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            z-index: 10000;
            text-align: center;
            direction: rtl;
        ">
            ⚠️ خادم الصوت غير متاح<br>
            <small>شغّل: <code>python backend/tts-server.py</code></small>
        </div>
    `;
    document.body.appendChild(warning);
    
    // إخفاء بعد 10 ثواني
    setTimeout(() => warning.remove(), 10000);
}
4️⃣ تعديل معالج الرسائل في app.js
javascriptDownloadCopy code// عند استلام رد من الخادم
function handleAssistantResponse(message) {
    if (message.type === 'assistant_text' || message.type === 'assistant_delta') {
        // عرض النص
        addMessageToChat('assistant', message.text);
        
        // ✅ نطق الرد تلقائياً باستخدام Edge-TTS
        speakText(message.text);
    }
    
    if (message.type === 'assistant_done') {
        console.log('✅ انتهى الرد');
    }
}

// في WebSocket handler
ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    
    switch (message.type) {
        case 'assistant_text':
        case 'assistant_delta':
            addMessageToChat('assistant', message.text);
            speakText(message.text); // ✅ نطق تلقائي
            break;
            
        case 'assistant_done':
            console.log('✅ [WS] انتهى الرد');
            break;
            
        case 'status':
            updateStatus(message.status, message.message);
            break;
            
        case 'wake_debug':
            console.log('🔍 [WS] Wake debug:', message);
            break;
            
        case 'error':
            console.error('❌ [WS] Error:', message.message);
            break;
    }
};
5️⃣ إنشاء ملف start.bat (Windows) لتشغيل الخادمين
batchDownloadCopy code@echo off
echo ============================================
echo 🤖 Bot_IT - Voice Chatbot Startup
echo ============================================

echo.
echo 📦 Installing Python dependencies...
pip install -r requirements.txt --quiet

echo.
echo 🔊 Starting TTS Server (Python)...
start "TTS Server" cmd /k "python backend/tts-server.py"

echo.
echo ⏳ Waiting for TTS server to start...
timeout /t 3 /nobreak > nul

echo.
echo 🚀 Starting Main Server (Node.js)...
start "Main Server" cmd /k "npm start"

echo.
echo ============================================
echo ✅ All servers started!
echo.
echo 📡 Main Server: http://localhost:8080
echo 🔊 TTS Server:  http://localhost:5000
echo ============================================
echo.
echo Press any key to open the browser...
pause > nul

start http://localhost:8080
6️⃣ إنشاء ملف start.sh (Linux/Mac)
bashDownloadCopy code#!/bin/bash

echo "============================================"
echo "🤖 Bot_IT - Voice Chatbot Startup"
echo "============================================"

echo ""
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt --quiet

echo ""
echo "🔊 Starting TTS Server (Python)..."
python backend/tts-server.py &
TTS_PID=$!

echo ""
echo "⏳ Waiting for TTS server to start..."
sleep 3

echo ""
echo "🚀 Starting Main Server (Node.js)..."
npm start &
NODE_PID=$!

echo ""
echo "============================================"
echo "✅ All servers started!"
echo ""
echo "📡 Main Server: http://localhost:8080"
echo "🔊 TTS Server:  http://localhost:5000"
echo "============================================"

# انتظار إيقاف
wait \$TTS_PID \$NODE_PID
7️⃣ تحديث index.html - لوحة التحكم
htmlDownloadCopy code<!-- أضف هذا في قسم Debug Panel -->
<div id="debug-panel" style="
    position: fixed;
    bottom: 10px;
    left: 10px;
    background: #f5f5f5;
    padding: 15px;
    border-radius: 8px;
    font-size: 12px;
    z-index: 1000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    direction: rtl;
">
    <strong>🔧 لوحة التحكم:</strong><br><br>
    
    <div style="margin-bottom: 10px;">
        <label>🎤 الصوت:</label>
        <select id="voice-select" onchange="setVoice(this.value)" style="padding: 5px;">
            <option value="ar-SA-HamedNeural">سعودي - حامد (ذكر)</option>
            <option value="ar-SA-ZariyahNeural">سعودي - زارية (أنثى)</option>
            <option value="ar-EG-SalmaNeural">مصري - سلمى (أنثى)</option>
            <option value="ar-EG-ShakirNeural">مصري - شاكر (ذكر)</option>
        </select>
    </div>
    
    <button onclick="testArabicTTS()" style="
        margin: 5px;
        padding: 8px 15px;
        cursor: pointer;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
    ">
        🧪 اختبار النطق
    </button>
    
    <button onclick="checkTTS()" style="
        margin: 5px;
        padding: 8px 15px;
        cursor: pointer;
        background: #2196F3;
        color: white;
        border: none;
        border-radius: 4px;
    ">
        🔍 فحص TTS
    </button>
    
    <button onclick="stopSpeaking()" style="
        margin: 5px;
        padding: 8px 15px;
        cursor: pointer;
        background: #f44336;
        color: white;
        border: none;
        border-radius: 4px;
    ">
        ⏹️ إيقاف
    </button>
    
    <div id="tts-status" style="margin-top: 10px; color: #666;"></div>
</div>

📊 بروتوكول الاتصال
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Frontend     │     │  Node.js Server │     │  Python TTS     │
│   (Browser)     │     │   (Port 8080)   │     │  (Port 5000)    │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │ WebSocket             │                       │
         │ final_transcript      │                       │
         ├──────────────────────>│                       │
         │                       │                       │
         │                       │ HTTP                  │
         │                       │ Vertex AI API         │
         │                       ├──────────────────────>│
         │                       │<──────────────────────│
         │                       │                       │
         │ WebSocket             │                       │
         │ assistant_text        │                       │
         │<──────────────────────│                       │
         │                       │                       │
         │ HTTP POST /synthesize │                       │
         ├───────────────────────┼──────────────────────>│
         │                       │                       │
         │ JSON { audio: base64 }│                       │
         │<──────────────────────┼───────────────────────│
         │                       │                       │
         │ 🔊 Play Audio         │                       │
         │                       │                       │


🚀 خطوات التشغيل
Windows:
batchDownloadCopy code# طريقة 1: استخدم ملف التشغيل
start.bat

# طريقة 2: يدوياً
# Terminal 1:
pip install -r requirements.txt
python backend/tts-server.py

# Terminal 2:
npm start
Linux/Mac:
bashDownloadCopy codechmod +x start.sh
./start.sh

✅ معايير القبول

1. 
 عند تشغيل start.bat:

خادم Python يعمل على port 5000
خادم Node.js يعمل على port 8080


2. 
 عند قول "روبوت ما هي لغة بايثون":

الرد النصي يظهر في الدردشة
الصوت العربي يُسمع بوضوح
جودة الصوت عالية


3. 
 في Console المتصفح:


✅ [TTS] خادم TTS يعمل: {status: 'ok', service: 'Edge-TTS Server'}
🔊 [TTS] إضافة للقائمة: "..."
🎤 [TTS] نطق: "..."
🎤 [TTS] الصوت: ar-SA-HamedNeural
✅ [TTS] انتهى النطق


1.  في Console خادم Python:

🔊 [TTS] تحويل النص: "..."
🎤 [TTS] الصوت: ar-SA-HamedNeural
✅ [TTS] تم التحويل بنجاح


🔧 استكشاف الأخطاء
إذا لم يعمل خادم Python:
bashDownloadCopy code# تأكد من تثبيت المتطلبات
pip install edge-tts aiohttp aiofiles

# شغّل يدوياً
python backend/tts-server.py
إذا ظهر خطأ CORS:

* تأكد أن cors_middleware موجود في tts-server.py

إذا لم يُسمع الصوت:

* افتح Console وانقر checkTTS() للتحقق من الخادم
* تأكد أن خادم Python يعمل


نفّذ هذه التعديلات وستحصل على صوت عربي عالي الجودة! 🎉

---

# Key Takeaways

- **Edge-TTS Advantages**: مكتبة مجانية تستخدم Microsoft Edge Neural Voices، توفر أصوات عربية عالية الجودة دون الحاجة لـ API key أو تثبيت أصوات على النظام.

- **Two-Server Architecture**: يتطلب الحل تشغيل خادمين: Node.js للتطبيق الرئيسي وPython للـ TTS، مع تواصل بينهما عبر HTTP REST API.

- **Multiple Arabic Voices**: يوفر Edge-TTS أصوات عربية متنوعة (سعودي، مصري، إماراتي، كويتي، قطري) بصيغة Neural عالية الجودة.

- **Queue System**: نظام طابور للنطق يضمن تشغيل الأصوات بالتتابع دون تداخل، مع معالجة الأخطاء والإيقاف.

- **Easy Startup**: ملف `start.bat` يُبسّط التشغيل بتثبيت المتطلبات وتشغيل الخادمين تلقائياً.