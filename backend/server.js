console.log("🚀 SERVER STARTING FROM:", __dirname);
/**
 * WebSocket Server for Voice Chatbot with Gemini Live API
 * Handles PCM audio streaming (bidirectional) with Gemini Live API
 * Architecture: Web Audio API (PCM) → WebSocket → Node.js → Gemini Live API → PCM Audio Response
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { config, validateConfig, checkWakeWord } = require('./config');
// const { createGeminiLiveSession } = require('./gemini-live-handler');
// server.js REVERT: Using GeminiLiveSession for everything
const { GeminiLiveSession } = require('./gemini-live-handler');
// const GeminiRestClient = require('./gemini-rest-client'); 

// ... inside handleConnection ...

// Initialize Gemini Live session
async function initGeminiSession(session) {
  // Disconnect existing session if any
  if (session.gemini) {
    if (session.gemini.disconnect) session.gemini.disconnect();
  }

  // Create new session
  // config.geminiLive.model should be "gemini-live-2.5-flash-native-audio"
  const modelResource = `projects/${config.googleCloudProjectId}/locations/${config.googleCloudRegion}/publishers/google/models/${config.geminiLive.model}`;

  const geminiSession = new GeminiLiveSession({
    model: modelResource,
    voiceName: config.geminiLive.voiceName,
    languageCode: config.geminiLive.languageCode,
    systemPrompt: config.systemInstruction || "You are a helpful AI assistant. Reply in Arabic.",
    region: config.googleCloud?.region || 'us-central1'
  });

  // Setup event handlers
  geminiSession.onSetupComplete = () => {
    const msg = `✓ [SERVER] Gemini Live session ready for ${session.id}`;
    console.log(msg);
    require('fs').appendFileSync('logs/server_debug.log', msg + '\n');
    sendMessage(session.ws, 'status', {
      status: 'ready',
      message: 'تم الاتصال بـ Gemini Live بنجاح'
    });
  };

  geminiSession.onAudioResponse = (audioData) => {
    // console.log(`🔊 [SERVER] Sending audio chunk: ${audioData.length} bytes`);
    if (session.ws && session.ws.readyState === WebSocket.OPEN) {
      session.ws.send(audioData);
    }
  };

  geminiSession.onTranscript = (text) => {
    // console.log(`📝 [SERVER] Transcript: ${text}`);
    // Only send if you want frontend to display it, otherwise EdgeTTS handles audio
  };

  const fs = require('fs');

  geminiSession.onError = (error) => {
    const errorMsg = `❌ [SERVER] Gemini Live error for ${session.id}: ${error.message}`;
    console.error(errorMsg);
    require('fs').appendFileSync('logs/server_debug.log', errorMsg + '\n');
    sendMessage(session.ws, 'error', {
      message: 'خطأ في Gemini Live API: ' + error.message
    });
  };

  geminiSession.onClose = (code, reason) => {
    const msg = `✗ [SERVER] Gemini Live session closed for ${session.id}. Code: ${code}, Reason: ${reason}`;
    console.log(msg);
    require('fs').appendFileSync('logs/server_debug.log', msg + '\n');
    sendMessage(session.ws, 'status', {
      status: 'disconnected',
      message: 'انقطع الاتصال بـ Gemini Live'
    });
  };

  // Connect to Gemini Live API
  await geminiSession.connect();

  // Store in session
  session.gemini = geminiSession;
}

const { validateAuthConfig } = require('./auth');

// Validate configuration on startup
try {
  validateConfig();
} catch (error) {
  console.error('✗ Configuration error:', error.message);
  process.exit(1);
}

// Create Express app and HTTP server
const app = express();
const server = http.createServer(app);

// Serve static files from frontend directory
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve index.html for root route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    model: config.geminiLive.model,
    api: 'gemini-live-api',
    input: 'PCM audio (16kHz)',
    output: 'PCM audio (24kHz)'
  });
});

// Store client sessions
const sessions = new Map();

/**
 * Create a new session for a client
 * @param {WebSocket} ws - WebSocket connection
 * @returns {Object} Session object
 */
