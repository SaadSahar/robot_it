أنت AI Agent/مهندس Full-Stack خبير. مشروع روبوت الدردشة الصوتية يعمل بنجاح، لكن توجد **مشكلة في نطق النص العربي**.

---

## 🔴 المشكلة الحالية

**الأعراض:**
- الصوت يعمل ✅
- الكلمات الإنجليزية تُنطق بشكل صحيح ✅
- الرموز والأرقام تُنطق ✅
- **الكلمات العربية لا تُنطق** ❌ (يتم تخطيها أو صمت)

**مثال:**
النص: "بايثون هي لغة برمجة Python سهلة التعلم"
ما يُنطق: "Python" (فقط الكلمة الإنجليزية)
ما لا يُنطق: "بايثون هي لغة برمجة سهلة التعلم"

---

## 🎯 سبب المشكلة

Web Speech API يحتاج إلى **صوت عربي مُثبّت** على النظام ليعمل بشكل صحيح. المشكلة تحدث عندما:

1. **لا يوجد صوت عربي** على نظام التشغيل
2. **اللغة غير محددة بشكل صحيح** في الكود
3. **الأصوات لم تُحمّل بعد** عند استدعاء `speak()`
4. **الصوت المختار لا يدعم العربية** فعلياً

---

## 📁 هيكل المشروع الحالي

bot_it/
├── backend/
│   ├── config.js
│   ├── gemini-handler.js
│   └── server.js
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js          ← التعديلات الرئيسية هنا
├── .env
└── package.json

---

## 🔧 الحل الشامل (3 خطوات)

### الخطوة 1️⃣: إصلاح دالة TTS في `frontend/app.js`

**احذف** دالة `speakText` القديمة و**استبدلها** بهذا الكود الكامل:

