/**
 * Configuration for the Voice Chatbot with Gemini Live API
 * Direct Audio Streaming: Web Audio API (PCM) → Gemini Live API → PCM Audio Response
 */

require('dotenv').config({ override: true });

const config = {
  // Google Cloud Configuration
  googleCloudApiKey: process.env.GOOGLE_CLOUD_API_KEY || '',
  googleCloudProjectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
  googleCloudRegion: process.env.GOOGLE_CLOUD_REGION || 'us-central1',

  // Gemini Live API Configuration
  geminiLive: {
    // Model ID for Gemini Live API
    model: process.env.GEMINI_LIVE_MODEL || 'gemini-1.5-flash',

    // Voice Configuration
    voiceName: process.env.GEMINI_VOICE_NAME || 'Charon',
    languageCode: process.env.GEMINI_LANGUAGE_CODE || 'ar-EG',

    // Audio Configuration
    inputSampleRate: 16000, // 16kHz for input
    outputSampleRate: 24000, // 24kHz for output
    inputMimeType: 'audio/pcm;rate=16000',

    // VAD (Voice Activity Detection) Configuration
    vad: {
      disabled: false,
      startOfSpeechSensitivity: 'low', // low, medium, high
      endOfSpeechSensitivity: 'low',
      prefixPaddingMs: 20,
      silenceDurationMs: 100
    }
  },

  // Legacy Gemini Text API (kept for fallback)
  geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',

  // TTS Configuration (Edge-TTS - DEPRECATED, kept for reference)
  ttsPort: process.env.TTS_PORT || 5000,
  ttsVoice: process.env.TTS_VOICE || 'ar-SA-HamedNeural',

  // Server Configuration
  port: process.env.PORT || 8080,

  // Debug Configuration
  debugMode: process.env.DEBUG_MODE === 'true' || false,

  // WebSocket Configuration
  wsPingInterval: 30000, // 30 seconds
  wsPingTimeout: 5000, // 5 seconds

  // System Instruction for the AI
  systemInstruction: `أنت مساعد صوتي متخصص حصرياً في هندسة المعلوماتية وعلوم الحاسب.

قواعد مهمة:
- أجب فقط على الأسئلة المتعلقة بعلوم الحاسب وهندسة المعلوماتية
- إذا كان السؤال خارج هذا النطاق، اعتذر باختصار واقترح سؤالاً ضمن المجال
- أجب بالعربية وبشكل واضح ومختصر مناسب للصوت
- تجنب الإطالة غير الضرورية
- قدّم أمثلة بسيطة عند الحاجة لتوضيح المفاهيم

مثال على الاعتذار للأسئلة الخارجية:
"أعتذر، أنا متخصص فقط في أسئلة علوم الحاسب وهندسة المعلوماتية. هل يمكنني مساعدتك في سؤال متعلق بالبرمجة أو الخوارزميات أو قواعد البيانات مثلاً؟"`,
};

// Validate required configuration
function validateConfig() {
  const errors = [];
  const warnings = [];

  // For Gemini Live API, we need project ID
  if (!config.googleCloudProjectId) {
    errors.push('GOOGLE_CLOUD_PROJECT_ID is required in .env file for Gemini Live API');
  }

  // API key is optional for Live API (uses OAuth), but good to have as fallback
  if (!config.googleCloudApiKey) {
    warnings.push('GOOGLE_CLOUD_API_KEY not set (optional for Live API, but recommended as fallback)');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }

  console.log('✓ Configuration validated');
  console.log(`🧠 Model: ${config.geminiLive.model} (Gemini Live API)`);
  console.log(`🎤 Voice: ${config.geminiLive.voiceName} (${config.geminiLive.languageCode})`);
  console.log(`🔊 Audio: ${config.geminiLive.inputSampleRate}Hz in → ${config.geminiLive.outputSampleRate}Hz out`);
  console.log(`📊 Debug mode: ${config.debugMode}`);

  if (warnings.length > 0) {
    console.log(`⚠️  Warnings:\n${warnings.join('\n')}`);
  }
}

/**
 * Check if text starts with wake word (case-insensitive, ignores punctuation)
 * @param {string} text - Text to check
 * @returns {Object} { wake: boolean, cleanText: string, reason: string }
 */
function checkWakeWord(text) {
  if (!text || typeof text !== 'string') {
    return { wake: true, cleanText: '', reason: 'النص فارغ أو غير صحيح' };
  }

  const trimmedText = text.trim();

  return {
    wake: true,
    cleanText: trimmedText,
    reason: 'تم تعطيل الكلمة المفتاحية',
    rawText: trimmedText
  };
}

module.exports = { config, validateConfig, checkWakeWord };
