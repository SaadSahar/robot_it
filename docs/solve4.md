🔴 المشكلة واضحة من السجل
WebSocket closed: 1008 - API keys are not supported by this API. 
Expected OAuth2 access token or other authentication credentials

Gemini Live API لا تقبل API Key، تتطلب OAuth2 Access Token!

Prompt لإصلاح المشروع
markdownDownloadCopy codeأنت AI Agent/مهندس Full‑Stack. المشروع الحالي يعمل بشكل جيد:
- ✅ Web Speech API يلتقط الكلام ويحوله لنص
- ✅ كلمة التنبيه "روبوت" تُكتشف بنجاح
- ✅ النص يُرسل للسيرفر
- ❌ **المشكلة**: Gemini Live API ترفض API Key وتطلب OAuth2

الخطأ من السجل:
WebSocket closed: 1008 - API keys are not supported by this API.
Expected OAuth2 access token or other authentication credentials

---

## 🎯 المطلوب: حل مشكلة المصادقة + إخراج الصوت

لدي **خياران**، نفّذ الخيار الأنسب (أو كلاهما مع switch):

---

## الخيار 1: إصلاح OAuth2 لـ Gemini Live API (للصوت عالي الجودة)

### 1.1 المتطلبات
- Service Account من Google Cloud
- ملف JSON credentials
- مكتبة `google-auth-library` لتوليد Access Token

### 1.2 خطوات التنفيذ

#### A) تثبيت المكتبة
```bash
npm install google-auth-library

B) إنشاء ملف backend/auth.js
javascriptDownloadCopy codeconst { GoogleAuth } = require('google-auth-library');

class GeminiAuth {
    constructor() {
        this.auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform'],
            // يقرأ تلقائياً من GOOGLE_APPLICATION_CREDENTIALS
        });
        this.cachedToken = null;
        this.tokenExpiry = null;
    }

    async getAccessToken() {
        // تحقق من صلاحية التوكن المحفوظ
        if (this.cachedToken && this.tokenExpiry > Date.now() + 60000) {
            return this.cachedToken;
        }

        const client = await this.auth.getClient();
        const tokenResponse = await client.getAccessToken();
        
        this.cachedToken = tokenResponse.token;
        // التوكن صالح لمدة ساعة عادةً
        this.tokenExpiry = Date.now() + 3500000; // 58 دقيقة
        
        console.log('🔑 [AUTH] New access token generated');
        return this.cachedToken;
    }
}

module.exports = new GeminiAuth();
C) تعديل gemini-live-client.js
javascriptDownloadCopy codeconst geminiAuth = require('./auth');

async function connectToGeminiLive() {
    // احصل على Access Token بدلاً من API Key
    const accessToken = await geminiAuth.getAccessToken();
    
    const wsUrl = `wss://${config.vertex.region}-aiplatform.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent`;
    
    // أضف التوكن في الـ headers أو كـ query parameter
    const ws = new WebSocket(wsUrl, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        }
    });
    
    // ... باقي الكود
}
D) ملف .env الجديد
envDownloadCopy code# بدلاً من API Key، استخدم Service Account
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json

# أو إذا كنت على GCP مباشرة، ADC يعمل تلقائياً
# GOOGLE_CLOUD_PROJECT=your-project-id

VERTEX_REGION=us-central1
VERTEX_MODEL=gemini-live-2.5-flash-native-audio
VOICE_NAME=Aoede
WAKE_WORD=روبوت
PORT=3000
DEBUG_MODE=true
E) الحصول على Service Account

1. اذهب إلى Google Cloud Console
2. IAM & Admin → Service Accounts
3. Create Service Account
4. أعطه Role: Vertex AI User
5. Create Key → JSON
6. احفظ الملف باسم service-account.json في مجلد المشروع
7. أضفه إلى .gitignore


الخيار 2: استخدام Gemini REST للنص + Google Cloud TTS للصوت (أسهل)
إذا OAuth2 معقد أو لا يعمل، استخدم هذا الحل البديل:
2.1 المعمارية الجديدة
المستخدم يتكلم
    ↓
Web Speech API (STT في المتصفح) - مجاني
    ↓
السيرفر يستقبل النص
    ↓
Gemini REST API (نص → نص) - يقبل API Key ✅
    ↓
Google Cloud TTS API (نص → صوت) - يقبل API Key ✅
    ↓
الصوت يُشغّل في المتصفح

2.2 التنفيذ
A) ملف backend/gemini-text-handler.js (للنص)
javascriptDownloadCopy codeconst axios = require('axios');
const config = require('./config');

async function generateTextResponse(userText) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${config.apiKey}`;
    
    const payload = {
        contents: [{
            role: "user",
            parts: [{ text: userText }]
        }],
        systemInstruction: {
            parts: [{
                text: `أنت مساعد متخصص حصرياً في هندسة المعلوماتية وعلوم الحاسب.
                       أجب بالعربية بشكل مختصر ومناسب للقراءة الصوتية.
                       إذا كان السؤال خارج تخصصك، اعتذر بلطف.`
            }]
        },
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500
        }
    };

    const response = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' }
    });

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
    return text || 'عذراً، لم أتمكن من توليد رد.';
}

module.exports = { generateTextResponse };
B) ملف backend/tts-handler.js (للصوت)
javascriptDownloadCopy codeconst axios = require('axios');
const config = require('./config');

async function textToSpeech(text) {
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${config.apiKey}`;
    
    const payload = {
        input: { text: text },
        voice: {
            languageCode: "ar-XA",  // عربي
            name: "ar-XA-Wavenet-B", // صوت عربي عالي الجودة
            ssmlGender: "MALE"
        },
        audioConfig: {
            audioEncoding: "MP3",
            speakingRate: 1.0,
            pitch: 0
        }
    };

    const response = await axios.post(url, payload, {
        headers: { 'Content-Type': 'application/json' }
    });

    // يُرجع base64 encoded audio
    return response.data.audioContent;
}

