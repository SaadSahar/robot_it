# 🔧 دليل إصلاح مشكلة Google Cloud TTS Authentication

## 📋 وصف المشكلة

### الخطأ الحالي
```
❌ [TTS] Error: {
  error: {
    code: 401,
    message: 'API keys are not supported by this API. 
              Expected OAuth2 access token or other authentication 
              credentials that assert a principal.',
    status: 'UNAUTHENTICATED'
  }
}
```

### السبب
Google Cloud Text-to-Speech API **لا يدعم** API Keys المباشرة. يتطلب أحد التالي:
- OAuth2 Access Token
- Service Account Authentication

---

## ✅ الحلول المقترحة

### الحل 1: استخدام Web Speech API Synthesis (الأسرع والأسهل)

**المميزات:**
- ✅ مجاني تماماً
- ✅ لا يحتاج API Key
- ✅ يعمل مباشرة في المتصفح
- ✅ دعم جيد للغة العربية

**الخطوات:**

#### 1. تعديل [`frontend/app.js`](bot_it/frontend/app.js:1)

أضف هذه الدالة:

```javascript
/**
 * Convert text to speech using Web Speech API (Browser Native)
 * @param {string} text - Text to speak
 */
function speakText(text) {
    // إلغاء أي صوت قيد التشغيل
    window.speechSynthesis.cancel();
    
    // إنشاء كائن نطق جديد
    const utterance = new SpeechSynthesisUtterance(text);
    
    // تعيين اللغة العربية
    utterance.lang = 'ar-SA';
    
    // تعيين السرعة (0.1 = بطيء جداً، 1 = عادي، 10 = سريع جداً)
    utterance.rate = 1.0;
    
    // تعيين النبرة (0 = منخفضة، 1 = عادية، 2 = عالية)
    utterance.pitch = 1.0;
    
    // اختيار صوت عربي إذا توفر
    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find(voice => voice.lang.startsWith('ar'));
    if (arabicVoice) {
        utterance.voice = arabicVoice;
    }
    
    // تشغيل الصوت
    window.speechSynthesis.speak(utterance);
}

// تحميل الأصوات عند بدء التشغيل
window.speechSynthesis.onvoiceschanged = function() {
    const voices = window.speechSynthesis.getVoices();
    console.log('Available voices:', voices.filter(v => v.lang.startsWith('ar')));
};
```

#### 2. تعديل معالج رسائل `assistant_audio`

استبدل تشغيل الصوت من السيرفر بـ Web Speech API:

```javascript
// في دالة handleWebSocketMessage
case 'assistant_text':
    // عرض النص
    appendMessage('assistant', data.text);
    
    // ✅ استخدام Web Speech API بدلاً من السيرفر
    speakText(data.text);
    break;

case 'assistant_audio':
    // ❌ لا نحتاج هذا الحالة بعد الآن
    // لأننا نستخدم Web Speech API
    break;
```

#### 3. تعديل [`backend/server.js`](bot_it/backend/server.js:1)

احذف أو علق جزء TTS:

```javascript
// في handleFinalTranscript
try {
    // 1. الحصول على رد من Gemini
    const responseText = await generateTextResponse(wakeResult.cleanText);
    
    // إرسال النص للعميل
    sendMessage(session.ws, 'assistant_text', { text: responseText });
    
    // ❌ إلغاء تحويل النص إلى صوت (العميل سيتولى ذلك)
    // const audioBase64 = await textToSpeech(responseText);
    // sendMessage(session.ws, 'assistant_audio', { data: audioBase64 });
    
    sendMessage(session.ws, 'assistant_done');
    sendMessage(session.ws, 'status', { status: 'ready', message: 'جاهز للاستماع' });
    
} catch (error) {
    console.error('❌ [SERVER] Error:', error.message);
    sendMessage(session.ws, 'status', { status: 'error', message: error.message });
}
```

---

### الحل 2: استخدام Service Account (الأكثر احترافية)

**المميزات:**
- ✅ استخدام Google Cloud TTS الرسمي
- ✅ جودة صوت عالية
- ✅ دعم كامل للغة العربية

**العيوب:**
- ⚠️ يحتاج إعداد معقد
- ⚠️ يحتاج Google Cloud Project
- ⚠️ يحتاج Service Account

#### الخطوات:

##### 1. إنشاء Service Account

```bash
# اذهب إلى Google Cloud Console
# https://console.cloud.google.com

# 1. اختر مشروعك
# 2. اذهب إلى: IAM & Admin > Service Accounts
# 3. انقر "Create Service Account"
# 4. الاسم: tts-service-account
# 5. انقر "Create and Continue"
# 6. اختر دور: "Cloud Text-to-Speech API User"
# 7. انقر "Done"
```

##### 2. إنشاء مفتاح JSON

```bash
# 1. انقر على Service Account الذي أنشأته
# 2. اذهب إلى تبويب "Keys"
# 3. انقر "Add Key" > "Create New Key"
# 4. اختر "JSON"
# 5. انقر "Create" - سيتم تحميل ملف JSON
```

##### 3. حفظ ملف المفتاح

```bash
# احفظ ملف JSON في مجلد المشروع
# سمّه: service-account-key.json
# ⚠️ أضفه إلى .gitignore!
```

##### 4. تثبيت مكتبة Google Auth

```bash
cd bot_it
npm install google-auth-library
```

