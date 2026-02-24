/**
 * Enhanced TTS Handler with Arabic Support
 * 
 * This module provides multiple TTS methods with proper Arabic voice support:
 * 1. Google Cloud TTS (with service account OAuth2)
 * 2. Say.js (with Arabic voice detection)
 * 3. Web Speech Synthesis API (browser-based)
 */

const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');
const say = require('say');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS;

// Arabic voice configurations for different TTS providers
const ARABIC_VOICES = {
    googleCloud: {
        languageCode: 'ar-EG',
        name: 'ar-EG-Wavenet-A',
        ssmlGender: 'FEMALE'
    },
    fallback: {
        languageCode: 'ar-SA',
        name: 'ar-SA-Standard-A',
        ssmlGender: 'FEMALE'
    }
};

/**
 * Get access token for Google Cloud
 */
async function getAccessToken() {
    try {
        const auth = new GoogleAuth({
            keyFilename: CREDENTIALS_PATH,
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });

        const client = await auth.getClient();
        const accessToken = await client.getAccessToken();
        
        return accessToken.token;
    } catch (error) {
        console.error('❌ Error getting access token:', error.message);
        throw error;
    }
}

/**
 * Method 1: Google Cloud TTS with Service Account
 */
async function convertWithGoogleTTS(text) {
    console.log('📤 Trying Google Cloud TTS with Service Account...');
    
    try {
        const accessToken = await getAccessToken();
        
        const url = 'https://texttospeech.googleapis.com/v1/text:synthesize';

        // Try primary voice first
        let requestBody = {
            input: {
                text: text
            },
            voice: ARABIC_VOICES.googleCloud,
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

        if (response.data && response.data.byteLength > 0) {
            console.log('✅ Google Cloud TTS succeeded!');
            return Buffer.from(response.data);
        }

        throw new Error('Empty audio response');

    } catch (error) {
        console.log(`⚠️ Google Cloud TTS failed: ${error.message}`);
        
        // Try fallback voice
        try {
            console.log('📤 Trying fallback voice...');
            const accessToken = await getAccessToken();
            
            const url = 'https://texttospeech.googleapis.com/v1/text:synthesize';
            
            const requestBody = {
                input: {
                    text: text
                },
                voice: ARABIC_VOICES.fallback,
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

            if (response.data && response.data.byteLength > 0) {
                console.log('✅ Google Cloud TTS (fallback) succeeded!');
                return Buffer.from(response.data);
            }

            throw new Error('Empty audio response');
            
        } catch (fallbackError) {
            console.log(`⚠️ Fallback also failed: ${fallbackError.message}`);
            throw fallbackError;
        }
    }
}

/**
 * Method 2: Say.js with Arabic voice detection
 */
async function convertWithSay(text) {
    return new Promise((resolve, reject) => {
        console.log('📤 Trying Say.js with Arabic voice detection...');
        
        try {
            // Get all available voices (if available)
            let voices;
            try {
                voices = say.getInstalledVoices();
            } catch (e) {
                console.log('⚠️ Could not get installed voices, using default...');
                voices = null;
            }
            
            // Find Arabic voices
            let arabicVoices = [];
            if (voices && Array.isArray(voices)) {
                arabicVoices = voices.filter(voice => 
                    voice.name && (
                        voice.name.toLowerCase().includes('ar') ||
                        voice.name.toLowerCase().includes('arabic') ||
                        voice.name.includes('ar-')
                    )
                );
                
                console.log(`🔍 Found ${arabicVoices.length} Arabic voice(s)`);
            }
            
            if (arabicVoices.length > 0) {
                console.log(`🎤 Using Arabic voice: ${arabicVoices[0].name}`);
                
                const outputFile = path.join(__dirname, '..', 'temp_say.wav');
                
                say.export(text, arabicVoices[0].name, 0.75, outputFile, (err) => {
                    if (err) {
                        console.log(`⚠️ Say.js with Arabic voice failed: ${err.message}`);
                        // Try without specific voice
                        trySayWithoutVoice(text, resolve, reject);
                    } else {
                        try {
                            const audioContent = fs.readFileSync(outputFile);
                            fs.unlinkSync(outputFile);
                            console.log('✅ Say.js with Arabic voice succeeded!');
                            resolve(audioContent);
                        } catch (e) {
                            reject(e);
                        }
                    }
                });
            } else {
                console.log('⚠️ No Arabic voices found, trying with default voice...');
                trySayWithoutVoice(text, resolve, reject);
            }
        } catch (error) {
            console.log(`⚠️ Say.js failed: ${error.message}`);
            reject(error);
        }
    });
}

/**
 * Try Say.js without specific voice (system default)
 */
function trySayWithoutVoice(text, resolve, reject) {
    const outputFile = path.join(__dirname, '..', 'temp_say.wav');
    
    say.export(text, null, 0.75, outputFile, (err) => {
        if (err) {
            reject(err);
        } else {
            try {
                const audioContent = fs.readFileSync(outputFile);
                fs.unlinkSync(outputFile);
                console.log('✅ Say.js (default voice) succeeded!');
                resolve(audioContent);
            } catch (e) {
                reject(e);
            }
        }
    });
}

/**
 * Main function: Convert text to speech with fallback
 */
async function textToSpeech(text) {
    console.log('🔊 Converting text to speech...');
    console.log(`📝 Text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

    const methods = [
        { name: 'Google Cloud TTS', fn: () => convertWithGoogleTTS(text) },
        { name: 'Say.js', fn: () => convertWithSay(text) }
    ];

    for (const method of methods) {
        try {
            console.log(`\n📤 Trying ${method.name}...`);
            const audioContent = await method.fn();
            console.log(`✅ Successfully converted using ${method.name}!`);
            console.log(`📊 Audio size: ${audioContent.length} bytes`);
            return audioContent;
        } catch (error) {
            console.log(`⚠️ ${method.name} failed: ${error.message}`);
        }
    }

    throw new Error('All TTS methods failed');
}

/**
 * Convert text to speech and return base64
 */
async function textToSpeechBase64(text) {
    const buffer = await textToSpeech(text);
    return buffer.toString('base64');
}

module.exports = {
    textToSpeech,
    textToSpeechBase64,
    convertWithGoogleTTS,
    convertWithSay
};
