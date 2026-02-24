
[الدور المطلوب منك]
أنت AI Software Engineer خبير في:
- Node.js (Backend + WebSocket)
- Web Audio API (Frontend)
- Google Cloud Authentication (Service Accounts + ADC)
- Gemini Live API (Vertex AI)

مطلوب منك أن:
1. تفهم مشروع روبوت الدردشة الصوتية المرفق (Bot_it / Voice Chatbot).
2. تحل تماماً مشكلة المصادقة الحالية مع Google Cloud / Gemini Live.
3. تجعل المشروع يعمل صوتياً من المتصفح (من لحظة فتح المتصفح حتى سماع رد صوتي من Gemini).
4. لا تنهي عملك إلا بعد التحقق الفعلي (منطقياً) أن الاتصال بـ Gemini Live يعمل، وأنه يمكن إجراء محادثة واحدة ناجحة على الأقل.
5. تشرح لي بإيجاز ما قمتَ به.

==================================================
[وصف المشروع – Voice Chatbot باستخدام Gemini Live]
==================================================

اسم المشروع: روبوت الدردشة الصوتية الذكي  
المجلد: bot_it  

الفكرة:
- تطبيق ويب يتيح التحدث صوتياً مع روبوت دردشة متخصص في علوم الحاسب.
- الواجهة الأمامية (frontend) في المتصفح تلتقط الصوت عبر Web Audio API وتعيد تشغيل صوت الرد.
- الواجهة الخلفية (backend) في Node.js تتصل بـ Gemini Live API عبر WebSocket ثنائي الاتجاه.
- لا يوجد Python في هذا المشروع؛ كل شيء Node + متصفح.

المعمارية باختصار:
- frontend/index.html + app.js + audio-streamer.js + audio-player.js
- backend/server.js: خادم WebSocket يدير الجلسات مع المتصفحات
- backend/auth.js: مصادقة مع Google Cloud (باستخدام google-auth-library)
- backend/gemini-live-handler.js: فتح WebSocket مع Gemini Live API وبث الصوت (16kHz in / 24kHz out)
- config.js: إعدادات عامة (model, voice, language, wake word, إلخ)
- الاتصال بين المتصفح و backend عبر ws://localhost:8080
- الاتصال بين backend و Gemini Live عبر WSS (Vertex AI endpoint)

====================================
[المشكلة الحالية التي تمنع المشروع من العمل]
====================================

عند تشغيل:
    npm start
ثم فتح المتصفح على http://localhost:8080 ومحاولة التحدث، تظهر الرسائل التالية في الـ backend والـ frontend:

في التيرمنال (backend):

    ✗ [AUTH] Failed to get access token: Could not load the default credentials. 
       Browse to https://cloud.google.com/docs/authentication/getting-started for more information.

    ✗ [GEMINI-LIVE] Connection failed: Google Cloud credentials not found. Please:
    1. Create a service account at: https://console.cloud.google.com/iam-admin/serviceaccounts
    2. Download the JSON key file
    3. Set GOOGLE_APPLICATION_CREDENTIALS environment variable to the key file path
       Example: export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json

    ✗ [SERVER] Failed to initialize Gemini Live session: Google Cloud credentials not found...

وفي debug log في الواجهة الأمامية:

    ❌ [FRONTEND] Error: Google Cloud credentials not found ...
    ❌ [FRONTEND] Error: فشل الاتصال: Google Cloud credentials not found ...
    ❌ [FRONTEND] Error: فشل الاتصال بـ Gemini Live API

الخلاصة:
- الـ backend يعمل، الـ WebSocket مع المتصفح يعمل.
- لكن عند محاولة إنشاء جلسة Gemini Live تظهر مشكلة في المصادقة (default credentials غير موجودة).
- المشروع حالياً غير قادر على الاتصال بـ Gemini Live، وبالتالي لا يوجد رد صوتي.

=========================
[ما أريده منك بالتفصيل]
=========================

## 1) إصلاح المصادقة مع Google Cloud / Gemini Live

المطلوب منك أن تجعل `backend/auth.js` و/أو إعدادات المصادقة تعمل بطريقة واضحة وسهلة على Windows، بحيث:

- يمكنني وضع ملف مفتاح الـ Service Account (JSON) في مسار معروف داخل المشروع (مثلاً: `bot_it/credentials/service-account-key.json`).
- أو يمكن قراءة مسار الملف من `.env` (مثلاً: `GOOGLE_APPLICATION_CREDENTIALS`).
- أو الاثنين معاً (الأولوية لمسار `.env`، وإذا لم يوجد يستخدم مسار افتراضي داخل المشروع).

أطلب منك:

1. تحديث `backend/auth.js` بحيث:
   - يتحقق أولاً من وجود متغير البيئة `GOOGLE_APPLICATION_CREDENTIALS`.
   - إذا لم يكن موجوداً، يحاول استخدام مسار افتراضي داخل المشروع (مثال مقترح: `path.join(__dirname, '..', 'credentials', 'service-account-key.json')`).
   - يتحقق فعلاً من وجود ملف JSON في المسار المحدد؛ إذا لم يكن موجوداً، يعيد رسالة خطأ واضحة جداً.
   - يستخدم `GoogleAuth` من google-auth-library للحصول على access token الخاص بـ Vertex AI (مع projectId و region المعطاة في config.js / .env).
   - يُرجع access token صالحاً يمكن لـ gemini-live-handler.js استخدامه فعلياً.

