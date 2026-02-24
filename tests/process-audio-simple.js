/**
 * 🎙️ Simple Audio Pipeline for Voice Chatbot (Node.js Only)
 * 
 * This script:
 * 1. Uses a predefined question (since Speech-to-Text requires complex setup)
 * 2. Gets AI response from Vertex AI Gemini API
 * 3. Converts response to audio using available TTS methods
 * 
 * Usage: node process-audio-simple.js
 */

const fs = require('fs');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
const { spawn } = require('child_process');
require('dotenv').config();

// ============================================
// ⚙️ Configuration
// ============================================

// Use a predefined question (since we can't transcribe audio without Python)
const QUESTION = 'ما هي لغة بايثون؟';

const OUTPUT_AUDIO = path.join(__dirname, 'bot_response_audio.mp3');
const OUTPUT_TEXT = path.join(__dirname, 'bot_response_text.txt');

// Google Cloud Configuration
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
const LOCATION = process.env.GOOGLE_CLOUD_REGION || 'us-central1';
const MODEL = 'gemini-2.0-flash-exp';
const CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;

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
// 🔐 Get Access Token
// ============================================

async function getAccessToken() {
    try {
        console.log('🔐 Getting access token from service account...');
        
        const auth = new GoogleAuth({
            keyFilename: CREDENTIALS_PATH,
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });

        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();
        
        console.log('✅ Access token obtained');
        return accessToken.token;

    } catch (error) {
        console.error('❌ Error getting access token:', error.message);
        throw error;
    }
}

// ============================================
// 🤖 Step 1: Get AI Response
// ============================================

async function getAIResponse(question) {
    console.log('\n' + '='.repeat(70));
    console.log('📍 STEP 1: AI Response');
    console.log('='.repeat(70));
    console.log(`Question: "${question}"`);

    try {
        const accessToken = await getAccessToken();
        
        const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;

        const requestBody = {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: question }]
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

        console.log('📤 Sending to Gemini API...');

        const response = await axios.post(url, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            timeout: 30000
        });

        // Extract response text
        const responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!responseText) {
            throw new Error('No response from Gemini API');
        }

        console.log('\n✅ AI response received!');
        console.log(`🤖 Response: "${responseText}"`);

        // Save response
        fs.writeFileSync(OUTPUT_TEXT, responseText, 'utf-8');
        console.log(`💾 Response saved to: ${OUTPUT_TEXT}`);

        return responseText;

    } catch (error) {
        console.error('\n❌ Gemini API failed:', error.message);
        
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', error.response.data);
        }
        
        throw error;
    }
}

// ============================================
// 🔊 Step 2: Convert to Speech (Google Cloud TTS)
// ============================================

async function convertToSpeechGoogle(text, outputFile) {
    console.log('\n' + '='.repeat(70));
    console.log('📍 STEP 2: Text-to-Speech (Google Cloud TTS)');
    console.log('='.repeat(70));
    console.log(`Converting response to audio using Google Cloud TTS`);

    try {
        const accessToken = await getAccessToken();
        
        const url = 'https://texttospeech.googleapis.com/v1/text:synthesize';

        const requestBody = {
            input: {
                text: text
            },
            voice: {
                languageCode: 'ar-EG',
                name: 'ar-EG-Wavenet-A',
                ssmlGender: 'FEMALE'
            },
            audioConfig: {
                audioEncoding: 'MP3',
                sampleRateHertz: 16000,
                speakingRate: 0.9,
                pitch: 0.0
            }
        };

        console.log('📤 Sending to Google Cloud TTS...');
        console.log(`🎤 Voice: ar-EG-Wavenet-A (Egyptian Female)`);
        console.log(`📝 Text: "${text.substring(0, 50)}..."`);

        const response = await axios.post(url, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            timeout: 30000,
            responseType: 'arraybuffer'
        });

        if (!response.data || response.data.byteLength === 0) {
            throw new Error('Empty audio response from TTS API');
        }

        // Save audio
        fs.writeFileSync(outputFile, response.data);
        
        const fileSize = response.data.byteLength;

        console.log('\n✅ Audio generated successfully!');
        console.log(`📁 Output file: ${outputFile}`);
        console.log(`📊 File size: ${fileSize.toLocaleString()} bytes`);

        return outputFile;

    } catch (error) {
        console.error('\n❌ Google Cloud TTS failed:', error.message);
        
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', error.response.data);
        }
        
        throw error;
    }
}

