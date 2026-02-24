
markdownDownloadCopy code# مهمة تحويل مشروع الروبوت التقني إلى Gemini Live API

## الهدف
تحويل المشروع الحالي من معمارية (Speech-to-Text → Text AI → Text-to-Speech) إلى معمارية صوتية مباشرة باستخدام **Gemini Live API** مع نموذج `gemini-live-2.5-flash-native-audio`.

## المعمارية الحالية (المراد تغييرها)
المستخدم ← Web Speech API (STT) ← Node.js ← Gemini Text API ← Edge-TTS ← المستخدم

## المعمارية الجديدة (المطلوبة)

المستخدم ← WebSocket (Audio Stream) ← Node.js ← Gemini Live API (WSS) ← Audio Response ← المستخدم

## المواصفات التقنية المطلوبة

### 1. النموذج المستخدم
- **Model ID**: `gemini-live-2.5-flash-native-audio`
- **Platform**: Google Cloud Vertex AI
- **Region**: `us-central1` أو أي منطقة مدعومة

### 2. تنسيقات الصوت
- **الإدخال**: Raw 16-bit PCM audio at 16kHz, little-endian
- **الإخراج**: Raw 16-bit PCM audio at 24kHz, little-endian
- **MIME Type للإدخال**: `audio/pcm;rate=16000`

### 3. بروتوكول الاتصال
- **Protocol**: WebSocket (WSS) - Stateful connection
- **Endpoint**: Vertex AI Live API endpoint

### 4. إعدادات اللغة والصوت
```python
config = LiveConnectConfig(
    response_modalities=["AUDIO"],
    speech_config=SpeechConfig(
        voice_config=VoiceConfig(
            prebuilt_voice_config=PrebuiltVoiceConfig(
                voice_name="Charon",  # أو أي صوت من القائمة المدعومة
            )
        ),
        language_code="ar-EG",  # العربية المصرية
    ),
)

5. إعدادات VAD (Voice Activity Detection)
pythonDownloadCopy coderealtime_input_config = {
    "automatic_activity_detection": {
        "disabled": False,
        "start_of_speech_sensitivity": "low",
        "end_of_speech_sensitivity": "low",
        "prefix_padding_ms": 20,
        "silence_duration_ms": 100,
    }
}
الملفات المطلوب تعديلها/إنشاؤها
1. Backend (Node.js)
أ) ملف جديد: gemini-live-handler.js
المطلوب:

* إنشاء اتصال WebSocket مع Gemini Live API
* إدارة الجلسات الصوتية (Session Management)
* استقبال بيانات الصوت من المتصفح وإرسالها للـ API
* استقبال الرد الصوتي من API وإعادته للمتصفح
* معالجة المقاطعات (Interruptions/Barge-in)
* إدارة الأخطاء وإعادة الاتصال

ب) تعديل: server.js
المطلوب:

* إزالة الاعتماد على gemini-text-handler.js
* إزالة الاعتماد على خادم TTS
* تعديل WebSocket handler لاستقبال Audio chunks بدلاً من النص
* إضافة منطق تمرير الصوت إلى Gemini Live API
* إضافة منطق إرسال الرد الصوتي للمتصفح

ج) تعديل: config.js
المطلوب:

* إضافة إعدادات Gemini Live API
* إضافة إعدادات الصوت (voice_name, language_code)
* إضافة إعدادات VAD

2. Frontend (JavaScript)
أ) تعديل: app.js
المطلوب:

* إزالة: Web Speech API (webkitSpeechRecognition)
* إضافة: التقاط الصوت باستخدام Web Audio API (MediaRecorder أو AudioWorklet)
* إضافة: تحويل الصوت إلى تنسيق PCM 16-bit, 16kHz
* تعديل: إرسال chunks صوتية عبر WebSocket بدلاً من النص
* إضافة: استقبال وتشغيل الصوت الراجع (PCM 24kHz)
* إضافة: إدارة buffer التشغيل والمقاطعات

ب) تعديل: index.html
المطلوب:

* إزالة عناصر Web Speech API
* إضافة عناصر التحكم بالصوت الجديدة
* تحديث مؤشرات الحالة

3. حذف الملفات غير المطلوبة

* tts-server.py (لم يعد مطلوباً)
* أي ملفات مرتبطة بـ Edge-TTS

كود مرجعي للتنفيذ
Frontend - التقاط الصوت وإرساله
javascriptDownloadCopy codeclass AudioStreamer {
    constructor(websocket) {
        this.ws = websocket;
        this.audioContext = null;
        this.processor = null;
    }

    async start() {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                sampleRate: 16000,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true
            }
        });

        this.audioContext = new AudioContext({ sampleRate: 16000 });
        const source = this.audioContext.createMediaStreamSource(stream);
        
        // استخدام ScriptProcessor أو AudioWorklet لمعالجة الصوت
        this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);
        
        this.processor.onaudioprocess = (e) => {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmData = this.floatTo16BitPCM(inputData);
            
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(pcmData);
            }
        };

        source.connect(this.processor);
        this.processor.connect(this.audioContext.destination);
    }

    floatTo16BitPCM(float32Array) {
        const buffer = new ArrayBuffer(float32Array.length * 2);
        const view = new DataView(buffer);
        for (let i = 0; i < float32Array.length; i++) {
            let s = Math.max(-1, Math.min(1, float32Array[i]));
            view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }
        return buffer;
    }
}
Frontend - تشغيل الصوت الراجع
javascriptDownloadCopy codeclass AudioPlayer {
    constructor() {
        this.audioContext = new AudioContext({ sampleRate: 24000 });
        this.queue = [];
        this.isPlaying = false;
    }

    addToQueue(pcmData) {
        // تحويل PCM إلى Float32
        const int16Array = new Int16Array(pcmData);
        const float32Array = new Float32Array(int16Array.length);
        
        for (let i = 0; i < int16Array.length; i++) {
            float32Array[i] = int16Array[i] / 32768.0;
        }
        
        this.queue.push(float32Array);
        if (!this.isPlaying) this.playNext();
    }

    async playNext() {
        if (this.queue.length === 0) {
            this.isPlaying = false;
            return;
        }
        
        this.isPlaying = true;
        const data = this.queue.shift();
        
        const buffer = this.audioContext.createBuffer(1, data.length, 24000);
        buffer.getChannelData(0).set(data);
        
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.onended = () => this.playNext();
        source.start();
    }

    flush() {
        this.queue = [];
    }
}
Backend - الاتصال بـ Gemini Live API
javascriptDownloadCopy code// gemini-live-handler.js
const WebSocket = require('ws');

class GeminiLiveSession {
    constructor(config) {
        this.config = config;
        this.ws = null;
        this.onAudioResponse = null;
        this.onTranscript = null;
        this.onError = null;
    }

    async connect() {
        const endpoint = `wss://${this.config.region}-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`;
        
        this.ws = new WebSocket(endpoint, {
            headers: {
                'Authorization': `Bearer ${this.config.accessToken}`,
            }
        });

        this.ws.on('open', () => this.sendSetup());
        this.ws.on('message', (data) => this.handleMessage(data));
        this.ws.on('error', (err) => this.onError?.(err));
    }

    sendSetup() {
        const setupMessage = {
            setup: {
                model: `projects/${this.config.projectId}/locations/${this.config.region}/publishers/google/models/gemini-live-2.5-flash-native-audio`,
                generation_config: {
                    response_modalities: ["AUDIO"],
                    speech_config: {
                        voice_config: {
                            prebuilt_voice_config: {
                                voice_name: this.config.voiceName || "Charon"
                            }
                        },
                        language_code: this.config.languageCode || "ar-EG"
                    }
                },
                system_instruction: {
                    parts: [{ text: this.config.systemPrompt }]
                }
            }
        };
        this.ws.send(JSON.stringify(setupMessage));
    }

    sendAudio(pcmData) {
        const message = {
            realtime_input: {
                media_chunks: [{
                    data: Buffer.from(pcmData).toString('base64'),
                    mime_type: "audio/pcm;rate=16000"
                }]
            }
        };
        this.ws.send(JSON.stringify(message));
    }

    handleMessage(data) {
        const message = JSON.parse(data);
        
        if (message.server_content?.interrupted) {
            // معالجة المقاطعة
            this.onInterruption?.();
        }
        
        if (message.server_content?.model_turn?.parts) {
            for (const part of message.server_content.model_turn.parts) {
                if (part.inline_data) {
                    // رد صوتي
                    const audioData = Buffer.from(part.inline_data.data, 'base64');
                    this.onAudioResponse?.(audioData);
                }
                if (part.text) {
                    // نص مكتوب (transcript)
                    this.onTranscript?.(part.text);
                }
            }
        }
    }
}
System Prompt للروبوت التقني
أنت روبوت جامعي تقني متخصص في الإجابة على الأسئلة التقنية في مجال علوم الحاسب وهندسة المعلوماتية.

