/**
 * Voice Chatbot Frontend Application
 * Gemini Live API: Web Audio API (PCM) → WebSocket → Gemini Live API → PCM Audio Response
 */

// Configuration
const WS_URL = `ws://${window.location.host}`;

// State
let ws = null;
let audioStreamer = null;
let audioPlayer = null;
let isConnected = false;
let isListening = false;
let currentLanguage = 'ar-SA';

// DOM Elements
const recordButton = document.getElementById('recordButton');
const testAudioButton = document.getElementById('testAudioButton');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const statusMessage = document.getElementById('statusMessage');
const transcript = document.getElementById('transcript');
const connectionStatus = document.getElementById('connectionStatus');
const debugLog = document.getElementById('debugLog');
const clearDebug = document.getElementById('clearDebug');
const assistantTextDisplay = document.getElementById('assistantTextDisplay');

// Debug log array
let debugEntries = [];
let assistantTextBuffer = '';

/**
 * Add log entry to debug console
 * @param {string} message - Log message
 * @param {string} type - Log type (info, success, warning, error)
 */
function addDebugLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('ar-SA', { hour12: false });
    const entry = {
        timestamp,
        message,
        type
    };

    debugEntries.push(entry);

    // Limit to last 100 entries
    if (debugEntries.length > 100) {
        debugEntries.shift();
    }

    // Update UI
    updateDebugLog();
}

/**
 * Update debug log display
 */
function updateDebugLog() {
    debugLog.innerHTML = debugEntries.map(entry => {
        const typeClass = entry.type;
        return `<div class="debug-entry ${typeClass}">
            <span class="timestamp">[${entry.timestamp}]</span>
            ${entry.message}
        </div>`;
    }).join('');

    // Scroll to bottom
    debugLog.scrollTop = debugLog.scrollHeight;
}

/**
 * Clear debug log
 */
function clearDebugLog() {
    debugEntries = [];
    updateDebugLog();
}

// Override console methods to also log to debug panel
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.log = function (...args) {
    originalConsoleLog.apply(console, args);
    const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    addDebugLog(message, 'info');
};

console.error = function (...args) {
    originalConsoleError.apply(console, args);
    const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    addDebugLog(message, 'error');
};

