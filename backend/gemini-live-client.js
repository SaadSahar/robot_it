/**
 * Gemini Live API Client
 * Handles WebSocket connection to Gemini Live API for real-time audio processing
 */

const WebSocket = require('ws');
const EventEmitter = require('events');

class GeminiLiveClient extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.ws = null;
    this.isConnected = false;
    this.sessionId = null;
    this.isSetupComplete = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000; // 3 seconds
  }

  /**
   * Connect to Gemini Live API via WebSocket
   * @returns {Promise<void>}
   */
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        // Use API key as query parameter instead of Bearer token
        // This is the correct authentication method for Gemini Live API
        const endpointWithKey = `${this.config.liveApiEndpoint}?key=${this.config.googleCloudApiKey}`;
        console.log(`🔌 [GEMINI-LIVE] Connecting to: ${endpointWithKey.substring(0, 80)}...`);
        
        // Create WebSocket connection
        this.ws = new WebSocket(endpointWithKey, {
          headers: {
            'Content-Type': 'application/json'
          }
        });

        // Set up event handlers
        this.ws.on('open', () => {
          console.log('✅ [GEMINI-LIVE] WebSocket connection established');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.emit('open');
          resolve();
        });

        this.ws.on('message', (data) => {
          this.handleMessage(data);
        });

        this.ws.on('error', (error) => {
          console.error('❌ [GEMINI-LIVE] WebSocket error:', error.message);
          this.isConnected = false;
          this.emit('error', error);
          reject(error);
        });

        this.ws.on('close', (code, reason) => {
          console.log(`🔌 [GEMINI-LIVE] WebSocket closed: ${code} - ${reason}`);
          this.isConnected = false;
          this.isSetupComplete = false;
          this.emit('close', { code, reason });
          
          // Attempt to reconnect if not intentionally closed
          if (code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.attemptReconnect();
          }
        });

        // Set timeout for connection
        const timeout = setTimeout(() => {
          if (!this.isConnected) {
            reject(new Error('Connection timeout'));
          }
        }, 10000); // 10 seconds

        this.ws.once('open', () => {
          clearTimeout(timeout);
        });

      } catch (error) {
        console.error('❌ [GEMINI-LIVE] Connection error:', error);
        reject(error);
      }
    });
  }

  /**
   * Attempt to reconnect to the API
   */
  attemptReconnect() {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    
    console.log(`🔄 [GEMINI-LIVE] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect()
        .then(() => {
          if (this.isSetupComplete) {
            this.sendSetup();
          }
        })
        .catch((error) => {
          console.error('❌ [GEMINI-LIVE] Reconnection failed:', error.message);
        });
    }, delay);
  }

  /**
   * Send Setup message to initialize the session
   * This must be sent first before any audio data
   */
  sendSetup() {
    if (!this.isConnected) {
      console.error('❌ [GEMINI-LIVE] Cannot send setup: not connected');
      return;
    }

    const setupMessage = {
      setup: {
        model: `models/${this.config.vertexModel}`,
        generationConfig: {
          responseModalities: this.config.responseModalities,
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: this.config.voiceName
              }
            }
          }
        },
        systemInstruction: {
          parts: [{
            text: this.config.systemInstruction
          }]
        }
      }
    };

    console.log('📤 [GEMINI-LIVE] Sending setup message...');
    console.log('📋 [GEMINI-LIVE] Model:', setupMessage.setup.model);
    console.log('📋 [GEMINI-LIVE] Voice:', setupMessage.setup.generationConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName);
    console.log('📋 [GEMINI-LIVE] Modalities:', setupMessage.setup.generationConfig.responseModalities);

    try {
      this.ws.send(JSON.stringify(setupMessage));
      this.isSetupComplete = true;
      console.log('✅ [GEMINI-LIVE] Setup message sent successfully');
    } catch (error) {
      console.error('❌ [GEMINI-LIVE] Error sending setup message:', error);
      this.emit('error', error);
    }
  }

  /**
   * Send audio data as realtime input
   * @param {string} base64PCMData - Base64 encoded PCM 16-bit audio data
   */
  sendAudio(base64PCMData) {
    if (!this.isConnected || !this.isSetupComplete) {
      console.warn('⚠️ [GEMINI-LIVE] Cannot send audio: not connected or setup not complete');
      return;
    }

    const message = {
      realtimeInput: {
        mediaChunks: [{
          mimeType: 'audio/pcm',
          data: base64PCMData
        }]
      }
    };

    try {
      this.ws.send(JSON.stringify(message));
      
      if (this.config.debugMode) {
        console.log(`📤 [GEMINI-LIVE] Sent audio chunk: ${base64PCMData.length} chars`);
      }
    } catch (error) {
      console.error('❌ [GEMINI-LIVE] Error sending audio:', error);
      this.emit('error', error);
    }
  }

  /**
   * Handle incoming messages from Gemini Live API
   * @param {Buffer} data - Raw message data
   */
  handleMessage(data) {
    try {
      const message = JSON.parse(data.toString());
      
      if (this.config.debugMode) {
        console.log('📥 [GEMINI-LIVE] Received message:', JSON.stringify(message, null, 2));
      }

      // Handle setup complete response
      if (message.setupComplete) {
        console.log('✅ [GEMINI-LIVE] Setup complete acknowledged');
        this.emit('setupComplete');
        return;
      }

      // Handle server content (responses)
      if (message.serverContent) {
        this.handleServerContent(message.serverContent);
      }

      // Handle turn complete
      if (message.serverContent && message.serverContent.turnComplete) {
        console.log('✅ [GEMINI-LIVE] Turn complete');
        this.emit('turnComplete');
      }

    } catch (error) {
      console.error('❌ [GEMINI-LIVE] Error parsing message:', error);
    }
  }

  /**
   * Handle server content (text and audio responses)
   * @param {Object} serverContent - Server content object
   */
  handleServerContent(serverContent) {
    if (!serverContent.modelTurn || !serverContent.modelTurn.parts) {
      return;
    }

    const parts = serverContent.modelTurn.parts;
    
    for (const part of parts) {
      // Handle text response
      if (part.text) {
        const text = part.text;
        console.log(`📝 [GEMINI-LIVE] Text response: "${text}"`);
        this.emit('text', text);
      }

      // Handle audio response
      if (part.inlineData && part.inlineData.data) {
        const audioData = part.inlineData.data;
        console.log(`🎵 [GEMINI-LIVE] Audio response: ${audioData.length} chars`);
        this.emit('audio', audioData);
      }
    }
  }

  /**
   * Send a text message to the API
   * @param {string} text - Text message to send
   */
  sendText(text) {
    if (!this.isConnected || !this.isSetupComplete) {
      console.warn('⚠️ [GEMINI-LIVE] Cannot send text: not connected or setup not complete');
      return;
    }

    const message = {
      realtimeInput: {
        text: text
      }
    };

    try {
      this.ws.send(JSON.stringify(message));
      console.log(`📤 [GEMINI-LIVE] Sent text: "${text}"`);
    } catch (error) {
      console.error('❌ [GEMINI-LIVE] Error sending text:', error);
      this.emit('error', error);
    }
  }

  /**
   * Close the WebSocket connection
   */
  disconnect() {
    if (this.ws) {
      console.log('🔌 [GEMINI-LIVE] Disconnecting...');
      this.ws.close(1000, 'Intentional disconnect');
      this.isConnected = false;
      this.isSetupComplete = false;
    }
  }

  /**
   * Get connection status
   * @returns {Object} Connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      isSetupComplete: this.isSetupComplete,
      sessionId: this.sessionId,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

module.exports = { GeminiLiveClient };