function createSession(ws) {
  const sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);

  const session = {
    id: sessionId,
    ws,
    status: 'ready',
    geminiSession: null,
    transcriptBuffer: '',
    isListening: false
  };

  sessions.set(sessionId, session);
  console.log(`✓ Session created: ${sessionId}`);

  return session;
}

/**
 * Remove a session
 * @param {string} sessionId - Session ID
 */
function removeSession(sessionId) {
  const session = sessions.get(sessionId);
  if (session) {
    // Disconnect Gemini Live session if exists
    if (session.geminiSession) {
      session.geminiSession.disconnect();
    }
    sessions.delete(sessionId);
    console.log(`✓ Session removed: ${sessionId}`);
  }
}

/**
 * Send a message to a client
 * @param {WebSocket} ws - WebSocket connection
 * @param {string} type - Message type
 * @param {Object} data - Message data
 */
function sendMessage(ws, type, data = {}) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, ...data }));
  }
}


/**
 * Handle audio chunk from client
 * @param {Object} session - Session object
 * @param {Buffer} audioData - PCM audio data
 */
function handleAudioChunk(session, audioData) {
  if (!session.gemini) {
    console.warn(`⚠️ [SERVER] Gemini Live session not ready for ${session.id}`);
    return;
  }

  // Forward audio to Gemini Live API (REST Client)
  session.gemini.sendAudio(audioData);
}

/**
 * Handle transcript from client (for wake word detection)
 * @param {Object} session - Session object
 * @param {string} text - Transcript text
 */
function handleTranscript(session, text) {
  if (!session.gemini) return;
  console.log(`🎤 [SERVER] Transcript from ${session.id}: ${text}`);
  session.gemini.sendText(text);
}


/**
 * Handle WebSocket connection
 */
// ============================================
// 🚀 Server Startup with Port Handling
// ============================================
const DEFAULT_PORT = config.port;
let currentPort = DEFAULT_PORT;
let wssInstance = null;
let activeServerInstance = null;

