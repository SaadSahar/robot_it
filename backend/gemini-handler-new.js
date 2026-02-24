/**
 * 🤖 Gemini API Handler - Google AI Studio
 * 
 * يستخدم Google AI Studio API (Generative Language API)
 * وليس Vertex AI - لأنه أسهل وأضمن في العمل
 * 
 * المستندات: https://ai.google.dev/gemini-api/docs
 */

const axios = require('axios');

// ============================================
// ⚙️ الإعدادات
// ============================================

const API_KEY = process.env.GOOGLE_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const DEBUG = process.env.DEBUG_MODE === 'true';

// Base URL لـ Google AI Studio API
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// تعليمات النظام للروبوت
const SYSTEM_INSTRUCTION = `أنت روبوت مساعد متخصص في علوم الحاسب وهندسة المعلوماتية.

📋 قواعدك:
1. أجب فقط على الأسئلة المتعلقة بـ:
   - البرمجة ولغاتها (Python, JavaScript, Java, C++, إلخ)
   - قواعد البيانات (SQL, NoSQL, MySQL, MongoDB, إلخ)
   - الشبكات والإنترنت
   - أنظمة التشغيل (Windows, Linux, macOS)
   - الذكاء الاصطناعي وتعلم الآلة
   - تطوير الويب والتطبيقات
   - الأمن السيبراني
   - هياكل البيانات والخوارزميات

2. إذا كان السؤال خارج نطاق التقنية:
   - اعتذر بلطف
   - اذكر أنك متخصص في علوم الحاسب فقط
   - اقترح أن يسأل سؤالاً تقنياً

3. أسلوب الإجابة:
   - إجابات مختصرة وواضحة (2-4 جمل)
   - استخدم اللغة العربية الفصحى البسيطة
   - تجنب الإجابات الطويلة جداً لأنها ستُنطق صوتياً

4. أنت روبوت في جامعة، فكن:
   - ودوداً ومحترماً
   - مفيداً وعملياً
   - دقيقاً في المعلومات`;

// ============================================
// 🔧 دالة التحقق من الإعدادات
// ============================================

function validateConfig() {
    if (!API_KEY) {
        console.error('❌ [GEMINI] GOOGLE_API_KEY غير موجود في ملف .env');
        console.log('💡 [GEMINI] احصل على مفتاح مجاني من: https://aistudio.google.com/apikey');
        return false;
    }
    
    if (DEBUG) {
        console.log('✅ [GEMINI] API Key موجود');
        console.log(`🤖 [GEMINI] النموذج: ${MODEL}`);
    }
    
    return true;
}

// ============================================
// 🚀 دالة توليد الرد (بدون Streaming)
// ============================================

async function generateResponse(userMessage) {
    if (!validateConfig()) {
        throw new Error('إعدادات Gemini غير صحيحة');
    }
    
    const url = `${BASE_URL}/models/${MODEL}:generateContent?key=${API_KEY}`;
    
    if (DEBUG) {
        console.log(`📤 [GEMINI] URL: ${url.replace(API_KEY, 'API_KEY_HIDDEN')}`);
        console.log(`📤 [GEMINI] السؤال: ${userMessage}`);
    }
    
    try {
        const response = await axios.post(url, {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: userMessage }]
                }
            ],
            systemInstruction: {
                parts: [{ text: SYSTEM_INSTRUCTION }]
            },
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 500,  // قصير للنطق الصوتي
            },
            safetySettings: [
                {
                    category: 'HARM_CATEGORY_HARASSMENT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_HATE_SPEECH',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                },
                {
                    category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                    threshold: 'BLOCK_MEDIUM_AND_ABOVE'
                }
            ]
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 30000  // 30 ثانية timeout
        });
        
        // استخراج النص من الرد
        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!text) {
            console.error('❌ [GEMINI] لا يوجد نص في الرد:', JSON.stringify(response.data, null, 2));
            throw new Error('لم يتم استلام رد من النموذج');
        }
        
        if (DEBUG) {
            console.log(`📥 [GEMINI] الرد: ${text}`);
        }
        
        return text;
        
    } catch (error) {
        // معالجة الأخطاء بالتفصيل
        if (error.response) {
            // الخادم رد بخطأ
            const status = error.response.status;
            const data = error.response.data;
            
            console.error(`❌ [GEMINI] خطأ HTTP ${status}:`, JSON.stringify(data, null, 2));
            
            if (status === 400) {
                throw new Error('طلب غير صالح - تحقق من صيغة الرسالة');
            } else if (status === 401 || status === 403) {
                throw new Error('مفتاح API غير صالح - تحقق من GOOGLE_API_KEY');
            } else if (status === 404) {
                throw new Error(`النموذج ${MODEL} غير موجود - جرب gemini-1.5-flash`);
            } else if (status === 429) {
                throw new Error('تجاوزت حد الطلبات - انتظر قليلاً');
            } else if (status === 500 || status === 503) {
                throw new Error('خطأ في خادم Google - حاول مرة أخرى');
            } else {
                throw new Error(`خطأ غير متوقع: ${status}`);
            }
        } else if (error.code === 'ECONNABORTED') {
            console.error('❌ [GEMINI] انتهت مهلة الاتصال');
            throw new Error('انتهت مهلة الاتصال - تحقق من الإنترنت');
        } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            console.error('❌ [GEMINI] فشل الاتصال بالخادم');
            throw new Error('فشل الاتصال - تحقق من الإنترنت');
        } else {
            console.error('❌ [GEMINI] خطأ:', error.message);
            throw new Error(`خطأ: ${error.message}`);
        }
    }
}

