/**
 * Edge-TTS Handler (Node.js Wrapper)
 * 
 * This module provides a Node.js interface to the edge-tts Python script
 * for high-quality Arabic text-to-speech conversion.
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const crypto = require('crypto');

// Configuration
const PYTHON_SCRIPT = path.join(__dirname, '..', 'scripts', 'tts_edge.py');
const TEMP_DIR = path.join(__dirname, '..', 'temp');

// Arabic voice options
const ARABIC_VOICES = {
    'female-sa': 'ar-SA-ZariNeural',      // Female, Saudi Arabia (Default)
    'male-sa': 'ar-SA-OmarNeural',        // Male, Saudi Arabia
    'female-eg': 'ar-EG-SalmaNeural',     // Female, Egypt
    'male-eg': 'ar-EG-ShakirNeural',      // Male, Egypt
    'female-jo': 'ar-JO-FatimaNeural',    // Female, Jordan
    'male-jo': 'ar-JO-TaimNeural',        // Male, Jordan
    'female-ae': 'ar-AE-FatimaNeural',    // Female, UAE
    'male-ae': 'ar-AE-HamdanNeural',      // Male, UAE
};

const DEFAULT_VOICE = 'ar-EG-SalmaNeural';

/**
 * Ensure temp directory exists
 */
function ensureTempDir() {
    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    }
}

/**
 * Generate a unique filename for temporary audio
 */
function generateTempFilename() {
    const hash = crypto.randomBytes(8).toString('hex');
    return path.join(TEMP_DIR, `tts_${hash}.mp3`);
}

/**
 * Convert text to speech using edge-tts (Python)
 * 
 * @param {string} text - The text to convert to speech
 * @param {string} voice - The voice to use (optional, defaults to female Saudi)
 * @param {string} outputFile - Output file path (optional, generates temp file if not provided)
 * @returns {Promise<{filePath: string, buffer: Buffer}>} Object containing file path and buffer
 */
async function textToSpeech(text, voice = DEFAULT_VOICE, outputFile = null) {
    return new Promise((resolve, reject) => {
        // Validate input
        if (!text || typeof text !== 'string') {
            return reject(new Error('Text must be a non-empty string'));
        }

        if (text.trim().length === 0) {
            return reject(new Error('Text cannot be empty'));
        }

        // Ensure temp directory exists
        ensureTempDir();

        // Generate output file path if not provided
        const outputPath = outputFile || generateTempFilename();

        console.log(`🔊 [Edge-TTS] Converting text to speech...`);
        console.log(`📝 Text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
        console.log(`🎤 Voice: ${voice}`);
        console.log(`📁 Output: ${outputPath}`);

        // Spawn Python process
        const python = spawn('python', [
            PYTHON_SCRIPT,
            text,
            outputPath,
            voice
        ]);

        let stdout = '';
        let stderr = '';

        python.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        python.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        python.on('close', (code) => {
            if (code !== 0) {
                console.error(`❌ [Edge-TTS] Python script exited with code ${code}`);
                console.error(`stderr: ${stderr}`);
                return reject(new Error(`Python script failed: ${stderr}`));
            }

            // Check if output file was created
            if (!fs.existsSync(outputPath)) {
                return reject(new Error('Output file was not created'));
            }

            // Read the audio file
            try {
                const buffer = fs.readFileSync(outputPath);
                const fileSize = buffer.length;

                console.log(`✅ [Edge-TTS] Audio generated successfully!`);
                console.log(`📊 File size: ${fileSize} bytes`);

                // Resolve with both file path and buffer
                resolve({
                    filePath: outputPath,
                    buffer: buffer,
                    size: fileSize
                });

                // Clean up temp file if it's auto-generated and caller didn't specify path
                if (!outputFile) {
                    // Note: We keep the file for now, caller can delete if needed
                    // Or we can delete immediately and just return the buffer
                }

            } catch (error) {
                reject(new Error(`Failed to read output file: ${error.message}`));
            }
        });

        python.on('error', (error) => {
            reject(new Error(`Failed to spawn Python process: ${error.message}`));
        });

        // Set timeout (30 seconds)
        setTimeout(() => {
            python.kill();
            reject(new Error('TTS conversion timed out after 30 seconds'));
        }, 30000);
    });
}

/**
 * Convert text to speech and return base64 encoded audio
 * 
 * @param {string} text - The text to convert
 * @param {string} voice - The voice to use
 * @returns {Promise<string>} Base64 encoded audio
 */
async function textToSpeechBase64(text, voice = DEFAULT_VOICE) {
    const result = await textToSpeech(text, voice);
    return result.buffer.toString('base64');
}

/**
 * Get list of available Arabic voices
 * 
 * @returns {Array<Object>} Array of voice objects
 */
function getAvailableVoices() {
    return Object.entries(ARABIC_VOICES).map(([key, voiceName]) => {
        const [gender, country] = key.split('-');
        return {
            key,
            voiceName,
            gender: gender === 'female' ? 'Female' : 'Male',
            country: country.toUpperCase()
        };
    });
}

/**
 * Clean up temporary files
 */
function cleanupTempFiles() {
    try {
        if (fs.existsSync(TEMP_DIR)) {
            const files = fs.readdirSync(TEMP_DIR);
            files.forEach(file => {
                const filePath = path.join(TEMP_DIR, file);
                fs.unlinkSync(filePath);
            });
            console.log(`🧹 [Edge-TTS] Cleaned up ${files.length} temporary file(s)`);
        }
    } catch (error) {
        console.error(`⚠️ [Edge-TTS] Failed to cleanup temp files: ${error.message}`);
    }
}

/**
 * Test the TTS system
 */
async function testTTS() {
    try {
        console.log('🧪 [Edge-TTS] Testing TTS system...\n');

        const testText = 'مرحباً، هذا اختبار للنطق باللغة العربية.';
        const result = await textToSpeech(testText);

        console.log('\n✅ Test successful!');
        console.log(`📁 File: ${result.filePath}`);
        console.log(`📊 Size: ${result.size} bytes`);

        return result;
    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        throw error;
    }
}

module.exports = {
    textToSpeech,
    textToSpeechBase64,
    getAvailableVoices,
    cleanupTempFiles,
    testTTS,
    ARABIC_VOICES,
    DEFAULT_VOICE
};
