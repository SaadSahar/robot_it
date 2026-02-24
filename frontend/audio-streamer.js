/**
 * Audio Streamer - Captures and encodes audio from microphone
 * Converts audio to PCM 16-bit, 16kHz format for Gemini Live API
 */

class AudioStreamer {
    constructor(websocket) {
        this.ws = websocket;
        this.audioContext = null;
        this.mediaStream = null;
        this.processor = null;
        this.source = null;
        this.isStreaming = false;
        this.sampleRate = 16000; // 16kHz for Gemini Live API
        this.onVolume = null; // Callback for volume updates
        this.volumeThreshold = 0.1; // Threshold for speech detection
    }

    /**
     * Initialize audio context and request microphone access
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            console.log('🎤 [AUDIO-STREAMER] Initializing...');

            // Request microphone access
            this.mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: this.sampleRate,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            console.log('✓ [AUDIO-STREAMER] Microphone access granted');

            // Create audio context
            this.audioContext = new AudioContext({
                sampleRate: this.sampleRate
            });

            // Create media stream source
            this.source = this.audioContext.createMediaStreamSource(this.mediaStream);

            console.log('✓ [AUDIO-STREAMER] Audio context created');

        } catch (error) {
            console.error('✗ [AUDIO-STREAMER] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Start streaming audio
     * @returns {Promise<void>}
     */
    async start() {
        if (this.isStreaming) {
            console.warn('⚠️ [AUDIO-STREAMER] Already streaming');
            return;
        }

        try {
            console.log('🎤 [AUDIO-STREAMER] Starting stream...');

            // Initialize if not already done
            if (!this.audioContext) {
                await this.initialize();
            }

            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            // Create script processor
            const bufferSize = 4096;
            this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

            // Set up audio processing callback
            this.processor.onaudioprocess = (e) => {
                if (!this.isStreaming) return;

                const inputData = e.inputBuffer.getChannelData(0);

                // Calculate RMS (Root Mean Square) for volume detection
                let sum = 0;
                for (let i = 0; i < inputData.length; i++) {
                    sum += inputData[i] * inputData[i];
                }
                const rms = Math.sqrt(sum / inputData.length);

                // Trigger volume callback
                if (this.onVolume) {
                    this.onVolume(rms);
                }

                const pcmData = this.floatTo16BitPCM(inputData);

                // Send to WebSocket
                if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                    this.ws.send(pcmData);
                }
            };

            // Connect the audio graph
            this.source.connect(this.processor);
            this.processor.connect(this.audioContext.destination);

            this.isStreaming = true;
            console.log('✓ [AUDIO-STREAMER] Streaming started');

        } catch (error) {
            console.error('✗ [AUDIO-STREAMER] Failed to start streaming:', error);
            throw error;
        }
    }

    /**
     * Stop streaming audio
     */
    stop() {
        if (!this.isStreaming) {
            console.warn('⚠️ [AUDIO-STREAMER] Not streaming');
            return;
        }

        console.log('🔇 [AUDIO-STREAMER] Stopping stream...');

        this.isStreaming = false;

        // Disconnect processor
        if (this.processor) {
            this.processor.disconnect();
            this.processor = null;
        }

        console.log('✓ [AUDIO-STREAMER] Streaming stopped');
    }

    /**
     * Convert Float32Array to 16-bit PCM
     * @param {Float32Array} float32Array - Input audio data
     * @returns {ArrayBuffer} PCM data
     */
    floatTo16BitPCM(float32Array) {
        const buffer = new ArrayBuffer(float32Array.length * 2);
        const view = new DataView(buffer);

        for (let i = 0; i < float32Array.length; i++) {
            // Clamp to [-1, 1]
            let s = Math.max(-1, Math.min(1, float32Array[i]));

            // Convert to 16-bit signed integer (little-endian)
            view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        }

        return buffer;
    }

    /**
     * Clean up resources
     */
    destroy() {
        console.log('🗑️ [AUDIO-STREAMER] Cleaning up...');

        this.stop();

        if (this.source) {
            this.source.disconnect();
            this.source = null;
        }

        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => track.stop());
            this.mediaStream = null;
        }

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        console.log('✓ [AUDIO-STREAMER] Cleaned up');
    }

    /**
     * Get current streaming state
     * @returns {boolean}
     */
    isActive() {
        return this.isStreaming;
    }
}

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioStreamer;
}
