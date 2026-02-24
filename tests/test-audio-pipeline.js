/**
 * 🧪 Test Script for Voice Chatbot Audio Pipeline
 * 
 * This script tests the complete audio processing pipeline:
 * 1. Convert audio (M4A) to text using Google Cloud Speech-to-Text
 * 2. Get AI response from Gemini API
 * 3. Convert response text to audio using Google Cloud TTS
 * 4. Save the audio output to a file
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

// ============================================
// ⚙️ Configuration
// ============================================

const INPUT_AUDIO_FILE = path.join(__dirname, 's.m4a');
const OUTPUT_AUDIO_FILE = path.join(__dirname, 'response_audio.wav');
const OUTPUT_TEXT_FILE = path.join(__dirname, 'response_text.txt');

// Google Cloud Configuration
const API_KEY = process.env.GOOGLE_CLOUD_API_KEY;
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;

// Gemini Configuration
const GEMINI_API_KEY = process.env.GOOGLE_CLOUD_API_KEY; // Using same key for simplicity
const GEMINI_MODEL = 'gemini-2.0-flash-exp';

// TTS Configuration
const TTS_LANGUAGE_CODE = 'ar-EG';
const TTS_VOICE_NAME = 'ar-EG-Wavenet-A'; // Arabic Egypt - Male

// System Instruction
const SYSTEM_INSTRUCTION = `أنت روبوت مساعد متخصص في علوم الحاسب وهندسة المعلوماتية.

📋 قواعدك:
1. أجب فقط على الأسئلة المتعلقة بـ:
   - البرمجة ولغاتها
   - قواعد البيانات
   - الشبكات والإنترنت
   - أنظمة التشغيل
   - الذكاء الاصطناعي وتعلم الآلة
   - تطوير الويب والتطبيقات
   - الأمن السيبراني
   - هياكل البيانات والخوارزميات

2. إذا كان السؤال خارج نطاق التقنية:
   - اعتذر بلطف
   - اذكر أنك متخصص في علوم الحاسب فقط

3. أسلوب الإجابة:
   - إجابات مختصرة وواضحة (2-4 جمل)
   - استخدم اللغة العربية الفصحى البسيطة
   - تجنب الإجابات الطويلة جداً`;

// ============================================
// 🎤 Step 1: Convert Audio to Text (Speech-to-Text)
// ============================================

async function convertAudioToText(audioFilePath) {
    console.log('🎤 [STEP 1] Converting audio to text...');
    console.log(`📁 File: ${audioFilePath}`);

    try {
        // Read audio file
        const audioContent = fs.readFileSync(audioFilePath);
        const audioBase64 = audioContent.toString('base64');

        // Use Google Cloud Speech-to-Text API (REST v2)
        const url = `https://speech.googleapis.com/v2/projects/${PROJECT_ID}/locations/global/recognizers/_:recognize?key=${API_KEY}`;

        const requestBody = {
            recognizer: `projects/${PROJECT_ID}/locations/global/recognizers/_`,
            config: {
                autoDecodingConfig: {
                    encoding: 'AUTO_AUDIO',
                    sampleRateHertz: 16000,
                    audioChannelCount: 1
                },
                languageCodes: [TTS_LANGUAGE_CODE],
                model: 'latest_long',
                features: {
                    enableAutomaticPunctuation: true,
                    enableSpokenPunctuation: true,
                    enableSpokenEmojis: false
                }
            },
            content: audioBase64
        };

        console.log('📤 Sending request to Google Cloud Speech-to-Text API...');
        
        const response = await axios.post(url, requestBody, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000 // 60 seconds
        });

        // Extract transcript from response
        const transcript = response.data?.results?.[0]?.transcript?.text;

        if (!transcript) {
            console.error('❌ No transcript in response:', JSON.stringify(response.data, null, 2));
            throw new Error('Failed to get transcript from audio');
        }

        console.log(`✅ [STEP 1] Audio converted to text successfully!`);
        console.log(`📝 Transcript: "${transcript}"`);

        return transcript;

    } catch (error) {
        console.error('❌ [STEP 1] Error converting audio to text:', error.message);
        
        if (error.response) {
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
        
        throw error;
    }
}

// ============================================
// 🤖 Step 2: Get AI Response from Gemini
// ============================================

async function getGeminiResponse(userMessage) {
    console.log('🤖 [STEP 2] Getting AI response from Gemini...');
    console.log(`📤 Message: "${userMessage}"`);

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

        const requestBody = {
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
                maxOutputTokens: 500
            }
        };

        console.log('📤 Sending request to Gemini API...');
        
        const response = await axios.post(url, requestBody, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000 // 30 seconds
        });

        // Extract text from response
        const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            console.error('❌ No text in Gemini response:', JSON.stringify(response.data, null, 2));
            throw new Error('Failed to get response from Gemini');
        }

        console.log(`✅ [STEP 2] Gemini response received!`);
        console.log(`📝 Response: "${text}"`);

        // Save response text to file
        fs.writeFileSync(OUTPUT_TEXT_FILE, text, 'utf-8');
        console.log(`💾 Response text saved to: ${OUTPUT_TEXT_FILE}`);

        return text;

    } catch (error) {
        console.error('❌ [STEP 2] Error getting Gemini response:', error.message);
        
        if (error.response) {
            console.error('Response data:', JSON.stringify(error.response.data, null, 2));
        }
        
        throw error;
    }
}

// ============================================
// 🔊 Step 3: Convert Text to Audio (TTS)
// ============================================

async function convertTextToAudio(text) {
    console.log('🔊 [STEP 3] Converting text to audio...');
    console.log(`📝 Text: "${text}"`);

    try {
        // Use Google Cloud Text-to-Speech API
        const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`;

        const requestBody = {
            input: {
                text: text
            },
            voice: {
                languageCode: TTS_LANGUAGE_CODE,
                name: TTS_VOICE_NAME
            },
            audioConfig: {
                audioEncoding: 'LINEAR16',
                sampleRateHertz: 16000,
                speakingRate: 0.9,
                pitch: 0.0
            }
        };

        console.log('📤 Sending request to Google Cloud TTS API...');
        
        const response = await axios.post(url, requestBody, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 30000, // 30 seconds
            responseType: 'arraybuffer'
        });

        // Extract audio content
        const audioContent = Buffer.from(response.data);

        console.log(`✅ [STEP 3] Text converted to audio successfully!`);
        console.log(`🔊 Audio size: ${audioContent.length} bytes`);

        return audioContent;

    } catch (error) {
        console.error('❌ [STEP 3] Error converting text to audio:', error.message);
        
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        
        throw error;
    }
}

// ============================================
// 💾 Step 4: Save Audio to File
// ============================================

function saveAudioToFile(audioContent, outputPath) {
    console.log('💾 [STEP 4] Saving audio to file...');
    console.log(`📁 Output: ${outputPath}`);

    try {
        fs.writeFileSync(outputPath, audioContent);
        console.log(`✅ [STEP 4] Audio saved successfully!`);
        console.log(`📁 File: ${outputPath}`);
        console.log(`📊 Size: ${audioContent.length} bytes`);
    } catch (error) {
        console.error('❌ [STEP 4] Error saving audio:', error.message);
        throw error;
    }
}

// ============================================
// 🚀 Main Execution Function
// ============================================

async function main() {
    console.log('='.repeat(70));
    console.log('🧪 Voice Chatbot Audio Pipeline Test');
    console.log('='.repeat(70));
    console.log('');

    try {
        // Validate configuration
        if (!API_KEY) {
            throw new Error('GOOGLE_CLOUD_API_KEY not found in .env file');
        }
        if (!PROJECT_ID) {
            throw new Error('GOOGLE_CLOUD_PROJECT_ID not found in .env file');
        }

        // Check if input audio file exists
        if (!fs.existsSync(INPUT_AUDIO_FILE)) {
            throw new Error(`Input audio file not found: ${INPUT_AUDIO_FILE}`);
        }

        console.log('✅ Configuration validated');
        console.log(`🔑 API Key: ${API_KEY.substring(0, 20)}...`);
        console.log(`📁 Project ID: ${PROJECT_ID}`);
        console.log('');

        // Step 1: Convert audio to text
        const transcript = await convertAudioToText(INPUT_AUDIO_FILE);
        console.log('');

        // Step 2: Get AI response
        const response = await getGeminiResponse(transcript);
        console.log('');

        // Step 3: Convert response to audio
        const audioContent = await convertTextToAudio(response);
        console.log('');

        // Step 4: Save audio to file
        saveAudioToFile(audioContent, OUTPUT_AUDIO_FILE);
        console.log('');

        // Success message
        console.log('='.repeat(70));
        console.log('✅ TEST COMPLETED SUCCESSFULLY!');
        console.log('='.repeat(70));
        console.log(`📝 Transcript: ${transcript}`);
        console.log(`🤖 Response: ${response}`);
        console.log(`🔊 Audio saved: ${OUTPUT_AUDIO_FILE}`);
        console.log(`📄 Text saved: ${OUTPUT_TEXT_FILE}`);
        console.log('');
        console.log('💡 You can now play the audio file to hear the bot\'s response!');
        console.log('='.repeat(70));

    } catch (error) {
        console.log('');
        console.log('='.repeat(70));
        console.error('❌ TEST FAILED!');
        console.log('='.repeat(70));
        console.error(`Error: ${error.message}`);
        console.error('');
        console.error('💡 Troubleshooting tips:');
        console.error('1. Check that GOOGLE_CLOUD_API_KEY is set in .env');
        console.error('2. Check that GOOGLE_CLOUD_PROJECT_ID is set in .env');
        console.error('3. Verify the input audio file exists: s.m4a');
        console.error('4. Check your internet connection');
        console.error('5. Verify your Google Cloud API key has the required APIs enabled:');
        console.error('   - Cloud Speech-to-Text API');
        console.error('   - Cloud Text-to-Speech API');
        console.error('   - Generative Language API');
        console.log('='.repeat(70));
        
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = {
    convertAudioToText,
    getGeminiResponse,
    convertTextToAudio,
    saveAudioToFile
};
