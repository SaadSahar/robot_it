const axios = require('axios');
const { textToSpeechBase64 } = require('./tts-edge-handler');

class GeminiRestClient {
    constructor(config) {
        this.config = config;
        this.apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_CLOUD_API_KEY;
        this.modelName = "gemini-1.5-flash";
    }

    async connect() {
        console.log(`✅ [REST] Connected to Gemini REST Client (Google AI Studio - API Key)`);
        if (!this.apiKey) {
            console.warn("⚠️ [REST] No GOOGLE_API_KEY found in environment variables");
        }
        // Simulate setup complete event
        setTimeout(() => {
            this.onSetupComplete?.();
        }, 100);
    }

    sendAudio(pcmData) {
        // Mock STT or warning
    }

    sendText(text) {
        this.sendMessage(text);
    }

    async sendMessage(text) {
        try {
            console.log(`📤 [REST] Sending: ${text}`);

            if (!this.apiKey) {
                throw new Error("Missing GOOGLE_API_KEY");
            }

            const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;

            const payload = {
                contents: [{ parts: [{ text: text }] }],
                generationConfig: {
                    maxOutputTokens: 2048,
                    temperature: 0.7
                },
                systemInstruction: {
                    parts: [{ text: this.config.systemInstruction || "You are a helpful assistant." }]
                }
            };

            const response = await axios.post(url, payload, {
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            let responseText = "";
            if (response.data.candidates && response.data.candidates[0] && response.data.candidates[0].content && response.data.candidates[0].content.parts) {
                responseText = response.data.candidates[0].content.parts[0].text;
            } else {
                console.warn("⚠️ [REST] Unexpected response structure:", JSON.stringify(response.data));
                return;
            }

            console.log(`📥 [REST] Response: ${responseText.substring(0, 50)}...`);
            this.onTranscript?.(responseText);

            // Convert to Audio
            try {
                const audioBase64 = await textToSpeechBase64(responseText, "ar-EG-SalmaNeural");
                const audioBuffer = Buffer.from(audioBase64, 'base64');
                this.onAudioResponse?.(audioBuffer);
            } catch (e) {
                console.error("❌ [REST] TTS Error:", e);
            }

        } catch (error) {
            console.error("❌ [REST] Error:", error.message);
            if (error.response) {
                const errorData = JSON.stringify(error.response.data, null, 2);
                console.error("❌ [REST] Response Data:", errorData);
                require('fs').writeFileSync('server_error.log', errorData);
            }
            this.onError?.(error);
        }
    }
}

module.exports = GeminiRestClient;