2. تحديث التوثيق (في README أو في تعليق) بحيث يشرح:
   - أين أضع ملف الـ JSON بالضبط.
   - كيف أضبط `GOOGLE_APPLICATION_CREDENTIALS` على Windows (cmd و PowerShell) وعلى Linux.
   - مثال عملي لمسار حقيقي، مثلاً:
     `D:\saad\مشاريع تخرج\bot_it\credentials\my-service-account.json`

3. التأكد أن رسالة الخطأ التي تظهر الآن (Google Cloud credentials not found...) لن تظهر مرة أخرى إذا تم وضع الملف في المكان الصحيح.

## 2) التأكد من تهيئة Google Cloud بشكل صحيح (من الناحية البرمجية)

- افترض أن لدي:
  - مشروع Google Cloud جاهز.
  - Service Account تم إنشاؤه بصلاحيات Vertex AI User.
  - ملف JSON تم تنزيله.
- تأكد أن `auth.js` يستدعي الـ scopes الصحيحة لـ Vertex AI / Gemini Live.
- تأكد أن region و project ID تأتي من config.js أو .env وتُستخدم في إنشاء الـ endpoint لــ Gemini Live.

إذا احتجت إلى تعديل `gemini-live-handler.js` لتغذية access token أو projectId أو region بشكل صحيح، قم بذلك، مع تعليقات توضيحية.

## 3) فحص كامل لتدفق الاتصال (End-to-End Test)

قبل أن تعتبر عملك منتهياً، قم (منطقياً) بالاختبارات التالية وتأكد من أن الكود الذي تعطيه لي يدعمها:

1. **اختبار الخادم فقط:**
   - شغّل: `npm start`
   - تحقق أن:
     - Configuration validated
     - Voice Chatbot Server Started
     - لا توجد رسالة خطأ من [AUTH] أو [GEMINI-LIVE].

2. **اتصال عميل واحد:**
   - افتح المتصفح على: `http://localhost:8080`
   - يجب أن ترى في التيرمنال:
     - `✓ New client connected`
     - `✓ Session created: ...`
     - `Initializing Gemini Live session for ...`
   - لا يجب أن ترى أي خطأ AUTH بعد ذلك.

3. **محادثة تجريبية:**
   - اضغط زر "اضغط للتحدث" في الواجهة.
   - قل مثلاً: "روبوت ما هي لغة بايثون؟"
   - يجب أن يحدث التالي:
     - الـ frontend يرسل الصوت → backend.
     - backend يرسل الصوت إلى Gemini Live.
     - Gemini Live يرد بصوت.
     - AudioPlayer في frontend يشغّل الصوت.
   - سجّل في log (server و frontend) أنه تم استلام رد من Gemini (على الأقل event واحد من نوع audio أو transcript).

4. **Debug Log نظيف:**
   - لا توجد رسائل من نوع:
     - `Google Cloud credentials not found`
     - `Failed to get access token`
     - أو أي ImportError/TypeError تتعلق بالمصادقة أو Gemini Live.

## 4) ما نحتاجه فعلياً من ملفات/تعديلات

أريد منك أن تعطيني، كنص جاهز:

1. نسخة محدثة من `backend/auth.js` (الملف كامل).
2. إذا احتاج الأمر: أجزاء معدّلة من `backend/gemini-live-handler.js` توضح كيف يُستخدم access token و projectId و region و endpoint الخاص بـ Gemini Live.
3. مثال على محتوى `.env` النهائي (مع توضيح القيم المهمة فقط، بدون أسرار حقيقية).
4. خطوات واضحة (بالعربية) أستطيع اتباعها على Windows لتشغيل المشروع:
   - أين أضع ملف JSON.
   - أي أوامر `set` أو `export` أستخدمها (أو هل يمكنك جعل الكود يعمل بدون الحاجة لضبط متغير بيئة إذا كان الملف في مجلد credentials داخل المشروع؟ هذا مُفضّل).

## 5) قيود مهمة

- لا تغير منطق المشروع العام (wake word، تدفق الرسائل، إلخ)، ركّز على إصلاح المصادقة والاتصال بـ Gemini Live.
- لا تضف تبعيات npm جديدة غير ضرورية؛ استخدم google-auth-library كما هو.
- الكود يجب أن يعمل على:
  - Node.js 16 أو أحدث.
  - Windows 10/11.
- يجب أن تكون رسائل الخطأ مفهومة وواضحة لمن ليس خبيراً في Google Cloud.

[ملخص سريع]
المشكلة الوحيدة الآن أن الخادم لا يستطيع الحصول على access token من Google Cloud (Google Application Default Credentials غير مضبوطة). أريد منك أن:
- تعالج ذلك برمجياً في auth.js + config.
- تشرح لي أين أضع ملف JSON، وكيف يتعامل الكود مع المسار.
- تتأكد من أن مشروع روبوت الدردشة الصوتية يصبح قابلاً للاستخدام الفعلي (أستطيع أن أقول "روبوت ما هي لغة بايثون؟" وأسمع إجابة صوتية).

لا تنهِ رسالتك إلا بعد أن تتأكد منطقيّاً أن جميع هذه الشروط تتحقق في الكود الذي تقدمه لي.


