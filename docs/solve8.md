
أنت AI Agent/مهندس برمجيات. لدينا روبوت جامعي تقني: الميكروفون على الروبوت يرسل الصوت للابتوب، والابتوب هو مركز المعالجة، ثم يخرج الصوت من سماعة الروبوت. المطلوب تعديل المشروع لتحقيق “النطق العربي التلقائي والفوري” بمجرد وصول الرد من النموذج، مع بث الرد على دفعات أثناء التوليد لتقليل التأخير. لا تغيّر هوية المشروع إلى “موقع”، هو “روبوت” يدار من لابتوب متصل بميكروفون وسماعة الروبوت.

1. أهداف التعديل


* نطق عربي تلقائي Auto‑Speak: يبدأ النطق فور وصول أول جزء من الرد بدون الضغط على زر “انطق العربية”. يجب أن يكفي أي تفاعل أولي من المستخدم (زر البدء/التحدث) للسماح بالتشغيل الصوتي لاحقاً تلقائياً.
* بث الرد والتكلم أثناء البث: استلم نص النموذج على دفعات (streaming) ثم انطق جُملاً قصيرة متى ظهرت علامات الوقف أو طولٌ معيّن (مثلاً 120 حرفاً)، بدلاً من الانتظار حتى اكتمال الرد.
* موثوقية عربية: اختيار صوت عربي تلقائياً عبر Web Speech Synthesis بعد انتظار حدث voiceschanged، مع خطة بديلة إن لم تتوفر أصوات عربية على الجهاز.
* إلغاء الاعتماد على Google Cloud TTS بمفتاح API (سبب الخطأ 401) وتفعيل مسارين:
A) المتصفح (افتراضي): Web Speech Synthesis بلا مفاتيح.
B) اختياري احترافي: Google Cloud TTS عبر OAuth/ADC إذا توفرت بيانات اعتماد خدمة.
* الإبقاء على Vertex AI عبر REST مع streamGenerateContent وإعادة إرسال الدفعات إلى الواجهة.


1. اعتبارات مرجعية (لا تغيّرها؛ استخدمها كقواعد)


* استخدم Vertex “streamGenerateContent” لإرسال الرد كنص متدفق عبر SSE/stream، لا استجابة واحدة، لأن هذا ما يمكّن النطق شبه الفوري. نقطة النهاية: POST https://aiplatform.googleapis.com/v1/{model}:streamGenerateContent مع نموذج publishers/google/models/… أو مشروع/موقع. (cloud.google.com cloud.google.com)
* انتظر حدث SpeechSynthesis “voiceschanged” قبل استدعاء getVoices() لاختيار صوت عربي متوفر؛ بعض المتصفحات تُحمّل قائمة الأصوات بشكل غير متزامن. (developer.mozilla.org developer.mozilla.org)
* Google Cloud Text‑to‑Speech يتطلب اعتماداً عبر ADC/OAuth (gcloud أو Service Account)، وليس مفاتيح API عادية؛ لذلك توقّفنا عن استدعائه بمفتاح API لتجنّب 401. إن فعّلت المسار الاحترافي، احصل على access token وأرسله في Authorization: Bearer. (cloud.google.com)


1. بنية التنفيذ بعد التعديل


* الإدخال: المايك على الروبوت → اللابتوب يلتقط الصوت ويحوّله لنص عبر Web Speech Recognition (أو نفس المصدر الحالي لديك).
* الاستدلال: الخادم يرسل النص إلى Vertex عبر streamGenerateContent ويقرأ الدفق النصي تدريجياً.
* الإخراج: الواجهة تنطق فوراً بالعربية باستخدام Web Speech Synthesis، وتستمر بالنطق مع وصول الدُفعات، ثم تُنهي عند اكتمال الرد. مسار سحابي اختياري لـ TTS عبر OAuth.


1. تعديلات الخادم (Node.js)


* تفعيل البث مع Vertex:

استدعِ streamGenerateContent واعالج “event-stream/SSE” كسطور data: … وأعد إرسال الدفعات للعميل عبر WebSocket برسائل:
{ "type": "assistant_delta", "text": "..." }
وعند اكتمال الرد: { "type": "assistant_done" }.


