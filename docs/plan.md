markdownDownloadCopy codeأنت AI Agent/مهندس برمجيات Full‑Stack خبير. نفّذ مشروع موقع ويب لروبوت دردشة صوتي “وقت فعلي” باستخدام **Vertex AI (Google Cloud) عبر REST** بنفس أسلوب الاستدعاء الموجود في المثال المرفق (endpoint `aiplatform.googleapis.com` + `:streamGenerateContent?key=...`). المطلوب تسليم كود كامل جاهز للتشغيل + توثيق.

---

## 1) الهدف (What to build)
موقع ويب أتحدث معه بالصوت ويجيبني بالصوت **Real-time streaming**.

### شرط “كلمة التنبيه”
- الروبوت **لا يرد** إلا إذا بدأت جملتي بكلمة: **"روبوت"**.
- مثال صحيح: “روبوت ما هي لغة بايثون؟”
- مثال يُتجاهل: “ما هي لغة بايثون؟”

### نطاق المعرفة (Domain)
- الروبوت متخصص فقط في **هندسة المعلوماتية / علوم الحاسب** (برمجة، شبكات، قواعد بيانات، أمن، ذكاء اصطناعي، أنظمة تشغيل…).
- أي سؤال خارج هذا النطاق: اعتذار + توجيه للعودة لأسئلة الحاسب.

---

## 2) قيد تقني مهم جداً
- الاعتماد على **Vertex AI Gemini**.
- المودل المطلوب للمحادثة الصوتية:
  - `gemini-live-2.5-flash-native-audio`
- **تحويل الصوت↔نص يجب أن يقوم به نفس المودل** (لا تستخدم خدمات STT/TTS منفصلة).
- واجب: الصوت يدخل للمودل والصوت يخرج من المودل (native audio).

> ملاحظة: بما أن “الاستيقاظ/التحقق من كلمة روبوت” يحتاج فهم بداية الكلام، استخدم نفس مودل Gemini نفسه لاستخراج Transcript (نص) بشكل “تحقق فقط” ثم إن كان صحيحاً اطلب منه الرد صوتياً. ممنوع استخدام Google Speech-to-Text أو Text-to-Speech.

---

## 3) أسلوب الاستدعاء (Vertex REST) — مطابق لفكرة المثال
استخدم REST مثل:
`https://aiplatform.googleapis.com/v1/publishers/google/models/{MODEL}:streamGenerateContent?key={GOOGLE_CLOUD_API_KEY}`

- المفتاح من `.env` باسم: `GOOGLE_CLOUD_API_KEY`
- لا تضع المفتاح في الواجهة الأمامية.

### نموذج Endpoint المطلوب (عدّل MODEL)
- للمودل الصوتي:
`.../models/gemini-live-2.5-flash-native-audio:streamGenerateContent?key=...`

> إذا اختلف اسم/توفر المودل حرفياً في Vertex عند التنفيذ، استخدم الاسم الصحيح حسب وثائق Vertex لديك، لكن **حافظ على نفس المتطلبات**: Live + Native Audio + streaming.

---

## 4) المعمارية المطلوبة (Real-time)
### Frontend
- HTML/CSS/JS (بدون تعقيد Framework إن لم يلزم).
- Web Audio API لالتقاط الصوت من الميكروفون.
- إرسال الصوت إلى السيرفر عبر WebSocket بشكل chunks (لتقليل الـ latency).
- تشغيل الصوت القادم من السيرفر فورياً (streaming playback).
- واجهة عربية RTL + مؤشر حالة: Listening / Detecting / Responding.

### Backend
- Python + FastAPI (أو Node.js إن كنت ستنجز streaming أفضل، لكن افتراضي Python).
- WebSocket endpoint:
  - يستقبل chunks صوت من المتصفح
  - يطبق منطق “كلمة روبوت”
  - يتصل بـ Vertex `streamGenerateContent`
  - يعيد للمستخدم audio chunks للرد

---

## 5) منطق “كلمة روبوت” بدون STT خارجي (Two-step باستخدام نفس المودل)
نفّذ **مرحلتين** وكلتاهما عبر Vertex وبنفس Gemini (بدون خدمات أخرى):