module.exports = { textToSpeech };
C) تعديل backend/server.js
javascriptDownloadCopy codeconst { generateTextResponse } = require('./gemini-text-handler');
const { textToSpeech } = require('./tts-handler');

// عند استقبال final_transcript
ws.on('message', async (data) => {
    const msg = JSON.parse(data);
    
    if (msg.type === 'final_transcript') {
        const wakeResult = checkWakeWord(msg.text);
        
        if (wakeResult.wake) {
            // أرسل حالة "جاري التفكير"
            ws.send(JSON.stringify({ type: 'status', status: 'thinking' }));
            
            try {
                // 1. احصل على رد نصي من Gemini
                console.log('📤 [SERVER] Sending to Gemini:', wakeResult.cleanText);
                const responseText = await generateTextResponse(wakeResult.cleanText);
                console.log('📥 [SERVER] Gemini response:', responseText);
                
                // أرسل النص للواجهة
                ws.send(JSON.stringify({ 
                    type: 'assistant_text', 
                    text: responseText 
                }));
                
                // 2. حوّل النص إلى صوت
                console.log('🔊 [SERVER] Converting to speech...');
                const audioBase64 = await textToSpeech(responseText);
                console.log('✅ [SERVER] Audio generated, size:', audioBase64.length);
                
                // أرسل الصوت للواجهة
                ws.send(JSON.stringify({
                    type: 'assistant_audio',
                    mimeType: 'audio/mp3',
                    data: audioBase64
                }));
                
                ws.send(JSON.stringify({ type: 'assistant_done' }));
                
            } catch (error) {
                console.error('❌ [SERVER] Error:', error.message);
                ws.send(JSON.stringify({
                    type: 'error',
                    message: error.message
                }));
            }
        }
    }
});
D) تعديل frontend/app.js لتشغيل MP3
javascriptDownloadCopy codefunction handleAssistantAudio(data) {
    const { mimeType, data: audioBase64 } = data;
    
    // حوّل base64 إلى blob
    const binaryString = atob(audioBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });
    
    // شغّل الصوت
    const audioUrl = URL.createObjectURL(blob);
    const audio = new Audio(audioUrl);
    
    audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        updateStatus('ready', 'جاهز للاستماع');
    };
    
    audio.onerror = (e) => {
        console.error('❌ Audio playback error:', e);
    };
    
    updateStatus('speaking', 'جاري الرد...');
    audio.play();
}

الخيار 3: استخدام Web Speech Synthesis (مجاني بالكامل - بدون API)
إذا لا تريد استخدام Google Cloud TTS:
javascriptDownloadCopy code// في frontend/app.js
function speakText(text) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-SA';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    // اختر صوت عربي إن وجد
    const voices = speechSynthesis.getVoices();
    const arabicVoice = voices.find(v => v.lang.startsWith('ar'));
    if (arabicVoice) {
        utterance.voice = arabicVoice;
    }
    
    utterance.onend = () => updateStatus('ready');
    speechSynthesis.speak(utterance);
}
ملاحظة: جودة Web Speech Synthesis أقل من Google Cloud TTS.

📋 ملف .env النهائي
envDownloadCopy code# Google Cloud API Key (يعمل مع REST APIs)
GOOGLE_CLOUD_API_KEY=your_api_key_here

# إعدادات النموذج
GEMINI_MODEL=gemini-2.0-flash

# إعدادات TTS
TTS_LANGUAGE=ar-XA
TTS_VOICE=ar-XA-Wavenet-B
TTS_GENDER=MALE

# إعدادات التطبيق
WAKE_WORD=روبوت
PORT=3000
DEBUG_MODE=true

# اختياري: للـ OAuth2 (الخيار 1)
# GOOGLE_APPLICATION_CREDENTIALS=./service-account.json

🎯 معايير القبول
بعد التنفيذ:

1. 
عند قول "روبوت ما هي بايثون":

✅ يظهر النص في الواجهة
✅ يُسمع الرد صوتياً
✅ لا أخطاء في السجلات


2. 
السجلات تُظهر:
📤 [SERVER] Sending to Gemini: "ما هي بايثون"
📥 [SERVER] Gemini response: "بايثون هي لغة برمجة..."
🔊 [SERVER] Converting to speech...
✅ [SERVER] Audio generated, size: 45678




📝 توصيتي
ابدأ بالخيار 2 (Gemini REST + Google Cloud TTS) لأنه:

* يعمل مع API Key الذي لديك
* لا يحتاج Service Account
* أسهل في التنفيذ
* جودة صوت ممتازة

إذا أردت الخيار 1 (Gemini Live + OAuth2) لاحقاً للحصول على تجربة أكثر تفاعلية، يمكنك إضافته.

نفّذ الخيار 2 الآن وأعطني الكود الكامل المُعدّل.

---

هل تريد أن أعدّل أي شيء في الـ Prompt؟