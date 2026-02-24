/**
 * TTS (Text-to-Speech) Handler
 * Uses Google Cloud TTS API to convert text to audio (accepts API Key)
 */

const axios = require('axios');
const { config } = require('./config');

// TTS Configuration from environment variables
const TTS_LANGUAGE = process.env.TTS_LANGUAGE || 'ar-XA';
const TTS_VOICE = process.env.TTS_VOICE || 'ar-XA-Wavenet-B';
const TTS_GENDER = process.env.TTS_GENDER || 'MALE';

/**
 * Convert text to speech using Google Cloud TTS API
 * @param {string} text - Text to convert to speech
 * @returns {Promise<string>} Base64 encoded audio content
 */
async function textToSpeech(text) {
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${config.googleCloudApiKey}`;
    
    console.log('📤 [TTS] URL:', url);
    
    const payload = {
        input: { text: text },
        voice: {
            languageCode: TTS_LANGUAGE,
            name: TTS_VOICE,
            ssmlGender: TTS_GENDER
        },
        audioConfig: {
            audioEncoding: "MP3",
            speakingRate: 1.0,
            pitch: 0
        }
    };

    try {
        const response = await axios.post(url, payload, {
            headers: { 'Content-Type': 'application/json' }
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
        
        // Handle specific errors
        if (error.response?.status === 401) {
            throw new Error('مفتاح API غير صحيح. يرجى التحقق من GOOGLE_CLOUD_API_KEY في ملف .env');
        } else if (error.response?.status === 429) {
            throw new Error('تم تجاوز حد الطلبات. يرجى المحاولة مرة أخرى لاحقاً');
        } else if (error.response?.status === 400) {
            const errorMsg = error.response.data?.error?.message || 'خطأ غير معروف';
            throw new Error('طلب غير صحيح: ' + errorMsg);
        }
        
        throw new Error('فشل الاتصال بـ TTS API: ' + error.message);
    }
}

module.exports = { textToSpeech };
