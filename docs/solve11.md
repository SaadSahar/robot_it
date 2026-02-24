
أنت AI Agent/مهندس Full-Stack. لديك مشروع روبوت جامعي تقني يواجه مشكلتين:

## 🔴 المشاكل الحالية

### المشكلة 1: فشل الاتصال بـ Vertex AI
❌ [GEMINI-STREAM] Error: socket hang up
❌ [SERVER] Error: فشل الاتصال بـ Vertex AI API: socket hang up

**السبب المحتمل**:
- مفتاح API غير صالح لـ Vertex AI Express Mode
- أو النموذج `gemini-2.5-flash-lite` غير متاح في منطقتك
- أو timeout في الاتصال

### المشكلة 2: الصوت لا يعمل
- خادم Edge-TTS يعمل ✅
- لكن لا يوجد رد من Gemini لنطقه ❌

---

## 🎯 المطلوب

1. **إصلاح الاتصال بـ Gemini API** باستخدام Google AI Studio API (الأسهل والأضمن)
2. **التأكد من وصول الرد وتشغيل الصوت تلقائياً**
3. **اختبار المشروع بالكامل** والتأكد من عمله

---

## 📁 هيكل المشروع


bot_it/
├── backend/
│   ├── server.js                 # خادم WebSocket
│   ├── config.js                 # الإعدادات
│   ├── gemini-text-handler.js    # ✨ يحتاج تعديل جذري
│   └── tts-server.py             # خادم TTS (يعمل ✅)
│
├── frontend/
│   ├── index.html
│   ├── app.js                    # ✨ التأكد من استدعاء TTS
│   └── styles.css
│
├── .env                          # ✨ تحديث الإعدادات
└── package.json

---

## 🔧 الحل الكامل والمفصل

### الخطوة 1️⃣: تحديث ملف `.env`

**استبدل** محتوى `.env` بالكامل:

```env
# ============================================
# 🔑 Google AI Studio API Key
# ============================================
# احصل على مفتاح مجاني من: https://aistudio.google.com/apikey
GOOGLE_API_KEY=ضع_مفتاح_API_هنا

# ============================================
# 🤖 إعدادات النموذج
# ============================================
# النماذج المتاحة:
# - gemini-2.0-flash (الأسرع والأفضل)
# - gemini-1.5-flash (مستقر)
# - gemini-1.5-pro (الأقوى)
GEMINI_MODEL=gemini-2.0-flash

# ============================================
# 🎤 إعدادات الروبوت
# ============================================
WAKE_WORD=روبوت
PORT=8080
DEBUG_MODE=true

# ============================================
# 🔊 إعدادات TTS
# ============================================
TTS_PORT=5000
TTS_VOICE=ar-SA-HamedNeural

الخطوة 2️⃣: إنشاء ملف backend/gemini-handler-new.js (الحل الجديد)
أنشئ ملف جديد backend/gemini-handler-new.js:
javascriptDownloadCopy code/**
 * 🤖 Gemini API Handler - Google AI Studio
 * 
 * يستخدم Google AI Studio API (Generative Language API)
 * وليس Vertex AI - لأنه أسهل وأضمن في العمل
 * 
 * المستندات: https://ai.google.dev/gemini-api/docs
 */

const axios = require('axios');

// ============================================
// ⚙️ الإعدادات
// ============================================

const API_KEY = process.env.GOOGLE_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const DEBUG = process.env.DEBUG_MODE === 'true';

// Base URL لـ Google AI Studio API
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// تعليمات النظام للروبوت
const SYSTEM_INSTRUCTION = `أنت روبوت مساعد متخصص في علوم الحاسب وهندسة المعلوماتية.

📋 قواعدك:
1. أجب فقط على الأسئلة المتعلقة بـ:
   - البرمجة ولغاتها (Python, JavaScript, Java, C++, إلخ)
   - قواعد البيانات (SQL, NoSQL, MySQL, MongoDB, إلخ)
   - الشبكات والإنترنت
   - أنظمة التشغيل (Windows, Linux, macOS)
   - الذكاء الاصطناعي وتعلم الآلة
   - تطوير الويب والتطبيقات
   - الأمن السيبراني
   - هياكل البيانات والخوارزميات

