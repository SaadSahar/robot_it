markdownDownloadCopy codeأنت AI Agent/مهندس Full‑Stack. عندي مشروع جاهز (Node.js + Express + ws + Frontend) لروبوت دردشة صوتي. أريد **تعديل جذري**: بدل إرسال الصوت الخام للسيرفر، سيتم أخذ كلام المستخدم وتحويله إلى **نص داخل المتصفح عبر Web Speech API (SpeechRecognition في Chrome)**. ثم السيرفر يرسل **النص فقط** إلى Vertex AI باستخدام مودل الصوت:
`gemini-live-2.5-flash-native-audio`
ويستلم **رد صوتي + نص** (TTS من نفس المودل) ويرسله للمتصفح للتشغيل.

نفّذ التعديلات كاملة على المشروع مع كود جاهز للتشغيل + تحديث README + أدوات Debug.

---

## 0) هيكل المشروع الحالي (لا تغيّره كثيراً)
bot_it/
├── backend/
│   ├── config.js
│   ├── gemini-handler.js
│   └── server.js
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── .env.example
├── package.json
└── README.md

يمكنك إضافة ملفات جديدة عند الحاجة (مثلاً gemini-live-client.js) لكن حافظ على التنظيم.

---

## 1) المتطلبات الوظيفية
### 1.1 دردشة صوتية “وقت فعلي”
- المستخدم يتكلم في الميكروفون.
- المتصفح يحوّل الكلام إلى نص **لحظياً** (Interim + Final) عبر Web Speech API.
- عند انتهاء الكلام (Final result) يتم إرسال النص للسيرفر فوراً.
- السيرفر يستدعي Gemini Live ويعيد:
  - نص الرد (للعرض)
  - وصوت الرد (للتشغيل)

### 1.2 شرط كلمة التنبيه (Wake Word)
- الروبوت **لا يرد** إلا إذا بدأ النص النهائي بـ **"روبوت"**.
- قواعد المطابقة:
  - تجاهل علامات الترقيم والمسافات في البداية
  - اعتبر “روبوت،” و “روبوت:” و “روبوت” صحيحة
- إذا لم تبدأ بـ "روبوت":
  - لا ترسل أي طلب للمودل
  - أعرض للمستخدم رسالة: “قل: روبوت ثم سؤالك”
- إذا بدأت بـ "روبوت":
  - احذف كلمة “روبوت” من بداية النص قبل إرساله للمودل (ليصبح السؤال نظيفاً)

### 1.3 التخصص
- الروبوت متخصص فقط في **هندسة المعلوماتية / علوم الحاسب**.
- أي سؤال خارج النطاق: اعتذار مختصر + توجيه لسؤال ضمن الحاسب.

---

## 2) المتطلبات التقنية الجديدة (Web Speech API Input)
### 2.1 Frontend: SpeechRecognition
استخدم:
- `window.SpeechRecognition || window.webkitSpeechRecognition`
الإعدادات:
- `lang = "ar-SA"` (أو خيار في الواجهة لتبديل العربية/الإنجليزية)
- `continuous = false` (يفضل لزر Push‑to‑Talk) أو true إذا نفّذت VAD بسيط
- `interimResults = true`
- التعامل مع الأحداث:
  - `onstart`, `onresult`, `onerror`, `onend`

### 2.2 UX
- زر Push‑to‑Talk:
  - عند الضغط: يبدأ SpeechRecognition
  - عند الإفلات: يوقف SpeechRecognition (أو انتظر onend)
- عرض مباشر للنص أثناء الكلام (interim transcript).
- عند final transcript:
  - أرسله للسيرفر عبر WebSocket برسالة type واضحة.

### 2.3 ملاحظة توافق مهمة
- Web Speech API يعمل بشكل ممتاز على **Google Chrome/Edge** وقد لا يعمل في Firefox.
- إذا لم يكن مدعوماً:
  - اعرض تحذير + وفّر Text input كبديل (اختياري لكن مستحسن).

---

## 3) Backend: الاتصال بـ Vertex AI (Gemini Live) لإخراج الصوت
### 3.1 يجب استخدام Gemini Live API
- لأن المودل `gemini-live-2.5-flash-native-audio` خاص بـ Live API.
- استخدم WebSocket من السيرفر إلى Vertex (Bidi/Live) للحصول على **Audio output**.
- نحن لم نعد نحتاج Audio input للمودل، فقط Text input.

### 3.2 مخرجات المودل المطلوبة
- `responseModalities`: `["AUDIO", "TEXT"]`
- اختر صوت (Voice) افتراضي (مثل Aoede) واجعلها قابلة للتغيير من .env.

### 3.3 صيغة الصوت الخارج
حسب التوثيق: **PCM 16-bit 24kHz little-endian**
- أعده للواجهة base64 chunks.
- في الواجهة: decode + تشغيل (AudioContext sampleRate 24000).