console.warn = function (...args) {
    originalConsoleWarn.apply(console, args);
    const message = args.map(arg =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    addDebugLog(message, 'warning');
};

/**
 * Initialize WebSocket connection
 */
function initWebSocket() {
    console.log('🔌 [FRONTEND] Initializing WebSocket...');

    ws = new WebSocket(WS_URL);
    ws.binaryType = 'arraybuffer';

    ws.onopen = async () => {
        console.log('✓ [FRONTEND] WebSocket connected');
        isConnected = true;
        updateConnectionStatus('connected');

        // Initialize audio immediately when WebSocket connects
        try {
            if (!audioStreamer || !audioPlayer) {
                await initAudio();
                console.log('✓ [FRONTEND] Audio initialized on connection');
            }
        } catch (error) {
            console.error('✗ [FRONTEND] Failed to initialize audio:', error);
        }
    };

    ws.onmessage = (event) => {
        handleWebSocketMessage(event);
    };

    ws.onerror = (error) => {
        console.error('✗ [FRONTEND] WebSocket error:', error);
        updateConnectionStatus('error');
    };

    ws.onclose = () => {
        console.log('✗ [FRONTEND] WebSocket disconnected');
        isConnected = false;
        updateConnectionStatus('disconnected');
    };
}

/**
 * Handle WebSocket message from server
 * @param {MessageEvent} event - Message event
 */
function handleWebSocketMessage(event) {
    try {
        // Check if message is binary (audio) or text (JSON)
        if (event.data instanceof ArrayBuffer) {
            // Binary audio data - Handle PCM from server
            console.log(`🔊 [FRONTEND] Received binary audio data: ${event.data.byteLength} bytes`);

            if (audioPlayer && audioPlayer.isInitialized) {
                audioPlayer.addToQueue(event.data);
            } else {
                console.warn('⚠️ [FRONTEND] Audio player not ready for binary data');
            }
            return;
        }

        // Text message - JSON
        const data = JSON.parse(event.data);

        if (data.type) {
            console.log(`📥 [FRONTEND] Message type: ${data.type}`);
        }

        switch (data.type) {
            case 'status':
                handleStatusMessage(data);
                break;

            case 'audio_chunk':
                handleAudioChunk(data);
                break;

            case 'transcript':
                handleTranscript(data);
                break;

            case 'wake_debug':
                handleWakeDebug(data);
                break;

            case 'error':
                handleError(data);
                break;

            default:
                console.warn('⚠️ [FRONTEND] Unknown message type:', data.type);
        }

    } catch (error) {
        console.error('✗ [FRONTEND] Failed to handle message:', error);
    }
}

/**
 * Handle status message
 * @param {Object} data - Status data
 */
function handleStatusMessage(data) {
    console.log(`📊 [FRONTEND] Status: ${data.status} - ${data.message}`);
    updateStatus(data.status, data.message);
}

/**
 * Handle audio chunk from server
 * @param {Object} data - Audio chunk data
 */
function handleAudioChunk(data) {
    const { audio, sampleRate } = data;

    console.log(`🔊 [FRONTEND] Audio chunk received: ${audio.length} bytes, sampleRate: ${sampleRate}Hz`);

    try {
        // Decode base64 and add to player queue
        const audioBuffer = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
        console.log(`🔊 [FRONTEND] Decoded audio buffer: ${audioBuffer.length} bytes`);

        // Check if audio player is initialized
        if (!audioPlayer || !audioPlayer.isInitialized) {
            console.error('✗ [FRONTEND] Audio player not initialized!');
            return;
        }

        // Add to queue
        audioPlayer.addToQueue(audioBuffer.buffer);

        // Show voice indicator
        const voiceIndicator = document.getElementById('voice-indicator');
        if (voiceIndicator) {
            voiceIndicator.classList.remove('hidden');
        }

        // Hide voice indicator after a delay
        setTimeout(() => {
            if (voiceIndicator) {
                voiceIndicator.classList.add('hidden');
            }
        }, 3000);

    } catch (error) {
        console.error('✗ [FRONTEND] Failed to handle audio chunk:', error);
    }
}

/**
 * Handle transcript from server
 * @param {Object} data - Transcript data
 */
function handleTranscript(data) {
    const { text } = data;

    console.log(`📝 [FRONTEND] Transcript: ${text}`);

    // Add to display buffer
    assistantTextBuffer += text;

    // Update display
    if (assistantTextDisplay) {
        assistantTextDisplay.textContent = assistantTextBuffer;
    }
}

/**
 * Handle wake word debug info
 * @param {Object} data - Wake debug data
 */
function handleWakeDebug(data) {
    console.log('🔍 [FRONTEND] Wake word debug:', data);
}

/**
 * Handle error message
 * @param {Object} data - Error data
 */
function handleError(data) {
    console.error('❌ [FRONTEND] Error:', data.message);
    updateStatus('error', data.message);
}

/**
 * Update status display
 * @param {string} status - Status type
 * @param {string} message - Status message
 */
function updateStatus(status, message) {
    if (statusIndicator) {
        statusIndicator.className = 'status-indicator ' + status;
    }

    if (statusText) {
        statusText.textContent = status;
    }

    if (statusMessage) {
        statusMessage.textContent = message;
    }
}

/**
 * Update connection status
 * @param {string} status - Connection status
 */
function updateConnectionStatus(status) {
    if (connectionStatus) {
        connectionStatus.className = 'connection-status ' + status;
        connectionStatus.textContent = status === 'connected' ? 'متصل' :
            status === 'disconnected' ? 'غير متصل' : 'خطأ';
    }
}

/**
 * Initialize audio streamer and player
 */
async function initAudio() {
    console.log('🎤 [FRONTEND] Initializing audio...');

    try {
        // Create audio player
        audioPlayer = new AudioPlayer();
        await audioPlayer.initialize();
        console.log('✓ [FRONTEND] Audio player initialized');

        // Create audio streamer
        audioStreamer = new AudioStreamer(ws);

        // Handle volume events for barge-in
        audioStreamer.onVolume = (volume) => {
            // Check if user is speaking loudly (threshold 0.1) while bot is playing
            if (volume > 0.1 && audioPlayer && audioPlayer.isPlaying) {
                console.log(`🎤 [BARGE-IN] User interrupted! Volume: ${volume.toFixed(2)}`);

                // Stop playback immediately
                audioPlayer.flush();

                // Clear any buffered text
                assistantTextBuffer = '';

                // Optional: Send stop signal to server to clear its buffer too
                // ws.send(JSON.stringify({ type: 'interrupt' })); 
            }
        };

        await audioStreamer.initialize();
        console.log('✓ [FRONTEND] Audio streamer initialized');

    } catch (error) {
        console.error('✗ [FRONTEND] Failed to initialize audio:', error);
        throw error;
    }
}

/**
 * Test audio playback
 */
async function testAudio() {
    console.log('🔊 [FRONTEND] Testing audio playback...');

    try {
        // Initialize audio if not already done
        if (!audioPlayer) {
            await initAudio();
        }

        // Generate a simple test tone (440 Hz sine wave for 1 second)
        const sampleRate = 24000;
        const duration = 1; // seconds
        const numSamples = sampleRate * duration;
        const frequency = 440; // A4 note

        const float32Array = new Float32Array(numSamples);
        for (let i = 0; i < numSamples; i++) {
            const t = i / sampleRate;
            float32Array[i] = 0.3 * Math.sin(2 * Math.PI * frequency * t);
        }

        // Convert to Int16 PCM
        const int16Array = new Int16Array(numSamples);
        for (let i = 0; i < numSamples; i++) {
            int16Array[i] = Math.max(-32768, Math.min(32767, float32Array[i] * 32768));
        }

        // Add to audio player queue
        audioPlayer.addToQueue(int16Array.buffer);

        console.log('✓ [FRONTEND] Test audio tone generated and queued');
        addDebugLog('🔊 تم تشغيل نغمة اختبار (440 Hz)', 'success');

    } catch (error) {
        console.error('✗ [FRONTEND] Test audio failed:', error);
        addDebugLog(`❌ فشل اختبار الصوت: ${error.message}`, 'error');
    }
}

/**
 * Toggle recording/listening
 */
async function toggleRecording() {
    if (!isConnected) {
        console.warn('⚠️ [FRONTEND] Not connected to server');
        return;
    }

    try {
        if (!audioStreamer || !audioPlayer) {
            await initAudio();
        }

        if (isListening) {
            // Stop listening
            audioStreamer.stop();
            isListening = false;

            // Send stop message to server
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'stop_listening' }));
            }

            updateStatus('ready', 'جاهز للاستماع');
            recordButton.textContent = 'اضغط للتحدث';
            recordButton.classList.remove('recording');

        } else {
            // Start listening
            await audioStreamer.start();
            isListening = true;

            // Send start message to server
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'start_listening' }));
            }

            updateStatus('listening', 'جاري الاستماع...');
            recordButton.textContent = 'جاري الاستماع...';
            recordButton.classList.add('recording');
        }

    } catch (error) {
        console.error('✗ [FRONTEND] Failed to toggle recording:', error);
        updateStatus('error', 'فشل بدء التسجيل');
    }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    // Record button
    if (recordButton) {
        recordButton.addEventListener('click', toggleRecording);
    }

    // Test audio button
    if (testAudioButton) {
        testAudioButton.addEventListener('click', testAudio);
    }

    // Clear debug button
    if (clearDebug) {
        clearDebug.addEventListener('click', clearDebugLog);
    }

    // Handle page visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && isListening) {
            console.log('⚠️ [FRONTEND] Page hidden, stopping recording');
            toggleRecording();
        }
    });

    // Handle beforeunload
    window.addEventListener('beforeunload', () => {
        if (audioStreamer) {
            audioStreamer.destroy();
        }
        if (audioPlayer) {
            audioPlayer.destroy();
        }
    });
}