2. إذا كان السؤال خارج نطاق التقنية:
   - اعتذر بلطف
   - اذكر أنك متخصص في علوم الحاسب فقط
   - اقترح أن يسأل سؤالاً تقنياً

3. أسلوب الإجابة:
   - إجابات مختصرة وواضحة (2-4 جمل)
   - استخدم اللغة العربية الفصحى البسيطة
   - تجنب الإجابات الطويلة جداً لأنها ستُنطق صوتياً

4. أنت روبوت في جامعة، فكن:
   - ودوداً ومحترماً
   - مفيداً وعملياً
   - دقيقاً في المعلومات`;

// ============================================
// 🔧 دالة التحقق من الإعدادات
// ============================================

function validateConfig() {
    if (!API_KEY) {
        console.error('❌ [GEMINI] GOOGLE_API_KEY غير موجود في ملف .env');
        console.log('💡 [GEMINI] احصل على مفتاح مجاني من: https://aistudio.google.com/apikey');
        return false;
    }
    
    if (DEBUG) {
        console.log('✅ [GEMINI] API Key موجود');
        console.log(`🤖 [GEMINI] النموذج: ${MODEL}`);
    }
    
    return true;
}

// ============================================
// 🚀 دالة توليد الرد (بدون Streaming)
// ============================================

async function generateResponse(userMessage) {
    if (!validateConfig()) {
        throw new Error('إعدادات Gemini غير صحيحة');
    }
    
    const url = `${BASE_URL}/models/${MODEL}:generateContent?key=${API_KEY}`;
    
    if (DEBUG) {
        console.log(`📤 [GEMINI] URL: ${url.replace(API_KEY, 'API_KEY_HIDDEN')}`);
        console.log(`📤 [GEMINI] السؤال: ${userMessage}`);
    }
    
    try {
        const response = await axios.post(url, {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: userMessage }]
                }
            ],
            systemInstruction: {
                parts: [{ text: SYSTEM_INSTRUCTION }]
            },
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 500,  // قصير للنطق الصوتي
            },
            safetySettings: [
                {
                    category: 'HARM_CATEGORY_HARASSMENT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_HATE_SPEECH',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                }
            ]
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 30000  // 30 ثانية timeout
        });
        
        // استخراج النص من الرد
        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text) {
            console.error('❌ [GEMINI] لا يوجد نص في الرد:', JSON.stringify(response.data, null, 2));
            throw new Error('لم يتم استلام رد من النموذج');
        }
        
        if (DEBUG) {
            console.log(`📥 [GEMINI] الرد: ${text}`);
        }
        
        return text;
        
    } catch (error) {
        // معالجة الأخطاء بالتفصيل
        if (error.response) {
            // الخادم رد بخطأ
            const status = error.response.status;
            const data = error.response.data;
            
            console.error(`❌ [GEMINI] خطأ HTTP ${status}:`, JSON.stringify(data, null, 2));
            
            if (status === 400) {
                throw new Error('طلب غير صالح - تحقق من صيغة الرسالة');
            } else if (status === 401 || status === 403) {
                throw new Error('مفتاح API غير صالح - تحقق من GOOGLE_API_KEY');
            } else if (status === 404) {
                throw new Error(`النموذج ${MODEL} غير موجود - جرب gemini-1.5-flash`);
            } else if (status === 429) {
                throw new Error('تجاوزت حد الطلبات - انتظر قليلاً');
            } else if (status === 500 || status === 503) {
                throw new Error('خطأ في خادم Google - حاول مرة أخرى');
            } else {
                throw new Error(`خطأ غير متوقع: ${status}`);
            }
        } else if (error.code === 'ECONNABORTED') {
            console.error('❌ [GEMINI] انتهت مهلة الاتصال');
            throw new Error('انتهت مهلة الاتصال - تحقق من الإنترنت');
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            console.error('❌ [GEMINI] فشل الاتصال بالخادم');
            throw new Error('فشل الاتصال - تحقق من الإنترنت');
        } else {
            console.error('❌ [GEMINI] خطأ:', error.message);
            throw new Error(`خطأ: ${error.message}`);
        }
    }
}

// ============================================
// 🚀 دالة توليد الرد مع Streaming
// ============================================

async function generateResponseStream(userMessage, onChunk, onDone, onError) {
    if (!validateConfig()) {
        onError(new Error('إعدادات Gemini غير صحيحة'));
        return;
    }
    
    // استخدام streamGenerateContent
    const url = `${BASE_URL}/models/${MODEL}:streamGenerateContent?key=${API_KEY}&alt=sse`;
    
    if (DEBUG) {
        console.log(`📤 [GEMINI-STREAM] URL: ${url.replace(API_KEY, 'API_KEY_HIDDEN')}`);
        console.log(`📤 [GEMINI-STREAM] السؤال: ${userMessage}`);
    }
    
    try {
        const response = await axios({
            method: 'POST',
            url: url,
            data: {
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: userMessage }]
                    }
                ],
                systemInstruction: {
                    parts: [{ text: SYSTEM_INSTRUCTION }]
                },
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 500,
                }
            },
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream'
            },
            responseType: 'stream',
            timeout: 60000  // 60 ثانية للـ streaming
        });
        
        let fullText = '';
        let buffer = '';
        
        response.data.on('data', (chunk) => {
            buffer += chunk.toString();
            
            // معالجة SSE events
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';  // احتفظ بالسطر غير المكتمل
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.slice(6).trim();
                    
                    if (jsonStr === '[DONE]') {
                        continue;
                    }
                    
                    try {
                        const data = JSON.parse(jsonStr);
                        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                        
                        if (text) {
                            fullText += text;
                            
                            if (DEBUG) {
                                console.log(`📥 [GEMINI-STREAM] Chunk: "${text}"`);
                            }
                            
                            onChunk(text);
                        }
                    } catch (e) {
                        // تجاهل JSON غير صالح
                        if (DEBUG) {
                            console.log(`⚠️ [GEMINI-STREAM] Skip invalid JSON`);
                        }
                    }
                }
            }
        });
        
        response.data.on('end', () => {
            if (DEBUG) {
                console.log(`✅ [GEMINI-STREAM] اكتمل الرد: "${fullText}"`);
            }
            onDone(fullText);
        });
        
        response.data.on('error', (err) => {
            console.error(`❌ [GEMINI-STREAM] خطأ في Stream:`, err.message);
            onError(err);
        });
        
    } catch (error) {
        console.error(`❌ [GEMINI-STREAM] خطأ:`, error.message);
        
        // fallback إلى الطريقة العادية
        console.log(`🔄 [GEMINI-STREAM] جاري المحاولة بدون streaming...`);
        
        try {
            const text = await generateResponse(userMessage);
            onChunk(text);
            onDone(text);
        } catch (fallbackError) {
            onError(fallbackError);
        }
    }
}

// ============================================
// 🧪 دالة اختبار الاتصال
// ============================================

async function testConnection() {
    console.log('🧪 [GEMINI] اختبار الاتصال...');
    
    try {
        const response = await generateResponse('قل مرحبا');
        console.log('✅ [GEMINI] الاتصال ناجح!');
        console.log(`📥 [GEMINI] الرد: ${response}`);
        return true;
    } catch (error) {
        console.error('❌ [GEMINI] فشل الاختبار:', error.message);
        return false;
    }
}

// ============================================
// 📤 التصدير
// ============================================

module.exports = {
    generateResponse,
    generateResponseStream,
    testConnection,
    validateConfig
};
الخطوة 3️⃣: تحديث backend/server.js
استبدل قسم imports والـ handler في بداية الملف:
javascriptDownloadCopy code// ============================================
// 📦 Imports
// ============================================

const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const config = require('./config');

// ✨ استخدم الـ handler الجديد
const { generateResponse, generateResponseStream, testConnection } = require('./gemini-handler-new');

// ============================================
// 🔧 Express Setup
// ============================================

const app = express();
app.use(express.static(path.join(__dirname, '../frontend')));
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', port: currentPort });
});

// اختبار Gemini
app.get('/test-gemini', async (req, res) => {
    try {
        const result = await testConnection();
        res.json({ success: result });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// ============================================
// 🔧 Wake Word Detection
// ============================================

function checkWakeWord(text) {
    const cleanText = text.trim();
    const wakeWord = config.wakeWord || 'روبوت';
    
    // تحقق من وجود كلمة التنبيه في البداية
    const variants = [wakeWord, wakeWord + ':', wakeWord + '،', wakeWord + ' '];
    
    for (const variant of variants) {
        if (cleanText.startsWith(variant) || cleanText.toLowerCase().startsWith(variant.toLowerCase())) {
            return {
                wake: true,
                cleanText: cleanText.substring(variant.length).trim(),
                reason: `تم كشف كلمة "${wakeWord}"`,
                rawText: text
            };
        }
    }
    
    // تحقق بدون الـ prefix
    if (cleanText.startsWith(wakeWord)) {
        return {
            wake: true,
            cleanText: cleanText.substring(wakeWord.length).trim(),
            reason: `تم كشف كلمة "${wakeWord}"`,
            rawText: text
        };
    }
    
    return {
        wake: false,
        cleanText: text,
        reason: `لم يتم العثور على كلمة "${wakeWord}"`,
        rawText: text
    };
}

// ============================================
// 🔌 WebSocket Handler
// ============================================

function handleConnection(ws) {
    const sessionId = Math.random().toString(36).substring(2, 15);
    console.log(`✓ New client connected`);
    console.log(`✓ Session created: ${sessionId}`);
    
    // إرسال حالة الاتصال
    ws.send(JSON.stringify({
        type: 'status',
        status: 'ready',
        message: 'اضغط على الزر وقل: روبوت ثم سؤالك'
    }));
    
    ws.on('message', async (data) => {
        try {
            const message = JSON.parse(data.toString());
            
            if (config.debug) {
                console.log(`📥 [SERVER] Message type: ${message.type}`, JSON.stringify(message, null, 2));
            }
            
            // معالجة النص النهائي
            if (message.type === 'final_transcript') {
                const text = message.text;
                console.log(`📝 [SERVER] Final transcript received: "${text}"`);
                
                // التحقق من كلمة التنبيه
                const wakeResult = checkWakeWord(text);
                console.log(`🔍 [SERVER] Wake word check:`, JSON.stringify(wakeResult, null, 2));
                
                // إرسال معلومات التصحيح
                ws.send(JSON.stringify({
                    type: 'wake_debug',
                    ...wakeResult
                }));
                
                if (wakeResult.wake && wakeResult.cleanText) {
                    // إرسال حالة "جاري التفكير"
                    ws.send(JSON.stringify({
                        type: 'status',
                        status: 'thinking',
                        message: 'جاري المعالجة...'
                    }));
                    
                    console.log(`📤 [SERVER] Sending to Gemini: ${wakeResult.cleanText}`);
                    
                    try {
                        // ✨ استخدام الـ handler الجديد مع Streaming
                        let fullResponse = '';
                        
                        await new Promise((resolve, reject) => {
                            generateResponseStream(
                                wakeResult.cleanText,
                                // onChunk - عند استلام جزء
                                (chunk) => {
                                    fullResponse += chunk;
                                    
                                    // إرسال الجزء للعميل
                                    ws.send(JSON.stringify({
                                        type: 'assistant_delta',
                                        text: chunk
                                    }));
                                },
                                // onDone - عند الانتهاء
                                (finalText) => {
                                    console.log(`✅ [SERVER] Response complete: "${finalText.substring(0, 50)}..."`);
                                    
                                    // إرسال الرد الكامل
                                    ws.send(JSON.stringify({
                                        type: 'assistant_text',
                                        text: finalText
                                    }));
                                    
                                    // إرسال إشارة الانتهاء
                                    ws.send(JSON.stringify({
                                        type: 'assistant_done',
                                        text: finalText
                                    }));
                                    
                                    resolve();
                                },
                                // onError - عند حدوث خطأ
                                (error) => {
                                    console.error(`❌ [SERVER] Gemini error:`, error.message);
                                    reject(error);
                                }
                            );
                        });
                        
                    } catch (error) {
                        console.error(`❌ [SERVER] Error:`, error.message);
                        
                        ws.send(JSON.stringify({
                            type: 'status',
                            status: 'error',
                            message: error.message
                        }));
                        
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: error.message
                        }));
                    }
                } else if (wakeResult.wake && !wakeResult.cleanText) {
                    // كلمة التنبيه موجودة لكن بدون سؤال
                    ws.send(JSON.stringify({
                        type: 'status',
                        status: 'waiting',
                        message: 'سمعتك! ما هو سؤالك؟'
                    }));
                }
                
                // إرسال حالة "جاهز"
                ws.send(JSON.stringify({
                    type: 'status',
                    status: 'ready',
                    message: 'اضغط على الزر وقل: روبوت ثم سؤالك'
                }));
            }
            
        } catch (error) {
            console.error(`❌ [SERVER] Parse error:`, error.message);
        }
    });
    
    ws.on('close', () => {
        console.log(`✗ Client disconnected`);
        console.log(`✓ Session removed: ${sessionId}`);
    });
    
    ws.on('error', (error) => {
        console.error(`❌ [SERVER] WebSocket error:`, error.message);
    });
}

// ============================================
// 🚀 Server Startup
// ============================================

const DEFAULT_PORT = parseInt(process.env.PORT) || 8080;
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
        console.log(`🧠 Model: ${process.env.GEMINI_MODEL || 'gemini-2.0-flash'}`);
        console.log(`🎤 Wake word: "${config.wakeWord || 'روبوت'}"`);
        console.log(`📊 Debug mode: ${config.debug}`);
        console.log('============================================================');
        
        // اختبار الاتصال بـ Gemini
        console.log('🧪 Testing Gemini connection...');
        testConnection().then(success => {
            if (success) {
                console.log('✅ Gemini connection OK!');
            } else {
                console.log('⚠️ Gemini connection failed - check API key');
            }
        });
    });
    
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`⚠️ Port ${port} in use, trying ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error('❌ Server error:', err.message);
            process.exit(1);
        }
    });
}

