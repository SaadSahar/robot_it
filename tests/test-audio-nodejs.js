/**
 * 🧪 Test Script for Voice Chatbot (Node.js Native)
 * 
 * This script:
 * 1. Gets AI response from Gemini API (using existing handler)
 * 2. Converts response text to audio using Node.js TTS
 * 3. Saves the audio output to a file
 * 
 * For audio transcription, we'll use a sample question or you can provide the transcript
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
require('dotenv').config();

// Import the existing Gemini handler
const { generateResponse } = require('./backend/gemini-handler-new');

// ============================================
// ⚙️ Configuration
// ============================================

const OUTPUT_AUDIO_FILE = path.join(__dirname, 'response_audio.wav');
const OUTPUT_TEXT_FILE = path.join(__dirname, 'response_text.txt');

// Sample question (or you can provide the transcript from s.m4a)
// TODO: Replace this with the actual transcript from your audio file
const SAMPLE_QUESTION = 'ما هي لغة بايثون؟';

// ============================================
// 🤖 Step 1: Get AI Response from Gemini
// ============================================

async function getAIResponse(question) {
    console.log('🤖 [STEP 1] Getting AI response from Gemini...');
    console.log(`📤 Question: "${question}"`);

    try {
        const response = await generateResponse(question);
        
        console.log(`✅ [STEP 1] Response received!`);
        console.log(`🤖 Response: "${response}"`);

        // Save response to file
        fs.writeFileSync(OUTPUT_TEXT_FILE, response, 'utf-8');
        console.log(`📄 Response saved to: ${OUTPUT_TEXT_FILE}`);

        return response;

    } catch (error) {
        console.error('❌ [STEP 1] Error getting response:', error.message);
        throw error;
    }
}

// ============================================
// 🔊 Step 2: Convert Text to Audio (Node.js)
// ============================================

async function convertTextToAudio(text) {
    console.log('🔊 [STEP 2] Converting text to audio...');
    console.log(`📝 Text: "${text}"`);

    try {
        // Method 1: Use Windows SAPI (built into Windows)
        console.log('📤 Using Windows SAPI for TTS...');
        
        const tempVbsFile = path.join(__dirname, 'temp_tts.vbs');
        
        // Create VBScript for TTS
        const vbsContent = `
Dim speech, fso, outFile
Set speech = CreateObject("SAPI.SpVoice")
Set fso = CreateObject("Scripting.FileSystemObject")

' Save speech to WAV file
speech.Speak "${text.replace(/"/g, '""')}", 0
`;

        // Alternative: Use PowerShell with .NET SpeechSynthesizer
        const psScript = `
Add-Type -AssemblyName System.Speech;
$synthesizer = New-Object System.Speech.Synthesis.SpeechSynthesizer;
$synthesizer.SetOutputToWaveFile('${OUTPUT_AUDIO_FILE}');
$synthesizer.Speak('${text.replace(/'/g, "''")}');
$synthesizer.Dispose();
Write-Output "Audio saved to ${OUTPUT_AUDIO_FILE}";
`;

        const tempPsFile = path.join(__dirname, 'temp_tts.ps1');
        fs.writeFileSync(tempPsFile, psScript, 'utf-8');

        console.log('📤 Generating audio using PowerShell...');
        
        await new Promise((resolve, reject) => {
            const ps = spawn('powershell.exe', [
                '-ExecutionPolicy', 'Bypass',
                '-File', tempPsFile
            ]);

            ps.stdout.on('data', (data) => {
                console.log(data.toString());
            });

            ps.stderr.on('data', (data) => {
                console.error(data.toString());
            });

            ps.on('close', (code) => {
                // Clean up temp file
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

        // Check if file was created
        if (!fs.existsSync(OUTPUT_AUDIO_FILE)) {
            throw new Error('Audio file was not created');
        }

        const audioContent = fs.readFileSync(OUTPUT_AUDIO_FILE);

        console.log(`✅ [STEP 2] Text converted to audio successfully!`);
        console.log(`🔊 Audio size: ${audioContent.length} bytes`);

        return audioContent;

    } catch (error) {
        console.error('❌ [STEP 2] Error converting text to audio:', error.message);
        console.error('💡 Note: Windows SAPI may not support Arabic well');
        throw error;
    }
}

// ============================================
// 🔊 Step 2 Alternative: Use Google Cloud TTS
// ============================================

async function convertTextToAudioGoogle(text) {
    console.log('🔊 [STEP 2] Converting text to audio using Google Cloud TTS...');
    console.log(`📝 Text: "${text}"`);

    const axios = require('axios');
    
    try {
        const API_KEY = process.env.GOOGLE_CLOUD_API_KEY;
        
        if (!API_KEY) {
            throw new Error('GOOGLE_CLOUD_API_KEY not found in .env');
        }

        const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`;

        const requestBody = {
            input: {
                text: text
            },
            voice: {
                languageCode: 'ar-EG',
                name: 'ar-EG-Wavenet-A'
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
            timeout: 30000,
            responseType: 'arraybuffer'
        });

        const audioContent = Buffer.from(response.data);

        console.log(`✅ [STEP 2] Text converted to audio successfully!`);
        console.log(`🔊 Audio size: ${audioContent.length} bytes`);

        return audioContent;

    } catch (error) {
        console.error('❌ [STEP 2] Error with Google TTS:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
        }
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
    console.log('🧪 Voice Chatbot Audio Pipeline Test (Node.js Native)');
    console.log('='.repeat(70));
    console.log('');

    try {
        // Get question from command line or use sample
        let question = SAMPLE_QUESTION;
        
        // Check if audio file exists and ask for transcript
        const audioFile = path.join(__dirname, 's.m4a');
        if (fs.existsSync(audioFile)) {
            console.log('📁 Audio file found: s.m4a');
            console.log('⚠️ Note: Automatic audio transcription requires additional setup');
            console.log('💡 Using sample question for testing');
            console.log('');
            console.log('📝 Sample question:', SAMPLE_QUESTION);
            console.log('');
            console.log('💡 To test with your audio:');
            console.log('   1. Listen to s.m4a and transcribe the question');
            console.log('   2. Run: node test-audio-nodejs.js "your question here"');
            console.log('');
        }

        // Use command line argument if provided
        if (process.argv.length > 2) {
            question = process.argv.slice(2).join(' ');
            console.log(`📝 Using custom question: "${question}"`);
            console.log('');
        }

        // Step 1: Get AI response
        const response = await getAIResponse(question);
        console.log('');

        // Step 2: Convert response to audio
        // Try Google TTS first, fall back to Windows SAPI
        let audioContent;
        try {
            audioContent = await convertTextToAudioGoogle(response);
        } catch (googleError) {
            console.log('⚠️ Google TTS failed, trying Windows SAPI...');
            console.log('');
            audioContent = await convertTextToAudio(response);
        }
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
        console.error('💡 Troubleshooting tips:');
        console.error('1. Check that GOOGLE_CLOUD_API_KEY is set in .env');
        console.error('2. Verify the Gemini API is accessible');
        console.error('3. Check your internet connection');
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
    getAIResponse,
    convertTextToAudio,
    convertTextToAudioGoogle,
    saveAudioToFile
};