// ============================================
// 🔊 Alternative: Convert to Speech (Say.js)
// ============================================

async function convertToSpeechSay(text, outputFile) {
    console.log('\n' + '='.repeat(70));
    console.log('📍 STEP 2 (Alternative): Text-to-Speech (Say.js)');
    console.log('='.repeat(70));
    console.log(`Converting response to audio using Say.js`);

    return new Promise((resolve, reject) => {
        const say = require('say');
        const tempFile = path.join(__dirname, 'temp_say_output.wav');
        
        console.log(`📝 Text: "${text.substring(0, 50)}..."`);
        console.log('📤 Generating audio...');

        say.export(text, null, 0.75, tempFile, (err) => {
            if (err) {
                console.error('❌ Say.js failed:', err.message);
                return reject(err);
            }

            try {
                // Read the temp file
                const audioContent = fs.readFileSync(tempFile);
                
                // Save to output file
                fs.writeFileSync(outputFile, audioContent);
                
                // Clean up temp file
                fs.unlinkSync(tempFile);

                const fileSize = audioContent.length;

                console.log('\n✅ Audio generated successfully!');
                console.log(`📁 Output file: ${outputFile}`);
                console.log(`📊 File size: ${fileSize.toLocaleString()} bytes`);
                console.log('\n⚠️ Note: Say.js uses system default voice.');
                console.log('⚠️ For better Arabic pronunciation, install Arabic voices in Windows or use Google Cloud TTS.');

                resolve(outputFile);

            } catch (error) {
                reject(new Error(`Failed to save audio: ${error.message}`));
            }
        });
    });
}

// ============================================
// 🚀 Main Execution
// ============================================

async function main() {
    console.log('\n' + '='.repeat(70));
    console.log('🎙️  VOICE CHATBOT - SIMPLE PIPELINE');
    console.log('='.repeat(70));
    console.log(`\n📝 Question: ${QUESTION}`);
    console.log('💡 Note: Using predefined question (Speech-to-Text requires Python setup)');

    try {
        // Validate configuration
        if (!PROJECT_ID) {
            throw new Error('GOOGLE_CLOUD_PROJECT_ID not found in .env');
        }

        if (!CREDENTIALS_PATH) {
            throw new Error('GOOGLE_APPLICATION_CREDENTIALS not found in .env');
        }

        if (!fs.existsSync(CREDENTIALS_PATH)) {
            throw new Error(`Credentials file not found: ${CREDENTIALS_PATH}`);
        }

        console.log('\n✅ Configuration validated');
        console.log(`🔐 Credentials: ${CREDENTIALS_PATH}`);
        console.log(`🤖 Model: ${MODEL}`);

        // Step 1: Get AI response
        const response = await getAIResponse(QUESTION);

        // Step 2: Try Google Cloud TTS first, then fallback to Say.js
        try {
            await convertToSpeechGoogle(response, OUTPUT_AUDIO);
        } catch (error) {
            console.log('\n⚠️ Google Cloud TTS failed, trying Say.js...');
            await convertToSpeechSay(response, OUTPUT_AUDIO);
        }

        // Final success message
        console.log('\n' + '='.repeat(70));
        console.log('✅ PIPELINE COMPLETED SUCCESSFULLY!');
        console.log('='.repeat(70));
        console.log(`\n📝 Question: ${QUESTION}`);
        console.log(`🤖 Bot response: ${response}`);
        console.log(`\n📁 Generated files:`);
        console.log(`   - ${OUTPUT_TEXT} (AI response)`);
        console.log(`   - ${OUTPUT_AUDIO} (bot voice response)`);
        console.log('\n💡 You can now play the audio file to hear the bot\'s response!');
        console.log('='.repeat(70));

    } catch (error) {
        console.log('\n' + '='.repeat(70));
        console.error('❌ PIPELINE FAILED!');
        console.log('='.repeat(70));
        console.error(`Error: ${error.message}`);
        console.error('\n💡 Troubleshooting:');
        console.error('   1. Make sure GOOGLE_APPLICATION_CREDENTIALS is set correctly');
        console.error('   2. Make sure you have internet connection');
        console.error('   3. Make sure Say.js is installed: npm install say');
        console.error('   4. For better Arabic TTS, enable Google Cloud Text-to-Speech API');
        console.log('='.repeat(70));
        
        process.exit(1);
    }
}

// Run the pipeline
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = {
    getAIResponse,
    convertToSpeechGoogle,
    convertToSpeechSay
};