* مثال توجيهي مبسّط (لا تربطه بمفتاح API؛ اعتمد ADC إن لزم، وإلا استخدم API key فقط لواجهة Vertex المسموح بها لديك):

jsDownloadCopy code// backend/gemini-text-stream.js
import fetch from 'node-fetch';

export async function streamGemini({ model, apiKey, contents, onChunk }) {
  const url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:streamGenerateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents })
  });
  if (!res.ok) throw new Error(`Vertex error ${res.status}`);

  for await (const chunk of res.body) {
    const lines = chunk.toString('utf8').split('\n').filter(l => l.startsWith('data: '));
    for (const line of lines) {
      const payload = JSON.parse(line.slice(6));
      const part = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (part) onChunk(part);
    }
  }
}

* في WebSocket handler:

عند wake=true أرسل status=thinking ثم نادِ streamGemini مع onChunk: أرسل assistant_delta فوراً مع تراكم نصي داخلي، وأرسل assistant_done في النهاية.




1. تعديلات الواجهة الأمامية (Auto‑Speak عربي افتراضياً)


* مُحدِّث حالة:

عند وصول assistant_delta: أضِف النص إلى منطقة الدردشة وعُدِّه إلى مُجمِّع speakBuffer.


* ناطق متدفق:

أنشئ speakStream مع Queue من الجمل. كلما وُجدت نهاية جملة (., !, ?, …, “.” العربية “.” أو “،” أو “؟” أو طول ≥ 120 حرفاً) قصّ المقطع وأضفه للطابور كـ SpeechSynthesisUtterance.
ابدأ النطق تلقائياً إذا كان AutoSpeak = true.


* اختيار صوت عربي:

انتظر voiceschanged ثم ابحث عن أقرب صوت lang يبدأ بـ "ar" (مثلاً ar‑SA, ar‑EG). إن لم يوجد، أظهر تنبيهاً للمستخدم لتثبيت صوت عربي أو استخدام Chrome/Edge. (developer.mozilla.org)


* كود توجيهي مضغوط:

jsDownloadCopy code// frontend/app.js (مقتطفات أساسية)
let voices = [], arabicVoice = null, autoSpeak = true;
let speakQueue = [], speaking = false, buffer = '';

function initVoices() {
  const load = () => {
    voices = speechSynthesis.getVoices();
    arabicVoice = voices.find(v => v.lang?.toLowerCase().startsWith('ar')) || null;
  };
  load();
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = load; // انتظر تحميل الأصوات
  }
}

function enqueueUtterance(text) {
  const u = new SpeechSynthesisUtterance(text);
  u.lang = (arabicVoice?.lang) || 'ar-SA';
  if (arabicVoice) u.voice = arabicVoice;
  u.rate = 0.92; u.pitch = 1.0; u.volume = 1.0;
  u.onend = () => { speaking = false; playNext(); };
  u.onerror = () => { speaking = false; playNext(); };
  speakQueue.push(u);
  playNext();
}

function playNext() {
  if (speaking || !autoSpeak) return;
  const u = speakQueue.shift();
  if (!u) return;
  speaking = true;
  speechSynthesis.speak(u);
}

function consumeDelta(delta) {
  buffer += delta;
  // قَطعٌ على الوقف أو الطول
  const cutIdx = buffer.search(/[.!?؟،]\s|$/);
  if (cutIdx > 0 && (cutIdx > 110 || /[.!?؟،]/.test(buffer[cutIdx - 1]))) {
    const chunk = buffer.slice(0, cutIdx).trim();
    buffer = buffer.slice(cutIdx).trim();
    if (chunk && autoSpeak) enqueueUtterance(chunk);
  }
}

ws.onmessage = (e) => {
  const msg = JSON.parse(e.data);
  if (msg.type === 'assistant_delta') {
    appendAssistantText(msg.text);   // عرض فوري
    consumeDelta(msg.text);          // نطق فوري
  } else if (msg.type === 'assistant_done') {
    if (buffer) { enqueueUtterance(buffer); buffer = ''; }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initVoices();
  // أي نقرة أولية (بدء جلسة/تحدّث) تكفي لتجاوز قيود التشغيل التلقائي لاحقاً
  document.body.addEventListener('click', () => { /* unlock user gesture */ }, { once: true });
});