### المرحلة A — كشف كلمة التنبيه (Detection)
- عند وصول أول 1–2 ثانية من الصوت (أو أول utterance حسب VAD):
  - أرسل الصوت إلى Vertex واطلب **مخرجات نص فقط** (TEXT).
  - اطلب من المودل إرجاع JSON فقط بالشكل:
  ```json
  {"wake": true/false, "transcript": "...", "reason": "..."}

* اعتبر wake=true فقط إذا بدأ الـ transcript فعلاً بكلمة "روبوت" (مع تسامح بسيط للتشكيل/الهمزات/علامات الترقيم).
* إن wake=false:

لا ترسل أي رد صوتي
أعِد للواجهة حالة “جاهز، قل: روبوت …” بدون إزعاج.



المرحلة B — الرد الصوتي (Answer)

* فقط إن wake=true:

أعد إرسال الصوت (أو الجزء بعد كلمة روبوت إن استطعت قصّه) إلى المودل
واطلب مخرجات صوت (AUDIO) streaming
الرد بالعربية وباختصار مناسب للصوت
التزم بنطاق هندسة المعلوماتية فقط




مهم: كل التحويلات (فهم الصوت + إنتاج صوت) تتم داخل Gemini Live Native Audio.


6) شكل Payloads (إرشادي) بأسلوب Vertex REST
إدخال الصوت

* أرسل الصوت كـ base64 داخل inline_data.
* استخدم mime_type مناسب مثل:

audio/wav (أسهل)
أو PCM خام مع rate إذا مدعوم: audio/pcm;rate=16000


* اختر صيغة واحدة ثابتة في المشروع، وطبّقها في الواجهة + السيرفر.

Payload للمرحلة A (Detection / TEXT)
jsonDownloadCopy code{
  "contents": [{
    "role": "user",
    "parts": [
      {
        "inline_data": {
          "mime_type": "audio/wav",
          "data": "<BASE64_AUDIO>"
        }
      },
      {
        "text": "حلّل بداية هذا الصوت فقط. أعد JSON فقط بالشكل: {\"wake\": boolean, \"transcript\": string, \"reason\": string}. wake=true فقط إذا كانت أول كلمة منطوقة هي 'روبوت'. لا تضف أي نص خارج JSON."
      }
    ]
  }],
  "generationConfig": {
    "temperature": 0.0
  }
}
Payload للمرحلة B (Answer / AUDIO)
jsonDownloadCopy code{
  "contents": [{
    "role": "user",
    "parts": [
      {
        "inline_data": {
          "mime_type": "audio/wav",
          "data": "<BASE64_AUDIO>"
        }
      },
      {
        "text": "أنت مساعد صوتي متخصص في هندسة المعلوماتية وعلوم الحاسب فقط. إذا كان السؤال خارج هذا النطاق اعتذر باختصار. أجب بالعربية وبشكل واضح ومختصر مناسب للصوت."
      }
    ]
  }],
  "generationConfig": {
    "temperature": 0.4
  }
}

أنت كـ Agent مسؤول عن قراءة استجابة :streamGenerateContent (التي قد تأتي كـ streamed JSON lines) واستخراج أي inline_data صوتي في response (base64) وتمريره للواجهة لتشغيله.


7) المتطلبات البرمجية التفصيلية
A) التقاط الصوت في المتصفح

* زر “اضغط للتحدث” Push-to-Talk (لتسهيل كشف بداية الكلام).
* سجّل WAV mono 16kHz إن أمكن (أو WebM/Opus ثم حوّله في السيرفر إلى WAV/PCM).
* قسّم الصوت إلى chunks وأرسلها للسيرفر، مع رسالة “end_of_utterance” عند ترك الزر.

B) تشغيل الصوت

* عندما يستقبل المتصفح base64 audio من السيرفر:

حوّله إلى Blob
شغله عبر <audio> أو WebAudio buffer


* شغّل chunks فوراً إن أمكن (streaming)، أو اجمعها مؤقتاً إن كانت الصيغة لا تسمح بالتشغيل الجزئي.

C) السيرفر

* FastAPI + WebSocket:

إدارة جلسة لكل عميل
تجميع الصوت حتى نهاية utterance
تنفيذ المرحلة A ثم B عند الحاجة


* عميل Vertex عبر requests (للـ REST) مع دعم قراءة streaming response.
* عزل الإعدادات في .env:

GOOGLE_CLOUD_API_KEY
VERTEX_MODEL_AUDIO=gemini-live-2.5-flash-native-audio
WAKE_WORD=روبوت



D) سياسة المحتوى (System rules)

* ضمن نص التعليمات للمودل (في المرحلة B) شدّد:

التخصص CS فقط
الإجابات قصيرة وواضحة
إن طلب المستخدم شيئاً خارج النطاق → اعتذار + اقتراح سؤال بديل ضمن الحاسب




8) هيكل المشروع المطلوب
اقترح هيكل واضح مثل:
project/
  backend/
    main.py
    vertex_client.py
    audio_utils.py
    vad.py (اختياري)
    .env.example
    requirements.txt
  frontend/
    index.html
    styles.css
    app.js
  README.md


9) معايير القبول

* الموقع يعمل محلياً.
* لا رد بدون “روبوت”.
* الرد صوتي من المودل نفسه.
* Streaming قدر الإمكان لتقليل التأخير.
* رفض/اعتذار عن الأسئلة خارج هندسة المعلوماتية.
* README فيه خطوات التشغيل + ملاحظات عن الصيغ الصوتية (WAV/PCM) وسبب اختيارها.


10) مخرجاتك المطلوبة كـ AI Agent

1. الكود كاملاً (Frontend + Backend)
2. ملف .env.example
3. README عربي واضح
4. شرح سريع لكيفية عمل streaming parsing لاستجابة :streamGenerateContent

ابدأ بالتنفيذ مباشرة وقدّم الحل النهائي.

إذا تحب، أقدر أضيف داخل البرومبت “مقطع كود مرجعي” صغير يوضح **طريقة قراءة streamed response من Vertex** في بايثون (لأنها عادة ترجع كسطور JSON متتابعة)، لكن البرومبت أعلاه كافٍ كـ spec لتنفيذ المشروع.