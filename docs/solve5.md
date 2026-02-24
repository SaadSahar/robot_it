أنت AI Agent/مهندس Full-Stack. أنا أعمل على مشروع روبوت دردشة صوتي.

## ⚠️ تنبيه مهم جداً - اقرأ بعناية

### 1) مشكلة المنفذ (Port)
عند تشغيل `npm start` يظهر خطأ:
Error: listen EADDRINUSE: address already in use :::3000
**الحل المطلوب**:
- أضف كود في `server.js` للتعامل مع هذا الخطأ
- أو استخدم منفذ بديل تلقائياً
- أو أضف تعليمات واضحة لإغلاق العملية السابقة

### 2) 🚨 أنا أستخدم Google Cloud API Key وليس Gemini AI Studio API Key 🚨

**هذا مهم جداً - لا تغيّر الـ API Key الخاص بي!**

#### ما لدي:
- **API Key من**: Google Cloud Platform (Vertex AI)
- **ليس من**: Google AI Studio (makersuite.google.com)
- **الـ API Key يعمل** - جربته سابقاً مع Vertex AI endpoints

#### الفرق بين الاثنين:

| الخاصية | Google Cloud (الذي أستخدمه ✅) | Google AI Studio (لا أستخدمه ❌) |
|---------|-------------------------------|----------------------------------|
| مصدر المفتاح | Google Cloud Console | makersuite.google.com |
| الـ Endpoint | `aiplatform.googleapis.com` | `generativelanguage.googleapis.com` |
| صيغة URL | `https://aiplatform.googleapis.com/v1/publishers/google/models/{MODEL}:streamGenerateContent?key={KEY}` | `https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={KEY}` |

### 3) الكود الذي يعمل معي (مرجع)

هذا مثال يعمل مع API Key الخاص بي:

```javascript
// ✅ هذا يعمل - Vertex AI endpoint
const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash-lite:streamGenerateContent?key=${api_key}`;

const payload = {
    contents: [{
        role: "user",
        parts: [{ text: "مرحبا، ما هي لغة بايثون؟" }]
    }]
};

const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
});

4) المطلوب منك
A) إصلاح backend/gemini-text-handler.js
استخدم Vertex AI endpoint وليس Gemini AI Studio endpoint:
javascriptDownloadCopy code// ❌ خطأ - لا تستخدم هذا
const url = `https://generativelanguage.googleapis.com/v1beta/models/...`;

// ✅ صحيح - استخدم هذا
const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:streamGenerateContent?key=${apiKey}`;
B) إصلاح backend/tts-handler.js
Google Cloud Text-to-Speech API يقبل نفس الـ API Key:
javascriptDownloadCopy codeconst url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
C) إصلاح backend/config.js
javascriptDownloadCopy codemodule.exports = {
    apiKey: process.env.GOOGLE_CLOUD_API_KEY,
    
    gemini: {
        // استخدم Vertex AI endpoint
        baseUrl: 'https://aiplatform.googleapis.com/v1/publishers/google/models',
        model: 'gemini-2.5-flash-lite', // أو gemini-2.0-flash
    },
    
    tts: {
        baseUrl: 'https://texttospeech.googleapis.com/v1',
        language: 'ar-XA',
        voice: 'ar-XA-Wavenet-B',
        gender: 'MALE'
    },
    
    wakeWord: process.env.WAKE_WORD || 'روبوت',
    port: process.env.PORT || 3000
};
D) ملف .env (لا تغيّره - فقط تأكد من الاسم)
envDownloadCopy code# هذا هو المفتاح الذي أستخدمه - لا تطلب مني تغييره
GOOGLE_CLOUD_API_KEY=my_existing_key_here

# النموذج
GEMINI_MODEL=gemini-2.5-flash-lite

# TTS
TTS_LANGUAGE=ar-XA
TTS_VOICE=ar-XA-Wavenet-B

# التطبيق
WAKE_WORD=روبوت
PORT=3000
DEBUG_MODE=true

5) تدفق العمل المطلوب
المستخدم يتكلم
    ↓
Web Speech API (في المتصفح) - يحول الصوت إلى نص
    ↓
WebSocket يرسل النص للسيرفر
    ↓
السيرفر يتحقق من كلمة "روبوت"
    ↓
إذا وُجدت:
    ↓
Vertex AI API (نص → نص)
URL: https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash-lite:streamGenerateContent?key=...
    ↓
Google Cloud TTS API (نص → صوت MP3)
URL: https://texttospeech.googleapis.com/v1/text:synthesize?key=...
    ↓
السيرفر يرسل النص + الصوت للمتصفح
    ↓
المتصفح يعرض النص ويشغّل الصوت


6) معايير القبول
يجب أن يعمل:

*  السيرفر يبدأ بدون خطأ المنفذ
*  استخدام aiplatform.googleapis.com وليس generativelanguage.googleapis.com
*  نفس API Key الذي لدي يعمل (لا تطلب مني مفتاح جديد)
*  عند قول "روبوت ما هي بايثون":

يظهر النص في الواجهة
يُسمع الرد صوتياً



السجلات يجب أن تُظهر:
📤 [GEMINI] URL: https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash-lite:streamGenerateContent?key=...
📤 [GEMINI] Sending: "ما هي بايثون"
📥 [GEMINI] Response: "بايثون هي لغة برمجة..."
📤 [TTS] URL: https://texttospeech.googleapis.com/v1/text:synthesize?key=...
📥 [TTS] Audio generated successfully


7) ملخص - لا تفعل هذه الأشياء ❌

1. ❌ لا تطلب مني API Key جديد من AI Studio
2. ❌ لا تستخدم endpoint: generativelanguage.googleapis.com
3. ❌ لا تستخدم endpoint: makersuite.google.com
4. ❌ لا تغيّر اسم المتغير GOOGLE_CLOUD_API_KEY

8) افعل هذه الأشياء ✅

1. ✅ استخدم endpoint: aiplatform.googleapis.com
2. ✅ استخدم endpoint: texttospeech.googleapis.com
3. ✅ استخدم المتغير الموجود GOOGLE_CLOUD_API_KEY
4. ✅ أضف معالجة لخطأ المنفذ المستخدم