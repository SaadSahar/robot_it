/**
 * Gemini Live API Handler
 * Manages WebSocket connection to Gemini Live API for real-time audio streaming
 * Model: gemini-live-2.5-flash-native-audio
 */

const WebSocket = require('ws');
const { getAccessToken, getProjectId } = require('./auth');
const fs = require('fs');
const path = require('path');

const DEBUG_LOG = path.join(__dirname, '..', 'logs', 'gemini_debug.log');

function logDebug(msg) {
    fs.appendFileSync(DEBUG_LOG, `[${new Date().toISOString()}] ${msg}\n`);
}


const { textToSpeechBase64 } = require('./tts-edge-handler');

/**
 * Gemini Live Session Class
 * Handles bidirectional audio streaming with Gemini Live API
 */
class GeminiLiveSession {
    constructor(config) {
        this.config = config;
        this.ws = null;
        this.isConnected = false;
        this.isSetup = false;

        // Callbacks
        this.onAudioResponse = null;
        this.onTranscript = null;
        this.onSetupComplete = null;
        this.onError = null;
        this.onClose = null;

        // Session state
        this.sessionId = null;
        this.pendingMessages = [];
    }

    /**
     * Connect to Gemini Live API via WebSocket
     * @returns {Promise<void>}
     */
    async connect() {
        try {
            // Get authentication credentials
            const accessToken = await getAccessToken();
            const projectId = await getProjectId();

            // Construct WebSocket endpoint
            // Format: wss://{region}-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent
            const region = this.config.region || 'us-central1';
            const endpoint = `wss://${region}-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1beta1.LlmBidiService/BidiGenerateContent`;

            console.log(`🔗 [GEMINI-LIVE] Connecting to: ${endpoint}`);
            console.log(`📋 [GEMINI-LIVE] Model: ${this.config.model}`);
            console.log(`🎤 [GEMINI-LIVE] Voice: ${this.config.voiceName}`);
            console.log(`🌍 [GEMINI-LIVE] Language: ${this.config.languageCode}`);

            // Create WebSocket connection
            this.ws = new WebSocket(endpoint, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            // Set up event handlers
            this.ws.on('open', () => this.handleOpen());
            this.ws.on('message', (data) => this.handleMessage(data));
            this.ws.on('error', (error) => this.handleError(error));
            this.ws.on('close', (code, reason) => this.handleClose(code, reason));

        } catch (error) {
            console.error('✗ [GEMINI-LIVE] Connection failed:', error.message);
            this.onError?.(error);
            throw error;
        }
    }

    /**
     * Handle WebSocket connection opened
     */
    handleOpen() {
        console.log('✓ [GEMINI-LIVE] WebSocket connected');
        this.isConnected = true;

        // Send setup message immediately after connection
        this.sendSetup();
    }

    /**
     * Send setup message to configure the session
     */
    sendSetup() {
        const setupMessage = {
            setup: {
                model: this.config.model,
                generation_config: {
                    response_modalities: ["AUDIO"],
                    speech_config: {
                        voice_config: {
                            prebuilt_voice_config: {
                                voice_name: this.config.voiceName || "Charon"
                            }
                        },
                        language_code: this.config.languageCode || "ar-EG"
                    }
                },
                system_instruction: {
                    parts: [{ text: this.config.systemPrompt }]
                }
            }
        };

        console.log('📤 [GEMINI-LIVE] Sending setup message');
        this.ws.send(JSON.stringify(setupMessage));
    }

    /**
     * Send text to Gemini Live API
     * @param {string} text - Text to send
     */
    sendText(text) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('⚠️ [GEMINI-LIVE] WebSocket not ready. Queuing text.');
            this.pendingMessages.push({ type: 'text', content: text });
            return;
        }

        const msg = {
            client_content: {
                turns: [
                    {
                        role: "user",
                        parts: [{ text: text }]
                    }
                ],
                turn_complete: true
            }
        };