### 3.4 المصادقة
- لا تضع API key في الواجهة.
- في السيرفر:
  - استخدم `GOOGLE_CLOUD_API_KEY` إن كان يعمل مع Live endpoint في بيئتك.
  - وإذا لم يعمل: نفّذ OAuth عبر `google-auth-library` باستخدام ADC أو Service Account (بدون أسئلة إضافية، جهّز الكود للطريقتين مع اختيار تلقائي حسب env).

---

## 4) بروتوكول الرسائل بين Frontend و Backend (WebSocket)
عرّف رسائل JSON واضحة:

### 4.1 من المتصفح للسيرفر
1) تحديث نص مؤقت (اختياري للعرض فقط):
```json
{ "type": "interim_transcript", "text": "..." }

1. نص نهائي (الذي يحدد الرد):

jsonDownloadCopy code{ "type": "final_transcript", "text": "روبوت ما هي بايثون؟", "lang": "ar-SA" }
4.2 من السيرفر للمتصفح

1. حالة:

jsonDownloadCopy code{ "type": "status", "status": "ready|listening|thinking|speaking|error", "message": "..." }

1. Debug transcript / wake:

jsonDownloadCopy code{ "type": "wake_debug", "wake": true, "rawText": "...", "cleanText": "..." }

1. نص رد:

jsonDownloadCopy code{ "type": "assistant_text", "text": "..." }

1. صوت رد (chunk):

jsonDownloadCopy code{ "type": "assistant_audio", "mimeType": "audio/pcm;rate=24000", "data": "<base64>" }

1. نهاية الرد:

jsonDownloadCopy code{ "type": "assistant_done" }

5) System Instruction للمودل (أساسي)
ضع System Instruction ثابتة في السيرفر (ضمن setup للـ Live session أو ضمن أول message):

* أنت مساعد متخصص حصرياً في هندسة المعلوماتية وعلوم الحاسب.
* أجب بالعربية بشكل واضح ومختصر مناسب للصوت.
* إذا خارج النطاق: اعتذار + اقتراح سؤال ضمن الحاسب.
* تجنب الإطالة، وقدّم أمثلة بسيطة عند الحاجة.


6) التعديلات المطلوبة على ملفات المشروع
6.1 frontend/app.js

* احذف/عطّل منطق MediaRecorder وإرسال audio chunks.
* أضف SpeechRecognition:

عرض interim transcript
عند final transcript: send final_transcript للسيرفر


* أضف مشغل صوت PCM 24kHz:

queue لتشغيل chunks بدون تقطيع قدر الإمكان


* أضف Debug console يُظهر:

interim / final transcript
wake result
آخر رسالة status
أخطاء SpeechRecognition



6.2 frontend/index.html

* واجهة عربية RTL
* زر Push‑to‑Talk
* منطقة تظهر:

“ما قلته” (final)
“رد المساعد” (text)


* قسم Debug اختياري

6.3 backend/server.js

* استقبل final_transcript
* طبّق wake word gate
* إذا wake=true:

استدعِ generateAudioResponseFromText(cleanText) في gemini-handler
أرسل streaming audio + text للواجهة


* إذا wake=false:

أرسل status ready بدون استدعاء Vertex



6.4 backend/gemini-handler.js

* استبدل أي منطق يعتمد على Audio-to-Text.
* نفّذ عميل Gemini Live (WebSocket) لـ Text → (Text + Audio).
* نفّذ parsing صحيح لرسائل Live streaming وإخراج:

نص الرد
audio inlineData chunks



6.5 backend/config.js و .env.example
أضف إعدادات:

* VERTEX_REGION=us-central1
* VERTEX_MODEL=gemini-live-2.5-flash-native-audio
* VOICE_NAME=Aoede
* WAKE_WORD=روبوت
* DEBUG_MODE=true
* إعدادات OAuth اختيارية:

GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json (اختياري)




7) تشخيص/Debug إلزامي
أريد أن أرى بوضوح:

* النص النهائي الذي التقطه Web Speech API (raw)
* هل wake word انكشف أم لا
* النص المنظّف الذي أُرسل للمودل (clean)
* أي خطأ من Vertex (status + body مقتطف)
* عرض ذلك في:

Console المتصفح
Terminal السيرفر
(اختياري) Debug panel في الواجهة




8) معايير القبول

* عند قول: “روبوت ما هي لغة بايثون”

يظهر final transcript صحيح
wake=true
يصل رد نصي + صوتي ويتم تشغيله


* عند قول: “ما هي لغة بايثون” بدون روبوت

wake=false
لا يوجد استدعاء Vertex
تظهر رسالة “قل: روبوت ثم سؤالك”


* يعمل على Chrome.
* لا يوجد API key في الواجهة.


9) المطلوب تسليمه

* كود كامل بعد التعديل (كل الملفات المتأثرة).
* README محدث يشرح:

تشغيل المشروع
متطلبات Chrome لـ Web Speech API
ملاحظات الخصوصية (Web Speech قد يستخدم خدمة سحابية للـ STT)
كيفية إعداد Vertex Live (region + auth)


* اشرح باختصار كيف يتم تشغيل PCM القادم من المودل.

نفّذ التعديلات الآن وقدّم النتيجة النهائية.