* أزِرّة تحكم بسيطة:

مفتاح Auto‑Speak (افتراضي ON) يُحفظ في localStorage.
زر “الصوت العربي” يبقى متاحاً كيدوي لكن غير مطلوب للتشغيل التلقائي.




1. إزالة TTS السحابي بمفتاح API وتفعيل خيار OAuth فقط (اختياري)


* عطّل أي استدعاء إلى https://texttospeech.googleapis.com بمفتاح API، فالخدمة لا تدعم API Keys وتستلزم ADC/OAuth. (cloud.google.com)
* إن أردت دمجه كخيار احترافي:

backend/auth.js: استخدم google-auth-library لاستخراج access token عبر ADC (gcloud auth application-default login أو Service Account).
backend/tts-google.js: استدعِ text:synthesize بـ Authorization: Bearer … وأعد Base64 إلى العميل للتشغيل عبر Audio().
اجعل TTS_BACKEND=browser (افتراضي) | google_oauth.




1. توافق الروبوت/الأجهزة


* تأكد أن مصدر الإدخال هو ميكروفون الروبوت المتصل بالابتوب، وأن خرج الصوت موجّه إلى سماعات الروبوت (الإفتراضي إخراج النظام). وفر إعداداً في الواجهة لاختيار جهاز الإخراج/الإدخال عبر mediaDevices.enumerateDevices() إن لزم.


1. بروتوكول الرسائل (WS) بعد التعديل


* from client:

final_transcript, interim_transcript (كما هو).


* from server:

status, wake_debug (كما هو).
assistant_delta { text } (دفعات)
assistant_done
assistant_text (اختياري للتجميع النهائي)


* ابدأ النطق على assistant_delta، وأنهِ الباقي عند assistant_done.


1. معايير قبول


* عند قول “روبوت ما هي لغة بايثون”:

تظهر جملة أولى في الرد خلال ≤ ثانية تقريباً ويبدأ النطق مباشرة بجزءٍ من الرد، ثم يتابع النطق مع وصول الدُفعات حتى نهاية الرد.
لا يحدث تجميد للصوت؛ تُدار قائمة النطق بالتتابع.
إذا لم يوجد صوت عربي، تظهر رسالة إرشادية لتثبيت صوت عربي أو استخدام Chrome/Edge، ويبقى العرض النصي عاملاً.


* سجلات الخادم تُظهر استخدام streamGenerateContent (SSE) لا generateContent أحاديّة. (cloud.google.com)


1. ملاحظات تشخيص مهمّة


* إن لم يبدأ الصوت تلقائياً: تأكد من وجود تفاعل مستخدم أولي (click) في الجلسة ثم autoSpeak=true.
* إن لم تظهر أصوات عربية: انتظر voiceschanged ثم listVoices؛ إن لم توجد، اعرض إرشاد تثبيت صوت عربي على النظام. (developer.mozilla.org)
* لا تستخدم Google Cloud TTS بمفتاح API؛ إن احتجته، فعّل مسار OAuth كما أعلاه. (cloud.google.com)

END PROMPT
Key Takeaways

* بث فوري: استخدم streamGenerateContent لإرسال الرد كنص متدفق وتشغيل النطق أثناء وصول الدُفعات لخفض التأخير. (cloud.google.com)
* صوت عربي ثابت: انتظر voiceschanged ثم اختر صوتاً لغته تبدأ بـ ar‑ لضمان نطق عربي صحيح. (developer.mozilla.org)
* TTS بدون مفاتيح: فعّل Web Speech Synthesis كمسار افتراضي؛ فـ Cloud TTS يتطلب ADC/OAuth وليس API Keys. (cloud.google.com)
* روبوت لا موقع: اللابتوب هو مركز المعالجة، والمايك/السماعة على الروبوت؛ شغّل النطق تلقائياً فور أول دفعة نصية.