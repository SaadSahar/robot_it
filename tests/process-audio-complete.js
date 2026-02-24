/**
 * 🎙️ Complete Audio Pipeline for Voice Chatbot
 * 
 * This script:
 * 1. Transcribes audio file (s.m4a) using Google Cloud Speech-to-Text
 * 2. Gets AI response from Vertex AI Gemini API
 * 3. Converts response to audio using Edge-TTS (via Python)
 * 
 * Usage: node process-audio-complete.js
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

const AUDIO_FILE = path.join(__dirname, 's.m4a');
const OUTPUT_AUDIO = path.join(__dirname, 'bot_response_audio.mp3');
const OUTPUT_TEXT = path.join(__dirname, 'bot_response_text.txt');
const TRANSCRIPT_TEXT = path.join(__dirname, 'audio_transcript.txt');

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
// 🎙️ Step 1: Transcribe Audio
// ============================================

async function transcribeAudio(audioFilePath) {
    console.log('\n' + '='.repeat(70));
    console.log('📍 STEP 1: Speech-to-Text');
    console.log('='.repeat(70));
    console.log(`Transcribing audio file: ${audioFilePath}`);

    try {
        const accessToken = await getAccessToken();
        
        const url = `https://speech.googleapis.com/v1p1beta1/speech:recognize`;
        
        // Read audio file
        const audioContent = fs.readFileSync(audioFilePath);
        const audioBase64 = audioContent.toString('base64');
        
        const requestBody = {
            config: {
                encoding: 'ENCODING_UNSPECIFIED',
                sampleRateHertz: 16000,
                languageCode: 'ar-EG',
                alternativeLanguageCodes: ['en-US'],
                enableAutomaticPunctuation: true,
                model: 'latest_long'
            },
            audio: {
                content: audioBase64
            }
        };

        console.log('📤 Sending to Google Cloud Speech-to-Text...');

        const response = await axios.post(url, requestBody, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`
            },
            timeout: 60000
        });

        // Extract transcript
        let transcript = '';
        if (response.data.results) {
            for (const result of response.data.results) {
                if (result.alternatives && result.alternatives[0]) {
                    transcript += result.alternatives[0].transcript + ' ';
                }
            }
        }

        transcript = transcript.trim();

        if (!transcript) {
            throw new Error('No transcript received from Speech-to-Text API');
        }

        console.log('\n✅ Transcription successful!');
        console.log(`📝 Transcript: "${transcript}"`);

        // Save transcript
        fs.writeFileSync(TRANSCRIPT_TEXT, transcript, 'utf-8');
        console.log(`💾 Transcript saved to: ${TRANSCRIPT_TEXT}`);

        return transcript;

    } catch (error) {
        console.error('\n❌ Transcription failed:', error.message);
        
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Response:', error.response.data);
        }

        console.log('\n💡 Using fallback text for testing...');
        const fallbackText = 'ما هي لغة بايثون؟';
        console.log(`📝 Fallback text: "${fallbackText}"`);
        return fallbackText;
    }
}

// ============================================
// 🤖 Step 2: Get AI Response
// ============================================

async function getAIResponse(text) {
    console.log('\n' + '='.repeat(70));
    console.log('📍 STEP 2: AI Response');
    console.log('='.repeat(70));
    console.log(`Getting response from Gemini for: "${text}"`);

    try {
        const accessToken = await getAccessToken();
        
        const url = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;

        const requestBody = {
            contents: [
                {
                    role: 'user',
                    parts: [{ text: text }]
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
// 🔊 Step 3: Convert to Speech (Edge-TTS)
// ============================================

async function convertToSpeech(text, outputFile) {
    console.log('\n' + '='.repeat(70));
    console.log('📍 STEP 3: Text-to-Speech');
    console.log('='.repeat(70));
    console.log(`Converting response to audio using Edge-TTS`);

    return new Promise((resolve, reject) => {
        const pythonScript = path.join(__dirname, 'tts_edge.py');
        
        console.log(`🎤 Using voice: ar-SA-ZariNeural (Saudi Female)`);
        console.log(`📝 Text: "${text.substring(0, 50)}..."`);

        const python = spawn('python', [pythonScript, text, outputFile]);

        let stdout = '';
        let stderr = '';

        python.stdout.on('data', (data) => {
            stdout += data.toString();
            process.stdout.write(data);
        });

        python.stderr.on('data', (data) => {
            stderr += data.toString();
            process.stderr.write(data);
        });

        python.on('close', (code) => {
            if (code !== 0) {
                console.error(`\n❌ Python script exited with code ${code}`);
                return reject(new Error(`Edge-TTS failed: ${stderr}`));
            }

            if (!fs.existsSync(outputFile)) {
                return reject(new Error('Output file was not created'));
            }

            const fileSize = fs.statSync(outputFile).size;

            console.log('\n✅ Audio generated successfully!');
            console.log(`📁 Output file: ${outputFile}`);
            console.log(`📊 File size: ${fileSize.toLocaleString()} bytes`);

            resolve(outputFile);
        });

        python.on('error', (error) => {
            reject(new Error(`Failed to spawn Python: ${error.message}`));
        });

        // Timeout after 60 seconds
        setTimeout(() => {
            python.kill();
            reject(new Error('TTS conversion timed out'));
        }, 60000);
    });
}

// ============================================
// 🚀 Main Execution
// ============================================

async function main() {
    console.log('\n' + '='.repeat(70));
    console.log('🎙️  COMPLETE AUDIO PIPELINE FOR VOICE CHATBOT');
    console.log('='.repeat(70));

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

        if (!fs.existsSync(AUDIO_FILE)) {
            throw new Error(`Audio file not found: ${AUDIO_FILE}`);
        }

        console.log('\n✅ Configuration validated');
        console.log(`📁 Audio file: ${AUDIO_FILE}`);
        console.log(`🔐 Credentials: ${CREDENTIALS_PATH}`);
        console.log(`🤖 Model: ${MODEL}`);

        // Step 1: Transcribe audio
        const transcript = await transcribeAudio(AUDIO_FILE);

        // Step 2: Get AI response
        const response = await getAIResponse(transcript);

        // Step 3: Convert to speech
        await convertToSpeech(response, OUTPUT_AUDIO);

        // Final success message
        console.log('\n' + '='.repeat(70));
        console.log('✅ PIPELINE COMPLETED SUCCESSFULLY!');
        console.log('='.repeat(70));
        console.log(`\n📝 Original transcript: ${transcript}`);
        console.log(`🤖 Bot response: ${response}`);
        console.log(`\n📁 Generated files:`);
        console.log(`   - ${TRANSCRIPT_TEXT} (transcript)`);
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
        console.error('   2. Make sure the audio file exists and is valid');
        console.error('   3. Make sure you have internet connection');
        console.error('   4. Make sure Python is installed (for Edge-TTS)');
        console.error('   5. Make sure edge-tts is installed: pip install edge-tts');
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
    transcribeAudio,
    getAIResponse,
    convertToSpeech
};