/**
 * Check browser support
 */
function checkBrowserSupport() {
    const unsupported = [];

    if (!window.WebSocket) {
        unsupported.push('WebSocket');
    }

    if (!window.AudioContext && !window.webkitAudioContext) {
        unsupported.push('Web Audio API');
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        unsupported.push('MediaDevices API (microphone access)');
    }

    if (unsupported.length > 0) {
        console.error('✗ [FRONTEND] Browser not supported:', unsupported.join(', '));
        alert(`متصفحك لا يدعم: ${unsupported.join(', ')}`);
        return false;
    }

    console.log('✓ [FRONTEND] Browser supported');
    return true;
}

/**
 * Add transcript message to display
 * @param {string} type - Message type ('user' or 'bot')
 * @param {string} text - Message text
 */
function addTranscriptMessage(type, text) {
    if (!transcript) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `transcript-message ${type}`;
    messageDiv.textContent = text;

    transcript.appendChild(messageDiv);
    transcript.scrollTop = transcript.scrollHeight;
}

// ============================================
// Application Initialization
// ============================================

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 [FRONTEND] Voice Chatbot initializing...');

    // Check browser support
    if (!checkBrowserSupport()) {
        return;
    }

    // Initialize components
    setupEventListeners();
    initWebSocket();

    console.log('✅ [FRONTEND] Voice Chatbot initialized');
    console.log('📝 [FRONTEND] Click the button to start talking');
});
