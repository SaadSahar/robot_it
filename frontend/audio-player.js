/**
 * Audio Player - Decodes and plays PCM audio from Gemini Live API
 * Handles 24kHz PCM audio output with queue management
 */

class AudioPlayer {
    constructor() {
        this.audioContext = null;
        this.queue = [];
        this.isPlaying = false;
        this.currentSource = null;
        this.sampleRate = 24000; // 24kHz from Gemini Live API
        this.isInitialized = false;
    }

    /**
     * Initialize audio context
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        try {
            console.log('🔊 [AUDIO-PLAYER] Initializing...');

            // Create audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: this.sampleRate
            });

            this.isInitialized = true;
            console.log('✓ [AUDIO-PLAYER] Initialized');

        } catch (error) {
            console.error('✗ [AUDIO-PLAYER] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Add PCM audio data to the playback queue
     * @param {ArrayBuffer} pcmData - Raw PCM audio data (16-bit, 24kHz)
     */
    async addToQueue(pcmData) {
        try {
            // Initialize if not already done
            if (!this.isInitialized) {
                await this.initialize();
            }

            // Resume audio context if suspended
            if (this.audioContext.state === 'suspended') {
                console.log('🔊 [AUDIO-PLAYER] Resuming suspended audio context...');
                await this.audioContext.resume();
                console.log('✓ [AUDIO-PLAYER] Audio context resumed');
            }

            // Convert PCM to Float32
            const int16Array = new Int16Array(pcmData);
            const float32Array = new Float32Array(int16Array.length);

            for (let i = 0; i < int16Array.length; i++) {
                float32Array[i] = int16Array[i] / 32768.0;
            }

            // Add to queue
            this.queue.push(float32Array);
            console.log(`📦 [AUDIO-PLAYER] Added to queue: ${float32Array.length} samples (queue size: ${this.queue.length})`);

            // Start playing if not already playing
            if (!this.isPlaying) {
                this.playNext();
            }

        } catch (error) {
            console.error('✗ [AUDIO-PLAYER] Failed to add to queue:', error);
        }
    }

    /**
     * Play the next audio chunk from the queue
     */
    async playNext() {
        if (this.queue.length === 0) {
            this.isPlaying = false;
            console.log('✓ [AUDIO-PLAYER] Queue empty, stopped playing');
            return;
        }

        this.isPlaying = true;
        const data = this.queue.shift();

        try {
            // Create audio buffer
            const buffer = this.audioContext.createBuffer(1, data.length, this.sampleRate);
            buffer.getChannelData(0).set(data);

            // Create buffer source
            this.currentSource = this.audioContext.createBufferSource();
            this.currentSource.buffer = buffer;
            this.currentSource.connect(this.audioContext.destination);

            // Set up event handlers
            this.currentSource.onended = () => {
                this.currentSource = null;
                this.playNext();
            };

            // Start playback
            this.currentSource.start();
            console.log(`🔊 [AUDIO-PLAYER] Playing: ${data.length} samples (remaining: ${this.queue.length})`);

        } catch (error) {
            console.error('✗ [AUDIO-PLAYER] Playback failed:', error);
            this.currentSource = null;
            this.playNext();
        }
    }

    /**
     * Stop playback and clear the queue
     */
    stop() {
        console.log('🛑 [AUDIO-PLAYER] Stopping playback...');

        // Stop current source
        if (this.currentSource) {
            try {
                this.currentSource.stop();
                this.currentSource.disconnect();
            } catch (error) {
                // Ignore errors when stopping
            }
            this.currentSource = null;
        }

        // Clear queue
        this.queue = [];
        this.isPlaying = false;

        console.log('✓ [AUDIO-PLAYER] Stopped');
    }

    /**
     * Flush the queue (stop current playback and clear queue)
     */
    flush() {
        console.log('🗑️ [AUDIO-PLAYER] Flushing queue...');

        // Stop current source
        if (this.currentSource) {
            try {
                this.currentSource.stop();
                this.currentSource.disconnect();
            } catch (error) {
                // Ignore errors when stopping
            }
            this.currentSource = null;
        }

        // Clear queue
        this.queue = [];
        this.isPlaying = false;

        console.log('✓ [AUDIO-PLAYER] Queue flushed');
    }

    /**
     * Get current playback state
     * @returns {Object} State information
     */
    getState() {
        return {
            isPlaying: this.isPlaying,
            queueLength: this.queue.length,
            isInitialized: this.isInitialized,
            audioContextState: this.audioContext ? this.audioContext.state : 'unknown'
        };
    }

    /**
     * Clean up resources
     */
    destroy() {
        console.log('🗑️ [AUDIO-PLAYER] Cleaning up...');

        this.stop();

        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }

        this.isInitialized = false;
        console.log('✓ [AUDIO-PLAYER] Cleaned up');
    }
}

// Export for use in app.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AudioPlayer;
}