// ============================================
// 🚀 دالة توليد الرد مع Streaming
// ============================================

async function generateResponseStream(userMessage, onChunk, onDone, onError) {
    if (!validateConfig()) {
        onError(new Error('إعدادات Gemini غير صحيحة'));
        return;
    }
    
    // استخدام streamGenerateContent
    const url = `${BASE_URL}/models/${MODEL}:streamGenerateContent?key=${API_KEY}&alt=sse`;
    
    if (DEBUG) {
        console.log(`📤 [GEMINI-STREAM] URL: ${url.replace(API_KEY, 'API_KEY_HIDDEN')}`);
        console.log(`📤 [GEMINI-STREAM] السؤال: ${userMessage}`);
    }
    
    try {
        const response = await axios({
            method: 'POST',
            url: url,
            data: {
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: userMessage }]
                    }
                ],
                systemInstruction: {
                    parts: [{ text: SYSTEM_INSTRUCTION }]
                },
                generationConfig: {
                    temperature: 0.7,
                    topK: 40,
                    topP: 0.95,
                    maxOutputTokens: 500,
                }
            },
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream'
            },
            responseType: 'stream',
            timeout: 60000  // 60 ثانية للـ streaming
        });
        
        let fullText = '';
        let buffer = '';
        
        response.data.on('data', (chunk) => {
            buffer += chunk.toString();
            
            // معالجة SSE events
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';  // احتفظ بالسطر غير المكتمل
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonStr = line.slice(6).trim();
                    
                    if (jsonStr === '[DONE]') {
                        continue;
                    }
                    
                    try {
                        const data = JSON.parse(jsonStr);
                        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                        
                        if (text) {
                            fullText += text;
                            
                            if (DEBUG) {
                                console.log(`📥 [GEMINI-STREAM] Chunk: "${text}"`);
                            }
                            
                            onChunk(text);
                        }
                    } catch (e) {
                        // تجاهل JSON غير صالح
                        if (DEBUG) {
                            console.log(`⚠️ [GEMINI-STREAM] Skip invalid JSON`);
                        }
                    }
                }
            }
        });
        
        response.data.on('end', () => {
            if (DEBUG) {
                console.log(`✅ [GEMINI-STREAM] اكتمل الرد: "${fullText}"`);
            }
            onDone(fullText);
        });
        
        response.data.on('error', (err) => {
            console.error(`❌ [GEMINI-STREAM] خطأ في Stream:`, err.message);
            onError(err);
        });
        
    } catch (error) {
        console.error(`❌ [GEMINI-STREAM] خطأ:`, error.message);
        
        // fallback إلى الطريقة العادية
        console.log(`🔄 [GEMINI-STREAM] جاري المحاولة بدون streaming...`);
        
        try {
            const text = await generateResponse(userMessage);
            onChunk(text);
            onDone(text);
        } catch (fallbackError) {
            onError(fallbackError);
        }
    }
}

// ============================================
// 🧪 دالة اختبار الاتصال
// ============================================

async function testConnection() {
    console.log('🧪 [GEMINI] اختبار الاتصال...');
    
    try {
        const response = await generateResponse('قل مرحبا');
        console.log('✅ [GEMINI] الاتصال ناجح!');
        console.log(`📥 [GEMINI] الرد: ${response}`);
        return true;
    } catch (error) {
        console.error('❌ [GEMINI] فشل الاختبار:', error.message);
        return false;
    }
}

// ============================================
// 📤 التصدير
// ============================================

module.exports = {
    generateResponse,
    generateResponseStream,
    testConnection,
    validateConfig
};
