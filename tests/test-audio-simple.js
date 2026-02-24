/**
 * 🧪 Simple Test Script for Voice Chatbot
 * 
 * This script uses Google AI Studio API (aistudio.google.com):
 * 1. Upload audio file to Gemini 2.0 Flash (multimodal)
 * 2. Get AI response from Gemini (with audio understanding)
 * 3. Convert response text to audio using edge-tts (free, no API key needed)
 * 4. Save the audio output to a file
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

require('dotenv').config();

// ============================================
// ⚙️ Configuration
// ============================================

const INPUT_AUDIO_FILE = path.join(__dirname, 's.m4a');
const OUTPUT_AUDIO_FILE = path.join(__dirname, 'response_audio.mp3');
const OUTPUT_TEXT_FILE = path.join(__dirname, 'response_text.txt');

// Gemini Configuration (Google AI Studio)
const GEMINI_API_KEY = process.env.GOOGLE_CLOUD_API_KEY; // Will try to use as-is
const GEMINI_MODEL = 'gemini-2.0-flash-exp';

// Alternative: Try to get Google AI Studio API key from env
const AI_STUDIO_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || GEMINI_API_KEY;

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
// 🎤 Step 1: Process Audio with Gemini
// ============================================

async function processAudioWithGemini(audioFilePath) {
    console.log('🎤 [STEP 1] Processing audio with Gemini...');
    console.log(`📁 File: ${audioFilePath}`);

    try {
        // Read audio file
        const audioData = fs.readFileSync(audioFilePath);
        const audioBase64 = audioData.toString('base64');
        const mimeType = 'audio/mp4';

        console.log('📤 Uploading audio to Gemini API...');
        console.log(`🔑 Using API Key: ${AI_STUDIO_API_KEY ? AI_STUDIO_API_KEY.substring(0, 20) + '...' : 'NONE'}`);

        // Use Google AI Studio API endpoint
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${AI_STUDIO_API_KEY}`;

        const requestBody = {
            contents: [
                {
                    role: 'user',
                    parts: [
                        {
                            inline_data: {
                                mime_type: mimeType,
                                data: audioBase64
                            }
                        },
                        {
                            text: 'استمع إلى هذا التسجيل الصوتي وأجب على السؤال الموجود فيه. إذا لم يكن السؤال متعلقاً بعلوم الحاسب، اعتذر واشرح أنك متخصص فقط في علوم الحاسب.'
                        }
                    ]
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

        const response = await axios.post(url, requestBody, {
            headers: { 'Content-Type': 'application/json' },
            timeout: 60000
        });

        // Extract response text
        const responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            console.error('❌ No response from Gemini');
            console.error('Full response:', JSON.stringify(response.data, null, 2));
            throw new Error('Failed to get response from Gemini');
        }

        console.log(`✅ [STEP 1] Audio processed successfully!`);
        console.log(`🤖 Response: "${responseText}"`);

        // Save response to file
        fs.writeFileSync(OUTPUT_TEXT_FILE, responseText, 'utf-8');
        console.log(`📄 Response saved to: ${OUTPUT_TEXT_FILE}`);

        return responseText;

    } catch (error) {
        console.error('❌ [STEP 1] Error processing audio:', error.message);
        
        if (error.response) {
            console.error('Status:', error.response.status);
            try {
                const errorData = typeof error.response.data === 'string' 
                    ? error.response.data 
                    : JSON.stringify(error.response.data, null, 2);
                console.error('Response:', errorData);
            } catch (e) {
                console.error('Response:', error.response.data);
            }
        }
        
        throw error;
    }
}

// ============================================
// 🔊 Step 2: Convert Text to Audio using edge-tts
// ============================================

async function convertTextToAudio(text) {
    console.log('🔊 [STEP 2] Converting text to audio using edge-tts...');
    console.log(`📝 Text: "${text}"`);

    try {
        // Check if edge-tts is installed
        try {
            await execPromise('edge-tts --version');
        } catch (e) {
            console.log('⚠️ edge-tts not found, installing...');
            await execPromise('pip install edge-tts');
            console.log('✅ edge-tts installed');
        }

        // Use edge-tts to generate audio
        const tempFile = path.join(__dirname, 'temp_audio.mp3');
        
        // Arabic voice options for edge-tts
        // Use Microsoft Hamed (Arabic Saudi Male)
        const voice = 'ar-SA-HamedNeural';
        
        console.log(`🔊 Using voice: ${voice}`);
        
        const command = `edge-tts --voice "${voice}" --text "${text.replace(/"/g, '\\"')}" --write-media "${tempFile}"`;
        
        console.log('📤 Generating audio...');
        await execPromise(command);
        
        // Read the generated audio
        const audioContent = fs.readFileSync(tempFile);
        
        // Clean up temp file
        fs.unlinkSync(tempFile);
        
        console.log(`✅ [STEP 2] Text converted to audio successfully!`);
        console.log(`🔊 Audio size: ${audioContent.length} bytes`);

        return audioContent;

    } catch (error) {
        console.error('❌ [STEP 2] Error converting text to audio:', error.message);
        console.error('💡 Make sure Python and pip are installed');
        console.error('💡 Run: pip install edge-tts');
        throw error;
    }
}

// ============================================
// 💾 Step 3: Save Audio to File
// ============================================

function saveAudioToFile(audioContent, outputPath) {
    console.log('💾 [STEP 3] Saving audio to file...');
    console.log(`📁 Output: ${outputPath}`);

    try {
        fs.writeFileSync(outputPath, audioContent);
        console.log(`✅ [STEP 3] Audio saved successfully!`);
        console.log(`📁 File: ${outputPath}`);
        console.log(`📊 Size: ${audioContent.length} bytes`);
    } catch (error) {
        console.error('❌ [STEP 3] Error saving audio:', error.message);
        throw error;
    }
}

// ============================================
// 🚀 Main Execution Function
// ============================================

async function main() {
    console.log('='.repeat(70));
    console.log('🧪 Voice Chatbot Audio Pipeline Test (Simple)');
    console.log('='.repeat(70));
    console.log('');

    try {
        // Validate configuration
        if (!AI_STUDIO_API_KEY) {
            throw new Error('No API key found! Please set GOOGLE_API_KEY or GOOGLE_CLOUD_API_KEY in .env');
        }

        // Check if input audio file exists
        if (!fs.existsSync(INPUT_AUDIO_FILE)) {
            throw new Error(`Input audio file not found: ${INPUT_AUDIO_FILE}`);
        }

        console.log('✅ Configuration validated');
        console.log(`🔑 API Key: ${AI_STUDIO_API_KEY.substring(0, 20)}...`);
        console.log(`🤖 Model: ${GEMINI_MODEL}`);
        console.log('');

        // Step 1: Process audio and get response
        const response = await processAudioWithGemini(INPUT_AUDIO_FILE);
        console.log('');

        // Step 2: Convert response to audio
        const audioContent = await convertTextToAudio(response);
        console.log('');

        // Step 3: Save audio to file
        saveAudioToFile(audioContent, OUTPUT_AUDIO_FILE);
        console.log('');

        // Success message
        console.log('='.repeat(70));
        console.log('✅ TEST COMPLETED SUCCESSFULLY!');
        console.log('='.repeat(70));
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
        console.error('1. Set GOOGLE_API_KEY in .env (get it from https://aistudio.google.com/apikey)');
        console.error('2. Verify the input audio file exists: s.m4a');
        console.error('3. Check your internet connection');
        console.error('4. Install edge-tts: pip install edge-tts');
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
    processAudioWithGemini,
    convertTextToAudio,
    saveAudioToFile
};