القواعد:
1. أجب باللغة العربية دائماً
2. قدم إجابات مختصرة ودقيقة (لا تتجاوز 3-4 جمل)
3. إذا كان السؤال غير واضح، اطلب توضيحاً
4. تخصصك: البرمجة، قواعد البيانات، الشبكات، الذكاء الاصطناعي، أنظمة التشغيل
5. كن ودوداً ومساعداً

RESPOND IN ARABIC. YOU MUST RESPOND UNMISTAKABLY IN ARABIC.

متغيرات البيئة المطلوبة (.env)
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_REGION=us-central1
GOOGLE_CLOUD_ACCESS_TOKEN=your-access-token
GEMINI_VOICE_NAME=Charon
GEMINI_LANGUAGE_CODE=ar-EG
PORT=8080

هيكل المشروع الجديد
project/
├── backend/
│   ├── server.js              (معدل)
│   ├── gemini-live-handler.js (جديد)
│   ├── config.js              (معدل)
│   └── auth.js                (جديد - للتوثيق مع Google Cloud)
├── frontend/
│   ├── index.html             (معدل)
│   ├── app.js                 (معدل بالكامل)
│   ├── audio-streamer.js      (جديد)
│   ├── audio-player.js        (جديد)
│   └── styles.css             (تعديلات طفيفة)
├── .env
├── package.json               (تحديث التبعيات)
└── README.md

التبعيات الجديدة (package.json)
jsonDownloadCopy code{
  "dependencies": {
    "express": "^4.18.2",
    "ws": "^8.14.2",
    "google-auth-library": "^9.0.0",
    "dotenv": "^16.3.1"
  }
}
خطوات التنفيذ

1. إعداد مشروع Google Cloud وتفعيل Vertex AI API
2. إنشاء Service Account والحصول على credentials
3. تحديث ملفات Backend
4. تحديث ملفات Frontend
5. حذف ملفات TTS غير المطلوبة
6. اختبار الاتصال والتأكد من عمل الصوت
7. معالجة حالات الخطأ والمقاطعات

ملاحظات مهمة

* الـ Access Token يحتاج تجديد (استخدم google-auth-library)
* تأكد من فتح المنافذ المطلوبة
* اختبر على Chrome (أفضل دعم لـ Web Audio API)
* راقب استهلاك الـ API لتجنب التكاليف الزائدة