```javascript
// ============================================
// 🔊 نظام تحويل النص إلى صوت (TTS) - نسخة محسنة للعربية
// ============================================

// متغير عام لحفظ الأصوات
let availableVoices = [];
let arabicVoice = null;

/**
 * تحميل الأصوات المتاحة
 */
function loadVoices() {
    return new Promise((resolve) => {
        availableVoices = window.speechSynthesis.getVoices();
        
        if (availableVoices.length > 0) {
            console.log('🎤 [TTS] الأصوات المتاحة:', availableVoices.length);
            
            // طباعة جميع الأصوات للتشخيص
            console.log('📋 [TTS] قائمة الأصوات:');
            availableVoices.forEach((voice, i) => {
                console.log(`   ${i}: ${voice.name} (${voice.lang}) ${voice.localService ? '[محلي]' : '[سحابي]'}`);
            });
            
            // البحث عن صوت عربي (بالترتيب حسب الأفضلية)
            arabicVoice = findBestArabicVoice();
            
            if (arabicVoice) {
                console.log('✅ [TTS] تم اختيار الصوت العربي:', arabicVoice.name);
            } else {
                console.warn('⚠️ [TTS] لم يتم العثور على صوت عربي!');
            }
            
            resolve(availableVoices);
        } else {
            // إعادة المحاولة بعد 100ms
            setTimeout(() => loadVoices().then(resolve), 100);
        }
    });
}

/**
 * البحث عن أفضل صوت عربي متاح
 */
function findBestArabicVoice() {
    // قائمة أسماء الأصوات العربية المفضلة (بالترتيب)
    const preferredVoices = [
        'Microsoft Hamed',           // Windows 11 - عربي سعودي
        'Microsoft Naayf',           // Windows 11 - عربي سعودي
        'Google العربية',            // Chrome - عربي
        'Google Arabic',             // Chrome - عربي
        'Arabic',                    // عام
        'ar-SA',                     // سعودي
        'ar-EG',                     // مصري
        'ar-AE',                     // إماراتي
        'ar'                         // أي عربي
    ];
    
    // البحث بالاسم أولاً
    for (const preferred of preferredVoices) {
        const found = availableVoices.find(voice => 
            voice.name.includes(preferred) || 
            voice.lang.includes(preferred)
        );
        if (found) return found;
    }
    
    // البحث بكود اللغة
    const arabicByLang = availableVoices.find(voice => 
        voice.lang.startsWith('ar')
    );
    if (arabicByLang) return arabicByLang;
    
    return null;
}

/**
 * نطق النص بالعربية
 * @param {string} text - النص المراد نطقه
 */
async function speakText(text) {
    // التحقق من دعم المتصفح
    if (!('speechSynthesis' in window)) {
        console.error('❌ [TTS] Web Speech API غير مدعوم');
        showFallbackText(text);
        return;
    }
    
    // إيقاف أي نطق سابق
    window.speechSynthesis.cancel();
    
    // التأكد من تحميل الأصوات
    if (availableVoices.length === 0) {
        console.log('⏳ [TTS] انتظار تحميل الأصوات...');
        await loadVoices();
    }
    
    // إذا لم يوجد صوت عربي، استخدم الحل البديل
    if (!arabicVoice) {
        console.warn('⚠️ [TTS] لا يوجد صوت عربي، جاري تجربة الحل البديل...');
        await speakWithFallback(text);
        return;
    }
    
    // إنشاء الـ utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // ✅ تعيين الصوت العربي صراحةً
    utterance.voice = arabicVoice;
    utterance.lang = arabicVoice.lang; // استخدام لغة الصوت نفسه
    
    // إعدادات الصوت
    utterance.rate = 0.9;      // أبطأ قليلاً للوضوح
    utterance.pitch = 1.0;     // درجة الصوت
    utterance.volume = 1.0;    // مستوى الصوت
    
    // معالجة الأحداث
    utterance.onstart = () => {
        console.log('🔊 [TTS] بدء النطق...');
        updateStatus('speaking', 'جاري الرد الصوتي...');
        showVoiceIndicator(true);
    };
    
    utterance.onend = () => {
        console.log('✅ [TTS] انتهى النطق');
        updateStatus('ready', 'جاهز للاستماع');
        showVoiceIndicator(false);
    };
    
    utterance.onerror = (event) => {
        console.error('❌ [TTS] خطأ:', event.error);
        showVoiceIndicator(false);
        
        // محاولة الحل البديل عند الخطأ
        if (event.error === 'not-allowed' || event.error === 'audio-busy') {
            speakWithFallback(text);
        }
    };
    
    // النطق
    console.log('🎤 [TTS] نطق النص:', text.substring(0, 50) + '...');
    console.log('🎤 [TTS] الصوت المستخدم:', arabicVoice.name, '(' + arabicVoice.lang + ')');
    
    window.speechSynthesis.speak(utterance);
}

/**
 * الحل البديل: تقسيم النص ونطقه
 * (يعمل بشكل أفضل في بعض المتصفحات)
 */
async function speakWithFallback(text) {
    console.log('🔄 [TTS] استخدام الحل البديل...');
    
    // تقسيم النص إلى جمل
    const sentences = text.split(/[.،؟!]/g).filter(s => s.trim());
    
    for (const sentence of sentences) {
        if (sentence.trim()) {
            await speakSentence(sentence.trim());
            // انتظار قصير بين الجمل
            await new Promise(resolve => setTimeout(resolve, 300));
        }
    }
}

/**
 * نطق جملة واحدة
 */
function speakSentence(sentence) {
    return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(sentence);
        
        // تجربة لغات عربية مختلفة
        utterance.lang = 'ar-SA'; // جرب: ar-SA, ar-EG, ar-AE, ar
        
        if (arabicVoice) {
            utterance.voice = arabicVoice;
        }
        
        utterance.rate = 0.85;
        utterance.onend = resolve;
        utterance.onerror = resolve;
        
        window.speechSynthesis.speak(utterance);
    });
}

/**
 * عرض مؤشر الصوت
 */
function showVoiceIndicator(show) {
    const indicator = document.getElementById('voice-indicator');
    if (indicator) {
        indicator.style.display = show ? 'flex' : 'none';
    }
}

/**
 * عرض النص كبديل إذا فشل الصوت
 */
function showFallbackText(text) {
    console.log('📝 [TTS] عرض النص بدلاً من الصوت');
    // يمكن إضافة تنبيه للمستخدم هنا
}

// ============================================
// 🚀 التهيئة عند تحميل الصفحة
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
    console.log('🔄 [TTS] تهيئة نظام الصوت...');
    
    // تحميل الأصوات
    if ('speechSynthesis' in window) {
        // Chrome يحتاج إلى هذا الحدث
        window.speechSynthesis.onvoiceschanged = () => {
            loadVoices();
        };
        
        // Firefox و Safari
        await loadVoices();
    }
});

// ============================================
// 🧪 دالة اختبار - يمكن استدعاؤها من Console
// ============================================

window.testArabicTTS = function() {
    const testText = "مرحباً، هذا اختبار للنطق باللغة العربية. هل تسمعني؟";
    console.log('🧪 [TEST] اختبار النطق العربي:', testText);
    speakText(testText);
};

window.listVoices = function() {
    const voices = window.speechSynthesis.getVoices();
    console.table(voices.map(v => ({
        name: v.name,
        lang: v.lang,
        local: v.localService
    })));
};

الخطوة 2️⃣: تعديل معالج الرسائل
تأكد أن دالة معالجة رد المساعد تستدعي speakText:
javascriptDownloadCopy code// في نفس الملف app.js
// عدّل دالة معالجة رسائل WebSocket

function handleWebSocketMessage(event) {
    const message = JSON.parse(event.data);
    console.log('📥 [WS] رسالة واردة:', message.type);
    
    switch (message.type) {
        case 'assistant_text':
            // عرض النص في الدردشة
            addMessageToChat('assistant', message.text);
            
            // ✅ نطق الرد صوتياً
            speakText(message.text);
            break;
            
        case 'status':
            updateStatus(message.status, message.message);
            break;
            
        case 'wake_debug':
            console.log('🔍 [DEBUG] Wake word:', message);
            break;
            
        case 'error':
            console.error('❌ [ERROR]:', message.message);
            updateStatus('error', message.message);
            break;
            
        case 'assistant_done':
            console.log('✅ [WS] انتهى الرد');
            break;
    }
}
الخطوة 3️⃣: إضافة أزرار تشخيص في الواجهة (اختياري لكن مفيد)
أضف في frontend/index.html قسم تشخيص:
htmlDownloadCopy code<!-- أضف هذا في نهاية body قبل </body> -->
<div id="debug-panel" style="
    position: fixed;
    bottom: 10px;
    left: 10px;
    background: #f5f5f5;
    padding: 10px;
    border-radius: 8px;
    font-size: 12px;
    z-index: 1000;
">
    <strong>🔧 تشخيص الصوت:</strong><br>
    <button onclick="testArabicTTS()" style="margin: 5px; padding: 5px 10px;">
        🧪 اختبار النطق العربي
    </button>
    <button onclick="listVoices()" style="margin: 5px; padding: 5px 10px;">
        📋 عرض الأصوات
    </button>
    <div id="voice-status" style="margin-top: 5px; color: #666;"></div>
</div>

🛠️ حلول إضافية إذا استمرت المشكلة
الحل البديل 1: تثبيت أصوات عربية على Windows

1. افتح Settings → Time & Language → Speech
2. انقر على Add voices
3. ابحث عن Arabic واختر:

Arabic (Saudi Arabia)
Arabic (Egypt)


4. انقر Add وانتظر التثبيت
5. أعد تشغيل المتصفح

الحل البديل 2: استخدام ResponsiveVoice (مجاني)
إذا لم تعمل Web Speech API، أضف ResponsiveVoice:
htmlDownloadCopy code<!-- في index.html قبل </head> -->
<script src="https://code.responsivevoice.org/responsivevoice.js?key=FREE"></script>
javascriptDownloadCopy code// في app.js - دالة بديلة
function speakWithResponsiveVoice(text) {
    if (typeof responsiveVoice !== 'undefined') {
        responsiveVoice.speak(text, "Arabic Female", {
            rate: 0.9,
            pitch: 1,
            onstart: () => {
                console.log('🔊 [RV] بدء النطق');
                updateStatus('speaking', 'جاري الرد...');
            },
            onend: () => {
                console.log('✅ [RV] انتهى النطق');
                updateStatus('ready', 'جاهز');
            }
        });
    }
}

// عدّل speakText لاستخدام ResponsiveVoice كبديل
async function speakText(text) {
    // جرب Web Speech أولاً
    if (arabicVoice) {
        // ... الكود السابق
    } else {
        // استخدم ResponsiveVoice كبديل
        speakWithResponsiveVoice(text);
    }
}
الحل البديل 3: Google Cloud TTS مع Service Account
إذا كنت تريد جودة احترافية، استخدم Google Cloud TTS:
javascriptDownloadCopy code// في backend/tts-handler.js
async function textToSpeechGoogle(text) {
    // يحتاج Service Account وليس API Key عادي
    // راجع: https://cloud.google.com/text-to-speech/docs/authentication
}

📊 معايير القبول
✅ يجب أن يعمل:

1.  عند قول "روبوت ما هي بايثون" → يُسمع الرد بالعربية
2.  النص العربي يُنطق بوضوح
3.  الأرقام والرموز تُنطق
4.  مؤشر الصوت يظهر أثناء النطق

✅ في Console المتصفح:
🎤 [TTS] الأصوات المتاحة: 25
📋 [TTS] قائمة الأصوات:
   0: Microsoft Hamed (ar-SA) [محلي]
   1: Microsoft Naayf (ar-SA) [محلي]
   ...
✅ [TTS] تم اختيار الصوت العربي: Microsoft Hamed
🎤 [TTS] نطق النص: بايثون هي لغة برمجة...
🎤 [TTS] الصوت المستخدم: Microsoft Hamed (ar-SA)
🔊 [TTS] بدء النطق...
✅ [TTS] انتهى النطق

❌ لا يجب أن ترى:
⚠️ [TTS] لم يتم العثور على صوت عربي!


🧪 خطوات الاختبار

1. افتح المتصفح (Chrome مفضل)
2. اذهب إلى http://localhost:3000
3. افتح Console (F12 → Console)
4. انقر زر "اختبار النطق العربي" في لوحة التشخيص
5. تحقق من السجلات في Console
6. إذا لم يعمل:

انقر "عرض الأصوات" وتحقق من وجود صوت عربي
إذا لا يوجد → ثبّت أصوات عربية من إعدادات Windows




💡 نصائح مهمة

1. Chrome يوفر أصوات عربية سحابية عالية الجودة
2. Edge يستخدم أصوات Microsoft العربية الممتازة
3. Firefox قد لا يحتوي على أصوات عربية
4. Windows 10/11 يمكن تثبيت أصوات عربية من الإعدادات


نفّذ هذه التعديلات وأخبرني بنتيجة:

1. ما الأصوات الموجودة؟ (من Console)
2. هل يوجد صوت عربي؟
3. ما الخطأ إن وجد؟