function startServer(port) {
  // Close previous server instance if exists
  if (activeServerInstance) {
    activeServerInstance.close();
  }

  const serverInstance = server.listen(port);
  activeServerInstance = serverInstance;

  serverInstance.on('listening', () => {
    currentPort = port;

    // Close previous WebSocket server if exists
    if (wssInstance) {
      wssInstance.close();
    }

    // Create WebSocket server after HTTP server is listening
    wssInstance = new WebSocket.Server({ server: serverInstance });

    // Re-attach connection handler to new WebSocket server
    wssInstance.on('connection', async (ws) => {
      console.log('✓ New client connected');
      ws.on('message', (msg) => console.log(`🔍 [DEBUG] RAW MESSAGE: ${msg.toString().substring(0, 50)}`));

      const session = createSession(ws);

      // Handle incoming messages - Attach immediately
      session.ws.on('message', async (message, isBinary) => {
        // console.log("DEBUG: HANDLER STARTED for message size " + message.length);
        try {
          if (isBinary) {
            if (session.gemini) {
              // Audio Data
              // session.gemini.sendAudio(message);
              // For now, let's just log
              console.log(`🎤 [SERVER] Audio chunk received: ${message.length} bytes`);
              // If we want to send audio to Gemini Live:
              if (session.gemini.sendAudio) session.gemini.sendAudio(message);
            }
          } else {
            const msgStr = message.toString();
            try {
              const msg = JSON.parse(msgStr);
              console.log(`📩 [SERVER] Parsed Message Type:`, Object.keys(msg));

              if (msg.realtime_input && msg.realtime_input.media_chunks) {
                for (const chunk of msg.realtime_input.media_chunks) {
                  if (chunk.data && session.gemini && session.gemini.sendAudio) {
                    const audioBuffer = Buffer.from(chunk.data, 'base64');
                    session.gemini.sendAudio(audioBuffer);
                  }
                }
              } else if (msg.client_content && msg.client_content.turns) {
                const text = msg.client_content.turns[0].parts[0].text;
                console.log(`📝 [SERVER] Extracted text: \"${text}\"`);
                if (text && session.gemini && session.gemini.sendText) {
                  session.gemini.sendText(text);
                } else {
                  console.warn("⚠️ [SERVER] Missing text or session.gemini.sendText");
                }
              } else if (msg.type === 'stop_listening') {
                console.log("🛑 [SERVER] Stop listening received. Signaling end of turn.");
                if (session.gemini && session.gemini.sendEndTurn) {
                  session.gemini.sendEndTurn();
                }
              } else if (msg.type === 'start_listening') {
                console.log("▶️ [SERVER] Start listening received.");
              } else {
                console.log("⚠️ [SERVER] Unknown message format:", msg);
              }
            } catch (e) {
              console.log(`📩 [SERVER] Received non-JSON message: "${msgStr}"`);
              if (msgStr === 'PING') {
                // sendMessage(ws, 'PONG', {}); 
              }
            }
          }
        } catch (error) {
          console.error('❌ [SERVER] Error handling message:', error);
        }
      });

      // Send initial status
      sendMessage(ws, 'status', {
        status: 'connecting',
        message: 'جاري الاتصال بـ Gemini Live API...'
      });

      // Initialize Gemini Live session
      try {
        await initGeminiSession(session);
      } catch (error) {
        const errorMsg = `✗ [SERVER] Failed to initialize session: ${error.message}`;
        console.error(errorMsg);
        require('fs').appendFileSync('logs/server_init_error.log', errorMsg + '\n');
        sendMessage(ws, 'error', {
          message: 'فشل الاتصال: ' + error.message
        });
        return;
      }



      // Handle connection close
      ws.on('close', () => {
        console.log('✗ Client disconnected');
        removeSession(session.id);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('❌ [SERVER] WebSocket error:', error);
      });
    });

    console.log('='.repeat(60));
    console.log('🤖 Voice Chatbot Server Started (Gemini Live API)');
    console.log('='.repeat(60));
    console.log(`📡 Server running at: http://localhost:${port}`);
    console.log(`🔌 WebSocket endpoint: ws://localhost:${port}`);
    console.log(`🧠 Model: ${config.geminiLive.model} (Gemini Live API)`);
    console.log(`🎤 Input: PCM Audio (16kHz) from Web Audio API`);
    console.log(`🔊 Output: PCM Audio (24kHz) to Web Audio API`);
    console.log(`🎯 Voice: ${config.geminiLive.voiceName} (${config.geminiLive.languageCode})`);
    console.log(`🔑 Wake word: "${config.wakeWord}"`);
    console.log(`📊 Debug mode: ${config.debugMode}`);
    console.log('='.repeat(60));
  });

  serverInstance.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const nextPort = parseInt(port) + 1;
      console.log(`⚠️ المنفذ ${port} مستخدم، جاري المحاولة على المنفذ ${nextPort}...`);
      currentPort = nextPort;

      if (currentPort > DEFAULT_PORT + 10) {
        console.error('❌ فشل العثور على منفذ متاح!');
        console.log('💡 الحل: شغّل kill-port.bat أو أغلق البرامج التي تستخدم المنافذ');
        process.exit(1);
      }

      startServer(currentPort);
    } else {
      console.error('❌ خطأ في الخادم:', err);
      process.exit(1);
    }
  });

  return serverInstance;
}

// Start server with port conflict handling
startServer(DEFAULT_PORT);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');

  // Close all Gemini Live sessions
  for (const [sessionId, session] of sessions.entries()) {
    if (session.geminiSession) {
      session.geminiSession.disconnect();
    }
  }

  server.close(() => {
    console.log('✓ Server closed');
    process.exit(0);
  });
});

module.exports = { app, server };