        this.ws.send(JSON.stringify(msg));
        console.log(`📤 [GEMINI-LIVE] Sent text: "${text.substring(0, 50)}..."`);
    }

    /**
     * Handle incoming messages from Gemini Live API
     * @param {Buffer} data - Raw message data
     */
    async handleMessage(data) {
        try {
            const message = JSON.parse(data.toString());

            // Debug: Log all received messages
            const msgStr = JSON.stringify(message, null, 2);
            // logDebug(`📥 RECEIVED: ${msgStr.substring(0, 500)}`);
            console.log(`📥 [GEMINI-LIVE] Message received:`, Object.keys(message));
            console.log(`🔍 [GEMINI-DEBUG] Full Message:`, msgStr.substring(0, 2000));

            // Handle setup complete
            if (message.setupComplete) {
                console.log('✓ [GEMINI-LIVE] Setup complete');
                this.isSetup = true;
                this.sessionId = message.setupComplete.sessionId;
                this.onSetupComplete?.(message);

                // Send any pending messages
                this.flushPendingMessages();
                return;
            }

            // Handle audio response - Support both camelCase (from API) and snake_case
            const serverContent = message.serverContent || message.server_content;
            const modelTurn = serverContent?.modelTurn || serverContent?.model_turn;

            if (modelTurn?.parts) {
                for (const part of modelTurn.parts) {
                    // Audio data (base64 encoded) - handle both camelCase and snake_case
                    const inlineData = part.inlineData || part.inline_data;
                    if (inlineData?.mimeType?.startsWith('audio/') || inlineData?.mime_type?.startsWith('audio/')) {
                        const audioData = Buffer.from(inlineData.data, 'base64');
                        console.log(`🔊 [GEMINI-LIVE] Audio chunk received: ${audioData.length} bytes`);
                        this.onAudioResponse?.(audioData);
                    }


                    // Text transcript - Convert to Audio using Edge-TTS
                    if (part.text) {
                        const text = part.text;
                        console.log(`📝 [GEMINI-LIVE] Transcript: ${text.substring(0, 50)}...`);
                        this.onTranscript?.(text);

                        // Generate Audio from Text
                        try {
                            console.log(`🔊 [GEMINI-LIVE] Generating TTS for: "${text.substring(0, 30)}..."`);
                            // Use standard Arabic voice
                            const audioBase64 = await textToSpeechBase64(text, "ar-EG-SalmaNeural");
                            const audioBuffer = Buffer.from(audioBase64, 'base64');
                            this.onAudioResponse?.(audioBuffer);
                            console.log(`✅ [GEMINI-LIVE] TTS Audio sent: ${audioBuffer.length} bytes`);
                        } catch (ttsError) {
                            console.error(`❌ [GEMINI-LIVE] TTS Error: ${ttsError.message}`);
                        }
                    }
                }
            }

            // Handle interruption - Support both camelCase and snake_case
            if (serverContent?.interrupted) {
                console.log('⚠️ [GEMINI-LIVE] Response interrupted by user');
                this.onInterruption?.();
            }

            // Handle errors
            if (message.error) {
                console.error('✗ [GEMINI-LIVE] API error:', message.error);
                this.onError?.(new Error(message.error.message || 'Unknown API error'));
            }

        } catch (error) {
            console.error('✗ [GEMINI-LIVE] Failed to parse message:', error.message);
        }
    }

    /**
     * Send audio chunk to Gemini Live API
     * @param {Buffer} pcmData - PCM audio data (16-bit, 16kHz, mono)
     */
    sendAudio(pcmData) {
        if (!this.isConnected || !this.isSetup) {
            // Queue message for later
            this.pendingMessages.push({ type: 'audio', data: pcmData });
            return;
        }

        const message = {
            realtime_input: {
                media_chunks: [{
                    data: pcmData.toString('base64'),
                    mime_type: "audio/pcm;rate=16000"
                }]
            }
        };

        this.ws.send(JSON.stringify(message));
    }

    /**
     * Send text message to Gemini Live API
     * @param {string} text - Text message
     */
    sendText(text) {
        if (!this.isConnected || !this.isSetup) {
            // Queue message for later
            this.pendingMessages.push({ type: 'text', data: text });
            return;
        }

        const message = {
            client_content: {
                turns: [
                    {
                        role: "user",
                        parts: [{ text: text }]
                    }
                ],
                turn_complete: true
            }
        };

        this.ws.send(JSON.stringify(message));
    }

    /**
     * Send pending messages that were queued before setup
     */
    flushPendingMessages() {
        console.log(`📤 [GEMINI-LIVE] Sending ${this.pendingMessages.length} pending messages`);

        for (const msg of this.pendingMessages) {
            if (msg.type === 'audio') {
                this.sendAudio(msg.data);
            } else if (msg.type === 'text') {
                this.sendText(msg.data);
            }
        }

        this.pendingMessages = [];
    }

    /**
     * Handle WebSocket error
     * @param {Error} error - Error object
     */
    handleError(error) {
        console.error('✗ [GEMINI-LIVE] WebSocket error:', error.message);
        this.onError?.(error);
    }

    /**
     * Handle WebSocket close
     * @param {number} code - Close code
     * @param {string} reason - Close reason
     */
    handleClose(code, reason) {
        console.log(`✗ [GEMINI-LIVE] Connection closed: ${code} - ${reason}`);
        this.isConnected = false;
        this.isSetup = false;
        this.onClose?.(code, reason);
    }

    /**
     * Close the WebSocket connection
     */
    disconnect() {
        if (this.ws && this.isConnected) {
            console.log('🔌 [GEMINI-LIVE] Disconnecting...');
            this.ws.close();
            this.isConnected = false;
            this.isSetup = false;
        }
    }

    /**
     * Check if connection is ready
     * @returns {boolean}
     */
    isReady() {
        return this.isConnected && this.isSetup;
    }
}

/**
 * Create a new Gemini Live session
 * @param {Object} config - Configuration object
 * @returns {GeminiLiveSession}
 */
function createGeminiLiveSession(config) {
    return new GeminiLiveSession(config);
}

module.exports = {
    GeminiLiveSession,
    createGeminiLiveSession
};
