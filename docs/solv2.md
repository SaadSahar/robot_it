أنت AI Agent/مهندس Full-Stack خبير. المشروع الحالي لا يعمل لأنه يستخدم REST API مع مودل يتطلب **Gemini Live API (WebSocket)**. أريد إعادة بناء الاتصال بالكامل.

---

## 1) المشكلة الجذرية (Root Cause)

المودل `gemini-live-2.5-flash-native-audio` **لا يدعم** REST endpoint مثل:
POST /v1/publishers/google/models/{model}:streamGenerateContent

هذا المودل يتطلب **Gemini Live API** وهي:
- اتصال WebSocket ثنائي الاتجاه (Bidirectional)
- Endpoint مختلف تماماً
- بروتوكول مختلف للإرسال والاستقبال

---

## 2) المواصفات التقنية المطلوبة (من التوثيق الرسمي)

### صيغة الصوت المطلوبة:
| الاتجاه | الصيغة |
|---------|--------|
| **Input** | Raw 16-bit PCM, 16kHz, little-endian, mono |
| **Output** | Raw 16-bit PCM, 24kHz, little-endian |

### Endpoint الصحيح لـ Gemini Live API:

wss://aiplatform.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent
أو حسب Vertex AI:

wss://{REGION}-aiplatform.googleapis.com/ws/v1/publishers/google/models/{MODEL}:streamGenerateContent

### Region المدعومة:
- `us-central1` (الأفضل)
- أو أي region من القائمة في التوثيق

---

## 3) المطلوب تنفيذه

### A) إعادة بناء `gemini-handler.js` بالكامل

احذف كل كود REST واستبدله بـ WebSocket client:

```javascript
// المفاهيم الأساسية المطلوبة:

// 1. إنشاء اتصال WebSocket مع Gemini Live API
const ws = new WebSocket(LIVE_API_ENDPOINT, {
    headers: {
        'Authorization': `Bearer ${accessToken}`,
        // أو استخدام API Key حسب طريقة المصادقة
    }
});

// 2. إرسال Setup message أولاً
ws.send(JSON.stringify({
    setup: {
        model: "models/gemini-live-2.5-flash-native-audio",
        generationConfig: {
            responseModalities: ["AUDIO", "TEXT"],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: {
                        voiceName: "Aoede" // أو أي صوت من الـ 30 صوت المدعوم
                    }
                }
            }
        },
        systemInstruction: {
            parts: [{
                text: "أنت مساعد صوتي متخصص في هندسة المعلوماتية..."
            }]
        }
    }
}));

// 3. إرسال الصوت كـ realtime_input
ws.send(JSON.stringify({
    realtimeInput: {
        mediaChunks: [{
            mimeType: "audio/pcm",
            data: base64PCMData // PCM 16-bit, 16kHz, mono
        }]
    }
}));

// 4. استقبال الرد (نص + صوت)
ws.on('message', (data) => {
    const response = JSON.parse(data);
    
    // قد يحتوي على:
    // - serverContent.modelTurn.parts[].text (النص)
    // - serverContent.modelTurn.parts[].inlineData (الصوت)
    // - serverContent.turnComplete (انتهاء الدور)
});

B) تعديل Frontend لتسجيل PCM صحيح
javascriptDownloadCopy code// المطلوب في app.js:

// 1. استخدام AudioWorklet أو ScriptProcessorNode
// 2. تسجيل بصيغة: PCM 16-bit, 16kHz, mono
// 3. إرسال chunks بشكل مستمر (لا تنتظر نهاية التسجيل)

// مثال للتحويل إلى PCM:
function floatTo16BitPCM(float32Array) {
    const buffer = new ArrayBuffer(float32Array.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < float32Array.length; i++) {
        let s = Math.max(-1, Math.min(1, float32Array[i]));
        view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true); // little-endian
    }
    return buffer;
}

// 2. Resample إلى 16kHz إذا كان المتصفح يسجل بمعدل مختلف
C) منطق كلمة التنبيه "روبوت"
بما أن المودل يدعم Proactive Audio (Preview):
javascriptDownloadCopy code// الخيار 1: استخدام Proactive Audio
// المودل سيرد فقط عندما يكون السؤال موجه إليه

// الخيار 2: معالجة يدوية
// - استقبل النص من serverContent.modelTurn.parts[].text
// - افحص إذا كان يبدأ بـ "روبوت"
// - إذا لا، تجاهل وأرسل للواجهة: "قل روبوت أولاً"
D) تشغيل الصوت المستلم
javascriptDownloadCopy code// الصوت المستلم: PCM 24kHz
// حوّله إلى AudioBuffer وشغّله:

function playPCMAudio(base64PCM) {
    const pcmData = atob(base64PCM);
    const arrayBuffer = new ArrayBuffer(pcmData.length);
    const view = new Uint8Array(arrayBuffer);
    for (let i = 0; i < pcmData.length; i++) {
        view[i] = pcmData.charCodeAt(i);
    }
    
    // تحويل إلى Float32 للتشغيل
    const audioContext = new AudioContext({ sampleRate: 24000 });
    const float32 = new Float32Array(arrayBuffer.byteLength / 2);
    const dataView = new DataView(arrayBuffer);
    for (let i = 0; i < float32.length; i++) {
        float32[i] = dataView.getInt16(i * 2, true) / 32768;
    }
    
    const audioBuffer = audioContext.createBuffer(1, float32.length, 24000);
    audioBuffer.getChannelData(0).set(float32);
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();
}

4) هيكل الملفات الجديد
bot_it/
├── backend/
│   ├── config.js              # تحديث الإعدادات
│   ├── gemini-live-client.js  # ✨ جديد: WebSocket client لـ Live API
│   ├── audio-processor.js     # ✨ جديد: معالجة PCM
│   └── server.js              # تحديث لاستخدام Live API
├── frontend/
│   ├── index.html
│   ├── styles.css
│   ├── app.js                 # تحديث لتسجيل PCM
│   └── pcm-processor.js       # ✨ جديد: AudioWorklet للتسجيل
├── .env.example
└── package.json


5) ملف .env الجديد
envDownloadCopy code# Gemini Live API
GOOGLE_CLOUD_API_KEY=your_key_here
VERTEX_REGION=us-central1
VERTEX_MODEL=gemini-live-2.5-flash-native-audio

# Voice Settings
VOICE_NAME=Aoede
RESPONSE_MODALITIES=AUDIO,TEXT

# App Settings
WAKE_WORD=روبوت
PORT=3000

# Debug
DEBUG_MODE=true
SAVE_AUDIO_FILES=true

6) تدفق العمل الجديد (Flow)
┌─────────────────────────────────────────────────────────────────┐
│                         المتصفح                                  │
├─────────────────────────────────────────────────────────────────┤
│ 1. المستخدم يضغط زر التحدث                                      │
│ 2. تسجيل الصوت بصيغة PCM 16-bit 16kHz mono                      │
│ 3. إرسال chunks عبر WebSocket للسيرفر                           │
│ 4. استقبال الرد (نص + صوت PCM 24kHz)                            │
│ 5. عرض النص + تشغيل الصوت                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         السيرفر                                  │
├─────────────────────────────────────────────────────────────────┤
│ 1. استقبال PCM من المتصفح                                       │
│ 2. إرسال Setup message لـ Gemini Live API (مرة واحدة)          │
│ 3. إرسال الصوت كـ realtimeInput                                 │
│ 4. استقبال الرد من Gemini                                       │
│ 5. فحص كلمة "روبوت" في النص                                     │
│ 6. إرسال النص + الصوت للمتصفح                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Gemini Live API                               │
├─────────────────────────────────────────────────────────────────┤
│ WebSocket: wss://us-central1-aiplatform.googleapis.com/ws/...   │
│ Model: gemini-live-2.5-flash-native-audio                       │
│ Input: PCM 16kHz → Output: Text + PCM 24kHz                     │
└─────────────────────────────────────────────────────────────────┘


7) معايير القبول

*  الاتصال بـ Gemini Live API عبر WebSocket يعمل
*  الصوت يُسجل بصيغة PCM 16-bit 16kHz mono
*  النص المستخرج يظهر في الواجهة (transcript)
*  كلمة "روبوت" تُكتشف بشكل صحيح
*  الرد الصوتي يُشغّل بشكل صحيح (PCM 24kHz)
*  سجلات Debug واضحة لكل خطوة
*  التخصص في هندسة المعلوماتية يعمل


8) مصادر مهمة للتنفيذ

* Gemini Live API Documentation
* Supported Audio Formats
* WebSocket Protocol Messages


9) ملاحظات مهمة

1. المصادقة: قد تحتاج OAuth2 access token بدلاً من API Key للـ Live API
2. Session Management: جلسة Live API لها حد أقصى 10 دقائق (قابل للتمديد)
3. Concurrent Sessions: الحد الأقصى 1000 جلسة متزامنة
4. Voices: يوجد 30 صوت HD متاح، اختر صوت عربي مناسب

نفّذ هذه التغييرات بالكامل وقدّم الكود النهائي الجاهز للتشغيل.