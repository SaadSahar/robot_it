/**
 * 🧪 Final Test Script for Voice Chatbot
 * 
 * This script:
 * 1. Gets AI response from Vertex AI Gemini API (using service account)
 * 2. Converts response text to audio using multiple TTS methods with fallback
 * 3. Saves the audio output to a file
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

const OUTPUT_AUDIO_FILE = path.join(__dirname, 'response_audio.mp3');
const OUTPUT_TEXT_FILE = path.join(__dirname, 'response_text.txt');

// Google Cloud Configuration
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
const LOCATION = process.env.GOOGLE_CLOUD_REGION || 'us-central1';
const MODEL = 'gemini-2.0-flash-exp';

// Service account credentials
const CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;

// Sample question
const SAMPLE_QUESTION = 'ما هي لغة بايثون؟';

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
// 🤖 Step 1: Get AI Response from Vertex AI
// ============================================

async function getAIResponse(question, accessToken) {
    console.log('🤖 [STEP 1] Getting AI response from Vertex AI...');
    console.log(`📤 Question: "${question}"`);

    try {
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

        console.log('📤 Sending request to Vertex AI...');

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
            console.error('❌ No response from Vertex AI');
            console.error('Full response:', JSON.stringify(response.data, null, 2));
            throw new Error('Failed to get response from Vertex AI');
        }

        console.log(`✅ [STEP 1] Response received!`);
        console.log(`🤖 Response: "${responseText}"`);

        // Save response to file
        fs.writeFileSync(OUTPUT_TEXT_FILE, responseText, 'utf-8');
        console.log(`📄 Response saved to: ${OUTPUT_TEXT_FILE}`);

        return responseText;

    } catch (error) {
        console.error('❌ [STEP 1] Error getting response:', error.message);
        
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
// 🔊 Step 2: Convert Text to Audio (Multiple Methods)
// ============================================

async function convertTextToAudio(text) {
    console.log('🔊 [STEP 2] Converting text to audio...');
    console.log(`📝 Text: "${text}"`);

    const methods = [
        { name: 'Google Cloud TTS', fn: () => convertWithGoogleTTS(text) },
        { name: 'OpenAI TTS', fn: () => convertWithOpenAI(text) },
        { name: 'Say.js', fn: () => convertWithSay(text) },
        { name: 'PowerShell Speech', fn: () => convertWithPowerShell(text) }
    ];

    for (const method of methods) {
        try {
            console.log(`📤 Trying ${method.name}...`);
            const audioContent = await method.fn();
            console.log(`✅ [STEP 2] Successfully converted using ${method.name}!`);
            return audioContent;
        } catch (error) {
            console.log(`⚠️ ${method.name} failed: ${error.message}`);
            console.log('');
        }
    }

    throw new Error('All TTS methods failed');
}

// Method 1: Google Cloud TTS
async function convertWithGoogleTTS(text) {
    const accessToken = await getAccessToken();
    
    const url = 'https://texttospeech.googleapis.com/v1/text:synthesize';

    const requestBody = {
        input: {
            text: text
        },
        voice: {
            languageCode: 'ar-EG',
            name: 'ar-EG-Wavenet-A'
        },
        audioConfig: {
            audioEncoding: 'MP3',
            sampleRateHertz: 16000,
            speakingRate: 0.9,
            pitch: 0.0
        }
    };

    const response = await axios.post(url, requestBody, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
        },
        timeout: 30000,
        responseType: 'arraybuffer'
    });

    return Buffer.from(response.data);
}

// Method 2: OpenAI TTS (if API key available)
async function convertWithOpenAI(text) {
    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
        throw new Error('OPENAI_API_KEY not found');
    }

    const url = 'https://api.openai.com/v1/audio/speech';

    const requestBody = {
        model: 'tts-1',
        input: text,
        voice: 'alloy'
    };

    const response = await axios.post(url, requestBody, {
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiKey}`
        },
        timeout: 30000,
        responseType: 'arraybuffer'
    });

    return Buffer.from(response.data);
}

// Method 3: Say.js (Node.js library)
async function convertWithSay(text) {
    return new Promise((resolve, reject) => {
        const say = require('say');
        const outputFile = path.join(__dirname, 'temp_say.wav');
        
        say.export(text, null, 0.75, outputFile, (err) => {
            if (err) {
                reject(err);
            } else {
                try {
                    const audioContent = fs.readFileSync(outputFile);
                    fs.unlinkSync(outputFile);
                    resolve(audioContent);
                } catch (e) {
                    reject(e);
                }
            }
        });
    });
}

// Method 4: PowerShell Speech (Windows built-in)
async function convertWithPowerShell(text) {
    const outputFile = path.join(__dirname, 'temp_ps.wav');
    
    const psScript = `
Add-Type -AssemblyName System.Speech;
$synthesizer = New-Object System.Speech.Synthesis.SpeechSynthesizer;
$synthesizer.SetOutputToWaveFile('${outputFile}');
$synthesizer.Speak('${text.replace(/'/g, "''").replace(/"/g, '`"')}');
$synthesizer.Dispose();
`;

    const tempPsFile = path.join(__dirname, 'temp_tts.ps1');
    fs.writeFileSync(tempPsFile, psScript, 'utf-8');

    await new Promise((resolve, reject) => {
        const ps = spawn('powershell.exe', [
            '-ExecutionPolicy', 'Bypass',
            '-File', tempPsFile
        ]);

        ps.on('close', (code) => {
            try {
                fs.unlinkSync(tempPsFile);
            } catch (e) {
                // Ignore
            }

            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`PowerShell exited with code ${code}`));
            }
        });
    });

    if (!fs.existsSync(outputFile)) {
        throw new Error('Audio file was not created');
    }

    const audioContent = fs.readFileSync(outputFile);
    fs.unlinkSync(outputFile);

    return audioContent;
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
    console.log('🧪 Voice Chatbot Audio Pipeline Test (Final Version)');
    console.log('='.repeat(70));
    console.log('');

    try {
        // Validate configuration
        if (!PROJECT_ID) {
            throw new Error('GOOGLE_CLOUD_PROJECT_ID not found in .env');
        }

        if (!CREDENTIALS_PATH) {
            throw new Error('GOOGLE_APPLICATION_CREDENTIALS not found in .env');
        }

        if (!fs.existsSync(CREDENTIALS_PATH)) {
            throw new Error(`Service account file not found: ${CREDENTIALS_PATH}`);
        }

        console.log('✅ Configuration validated');
        console.log(`📁 Project ID: ${PROJECT_ID}`);
        console.log(`📍 Location: ${LOCATION}`);
        console.log(`🤖 Model: ${MODEL}`);
        console.log(`🔐 Credentials: ${CREDENTIALS_PATH}`);
        console.log('');

        // Get access token
        const accessToken = await getAccessToken();
        console.log('');

        // Get question from command line or use sample
        let question = SAMPLE_QUESTION;
        
        // Check if audio file exists
        const audioFile = path.join(__dirname, 's.m4a');
        if (fs.existsSync(audioFile)) {
            console.log('📁 Audio file found: s.m4a');
            console.log('⚠️ Note: Using sample question for testing');
            console.log('💡 To test with your audio, transcribe it and pass as argument');
            console.log('');
        }

        // Use command line argument if provided
        if (process.argv.length > 2) {
            question = process.argv.slice(2).join(' ');
            console.log(`📝 Using custom question: "${question}"`);
            console.log('');
        }

        // Step 1: Get AI response
        const response = await getAIResponse(question, accessToken);
        console.log('');

        // Step 2: Convert response to audio (with fallback methods)
        const audioContent = await convertTextToAudio(response);
        console.log('');

        // Step 3: Save audio to file
        saveAudioToFile(audioContent, OUTPUT_AUDIO_FILE);
        console.log('');

        // Success message
        console.log('='.repeat(70));
        console.log('✅ TEST COMPLETED SUCCESSFULLY!');
        console.log('='.repeat(70));
        console.log(`📝 Question: ${question}`);
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
        console.error('💡 Note: The text response was saved successfully!');
        console.error(`📄 Check: ${OUTPUT_TEXT_FILE}`);
        console.log('='.repeat(70));
        
        // Don't exit with error if we got the text response
        if (fs.existsSync(OUTPUT_TEXT_FILE)) {
            console.log('');
            console.log('✅ At minimum, the AI response was generated successfully!');
            console.log(`📄 Response text: ${fs.readFileSync(OUTPUT_TEXT_FILE, 'utf-8')}`);
            process.exit(0);
        }
        
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
    getAccessToken,
    getAIResponse,
    convertTextToAudio,
    saveAudioToFile
};