// بدء التشغيل
startServer(DEFAULT_PORT);

// معالجة الإيقاف
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    if (wss) wss.close();
    if (server) server.close();
    process.exit(0);
});
الخطوة 4️⃣: تحديث frontend/app.js - التأكد من تشغيل الصوت
تأكد من وجود هذا الكود في دالة معالجة الرسائل:
javascriptDownloadCopy code// ============================================
// 📥 معالجة رسائل WebSocket
// ============================================

ws.onmessage = (event) => {
    const message = JSON.parse(event.data);
    
    if (DEBUG) {
        console.log(`📥 [FRONTEND] Received message type: ${message.type}`, JSON.stringify(message));
    }
    
    switch (message.type) {
        case 'status':
            console.log(`📊 [FRONTEND] Status update: ${message.status} - ${message.message}`);
            updateStatus(message.status, message.message);
            break;
            
        case 'wake_debug':
            console.log(`🔍 [FRONTEND] Wake word debug:`, JSON.stringify(message));
            break;
            
        case 'assistant_delta':
            // ✨ جزء من الرد - أضفه للشاشة
            console.log(`📝 [FRONTEND] Delta: "${message.text}"`);
            appendAssistantText(message.text);
            break;
            
        case 'assistant_text':
            // ✨ الرد الكامل - اعرضه وانطقه
            console.log(`💬 [FRONTEND] Full response: "${message.text}"`);
            showAssistantMessage(message.text);
            
            // ✨✨✨ نطق الرد تلقائياً ✨✨✨
            speakText(message.text);
            break;
            
        case 'assistant_done':
            console.log(`✅ [FRONTEND] Response complete`);
            break;
            
        case 'error':
            console.error(`❌ [FRONTEND] Error: ${message.message}`);
            showError(message.message);
            break;
    }
};