##### 5. تعديل [`backend/tts-handler.js`](bot_it/backend/tts-handler.js:1)

```javascript
const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');
const { config } = require('./config');

// إنشاء Google Auth client
const auth = new GoogleAuth({
    keyFilename: './service-account-key.json', // مسار ملف المفتاح
    scopes: 'https://www.googleapis.com/auth/cloud-platform'
});

/**
 * Convert text to speech using Google Cloud TTS API with OAuth2
 * @param {string} text - Text to convert to speech
 * @returns {Promise<string>} Base64 encoded audio content
 */
async function textToSpeech(text) {
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize`;
    
    console.log('📤 [TTS] URL:', url);
    
    // الحصول على Access Token
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    
    const payload = {
        input: { text: text },
        voice: {
            languageCode: config.ttsLanguage,
            name: config.ttsVoice,
            ssmlGender: config.ttsGender
        },
        audioConfig: {
            audioEncoding: "MP3",
            speakingRate: 1.0,
            pitch: 0
        }
    };

    try {
        const response = await axios.post(url, payload, {
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}` // ✅ استخدام OAuth2
            }
        });

        const audioContent = response.data.audioContent;
        
        if (!audioContent) {
            console.warn('⚠️ [TTS] No audio content in response');
            throw new Error('فشل في توليد الصوت');
        }
        
        console.log('📥 [TTS] Audio generated successfully');
        return audioContent;
        
    } catch (error) {
        console.error('❌ [TTS] Error:', error.response?.data || error.message);
        throw new Error('فشل الاتصال بـ TTS API: ' + error.message);
    }
}

module.exports = { textToSpeech };
```

##### 6. تحديث [`.env`](bot_it/.env:1)

لا تحتاج لتغيير، لكن تأكد من وجود:
```env
GOOGLE_CLOUD_API_KEY=your_api_key_here
TTS_LANGUAGE=ar-XA
TTS_VOICE=ar-XA-Wavenet-B
```

---

### الحل 3: استخدام خدمة TTS بديلة

#### الخيار A: ResponsiveVoice

**الموقع:** https://www.responsivevoice.org/

**المميزات:**
- ✅ يدعم API Key
- ✅ دعم جيد للعربية
- ✅ أسعار معقولة

**مثال:**
```javascript
const url = `https://responsivevoice.org/responsivevoice/getvoice.php?t=${encodeURIComponent(text)}&tl=ar&sv=g1&vn=&pitch=0.5&rate=0.5&vol=1`;
```

#### الخيار B: Amazon Polly

**الموقع:** https://aws.amazon.com/polly/

**المميزات:**
- ✅ جودة صوت عالية جداً
- ✅ دعم العربية (Zeina)
- ✅ أسعار معقولة

**مثال:**
```bash
npm install aws-sdk
```

```javascript
const AWS = require('aws-sdk');
const polly = new AWS.Polly({
    region: 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

async function textToSpeech(text) {
    const params = {
        Text: text,
        OutputFormat: 'mp3',
        VoiceId: 'Zeina' // صوت عربي
    };
    
    const data = await polly.synthesizeSpeech(params).promise();
    return data.AudioStream.toString('base64');
}
```

---

## 🎯 التوصية

### للمشروع الحالي (تخرج)

**أوصي باستخدام الحل 1: Web Speech API**

**الأسباب:**
1. ✅ **الأسرع:** يمكن تنفيذه في 10 دقائق
2. ✅ **الأبسط:** لا يحتاج إعداد معقد
3. ✅ **المجاني:** لا تكلفة إضافية
4. ✅ **الكافي:** جودة الصوت جيدة للعربية
5. ✅ **المستقر:** يعمل في جميع المتصفحات الحديثة

### للمشاريع المستقبلية (تجارية)

**أوصي باستخدام الحل 2: Service Account**

**الأسباب:**
1. ✅ جودة صوت احترافية
2. ✅ تحكم كامل في المعاملات
3. ✅ دعم Google Cloud الرسمي
4. ✅ قابل للتوسع

---

## 📝 ملخص سريع

| الحل | السرعة | التكلفة | الجودة | الصعوبة |
|------|--------|---------|--------|----------|
| **Web Speech API** | ⚡⚡⚡ | 🆓 | 👍👍 | 😊 |
| **Service Account** | ⚡⚡ | 💰💰 | 👍👍👍 | 😓😓 |
| **ResponsiveVoice** | ⚡⚡⚡ | 💰 | 👍👍 | 😊 |
| **Amazon Polly** | ⚡⚡ | 💰💰 | 👍👍👍 | 😓 |

---

## 🚀 الخطوات التالية

### اختر الحل 1 (Web Speech API) - موصى به

1. ✅ انسخ الكود من الأعلى
2. ✅ عدّل `frontend/app.js`
3. ✅ عدّل `backend/server.js`
4. ✅ اختبر النظام
5. ✅ تم! 🎉

### اختر الحل 2 (Service Account) - احترافي

1. ✅ أنشئ Service Account
2. ✅ حمّل ملف المفتاح
3. ✅ ثبّت google-auth-library
4. ✅ عدّل `backend/tts-handler.js`
5. ✅ اختبر النظام
6. ✅ تم! 🎉

---

**تاريخ الدليل:** 31 يناير 2026  
**الحالة:** ✅ جاهز للتنفيذ