// ============================================
// 🔊 دالة نطق النص باستخدام Edge-TTS
// ============================================

async function speakText(text) {
    if (!text || text.trim() === '') {
        console.warn('⚠️ [TTS] النص فارغ');
        return;
    }
    
    console.log(`🔊 [TTS] جاري نطق: "${text.substring(0, 50)}..."`);
    
    try {
        // إرسال الطلب لخادم TTS
        const response = await fetch(`${TTS_SERVER}/synthesize`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: text,
                voice: 'ar-SA-HamedNeural'
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (!data.success) {
            throw new Error(data.error || 'فشل التحويل');
        }
        
        // تشغيل الصوت
        console.log(`🎵 [TTS] جاري تشغيل الصوت...`);
        
        const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
        
        audio.onplay = () => console.log('▶️ [TTS] بدأ التشغيل');
        audio.onended = () => console.log('✅ [TTS] انتهى التشغيل');
        audio.onerror = (e) => console.error('❌ [TTS] خطأ في التشغيل:', e);
        
        await audio.play();
        
    } catch (error) {
        console.error('❌ [TTS] خطأ:', error.message);
        
        // Fallback إلى Web Speech Synthesis
        console.log('🔄 [TTS] جاري المحاولة مع Web Speech...');
        speakWithWebSpeech(text);
    }
}

// ============================================
// 🔊 Fallback - Web Speech Synthesis
// ============================================

function speakWithWebSpeech(text) {
    if (!('speechSynthesis' in window)) {
        console.error('❌ [TTS] Web Speech غير مدعوم');
        return;
    }
    
    // إيقاف أي نطق سابق
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-SA';
    utterance.rate = 0.9;
    
    // البحث عن صوت عربي
    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find(v => v.lang.startsWith('ar'));
    if (arabicVoice) {
        utterance.voice = arabicVoice;
    }
    
    utterance.onstart = () => console.log('▶️ [WebSpeech] بدأ النطق');
    utterance.onend = () => console.log('✅ [WebSpeech] انتهى النطق');
    
    window.speechSynthesis.speak(utterance);
}
الخطوة 5️⃣: الحصول على مفتاح API صحيح

1. اذهب إلى: https://aistudio.google.com/apikey
2. سجل الدخول بحساب Google
3. انقر "Create API Key"
4. انسخ المفتاح
5. الصقه في ملف .env:
envDownloadCopy codeGOOGLE_API_KEY=AIzaSy...المفتاح_الكامل...


الخطوة 6️⃣: اختبار الاتصال
بعد تشغيل المشروع، افتح في المتصفح:
http://localhost:8080/test-gemini

النتيجة المتوقعة:
jsonDownloadCopy code{ "success": true }

✅ معايير القبول

1. 
 عند تشغيل start.bat:

خادم TTS يعمل على 5000 ✅
خادم Node.js يعمل على 8080 ✅
اختبار Gemini ينجح ✅


2. 
 عند قول "روبوت ما هي بايثون":

يظهر الرد في الشاشة ✅
يُنطق الرد بالعربية ✅


3. 
 في سجلات الخادم:
📤 [GEMINI] السؤال: ما هي بايثون
📥 [GEMINI] الرد: بايثون هي لغة برمجة...


4. 
 في Console المتصفح:
🔊 [TTS] جاري نطق: "بايثون هي..."
🎵 [TTS] جاري تشغيل الصوت...
▶️ [TTS] بدأ التشغيل
✅ [TTS] انتهى التشغيل




🎯 توقف فقط عندما:

1. الاتصال بـ Gemini يعمل (لا يوجد socket hang up)
2. الرد يظهر في الشاشة
3. الصوت العربي يُسمع

إذا استمرت المشكلة، أخبرني بـ:

1. محتوى ملف .env (بدون المفتاح الكامل)
2. سجلات الخادم
3. سجلات Console المتصفح


---

## Key Takeaways

- **Root Cause**: مشكلة "socket hang up" تعني أن Vertex AI API لا يقبل الاتصال، غالباً بسبب مفتاح API غير صالح أو نموذج غير متاح.

- **Solution**: استبدال Vertex AI بـ Google AI Studio API (Generative Language API) الذي يعمل بشكل أسهل مع API key عادي.

- **New Endpoint**: استخدام `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent` بدلاً من `aiplatform.googleapis.com`.

- **Error Handling**: إضافة معالجة أخطاء شاملة مع رسائل واضحة ومحاولة تلقائية بدون streaming كـ fallback.

- **TTS Integration**: التأكد من استدعاء `speakText()` عند استلام `assistant_text` لتشغيل الصوت تلقائياً.