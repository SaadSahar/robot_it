# Gemini Live API Migration - Complete ✅

## Overview

Successfully migrated the Voice Chatbot from the old architecture (Speech-to-Text → Text AI → Text-to-Speech) to the new direct audio streaming architecture using **Gemini Live API**.

---

## Architecture Changes

### Old Architecture (DEPRECATED)
```
User → Web Speech API (STT) → Node.js → Gemini Text API → Edge-TTS → User
```

### New Architecture (CURRENT)
```
User → Web Audio API (PCM 16kHz) → Node.js → Gemini Live API (WSS) → PCM Audio (24kHz) → User
```

---

## Files Created

### Backend Files
1. **`backend/auth.js`** - Google Cloud authentication manager
   - Handles OAuth authentication for Gemini Live API
   - Uses Application Default Credentials (ADC)
   - Provides access token management

2. **`backend/gemini-live-handler.js`** - Gemini Live API WebSocket handler
   - Manages bidirectional audio streaming
   - Handles session setup and configuration
   - Processes audio chunks and transcripts
   - Manages interruptions and errors

### Frontend Files
3. **`frontend/audio-streamer.js`** - Audio capture and encoding
   - Captures microphone audio using Web Audio API
   - Converts to PCM 16-bit, 16kHz format
   - Streams audio via WebSocket

4. **`frontend/audio-player.js`** - Audio playback manager
   - Decodes PCM 24kHz audio from server
   - Manages playback queue
   - Handles audio buffering and streaming

---

## Files Modified

### Backend
1. **`backend/config.js`**
   - Added Gemini Live API configuration
   - Added audio format settings (16kHz in, 24kHz out)
   - Added voice and language settings
   - Updated validation logic

2. **`backend/server.js`**
   - Replaced text-based WebSocket handler with audio streaming
   - Integrated Gemini Live session management
   - Added audio chunk forwarding
   - Removed Edge-TTS dependencies

### Frontend
3. **`frontend/app.js`**
   - Removed Web Speech API (STT) dependency
   - Integrated AudioStreamer and AudioPlayer
   - Updated WebSocket message handling
   - Added audio streaming controls

4. **`frontend/index.html`**
   - Added script tags for audio-streamer.js and audio-player.js
   - Removed TTS debug panel

### Configuration
5. **`package.json`**
   - Updated version to 4.0.0
   - Added `google-auth-library` dependency
   - Updated keywords and description

6. **`.env`**
   - Added `GOOGLE_CLOUD_PROJECT_ID` (required)
   - Added `GOOGLE_CLOUD_REGION` (required)
   - Added `GEMINI_LIVE_MODEL` configuration
   - Added `GEMINI_VOICE_NAME` and `GEMINI_LANGUAGE_CODE`
   - Added setup instructions

---

## Files Deleted

1. **`backend/tts-server.py`** - Edge-TTS Python server (no longer needed)
2. **`backend/gemini-text-handler.js`** - Text-based Gemini handler (replaced by Live API)

---

## Technical Specifications

### Audio Formats
- **Input**: Raw 16-bit PCM, 16kHz, mono, little-endian
- **Output**: Raw 16-bit PCM, 24kHz, mono, little-endian
- **Input MIME Type**: `audio/pcm;rate=16000`

### Model Configuration
- **Model ID**: `gemini-live-2.5-flash-native-audio`
- **Platform**: Google Cloud Vertex AI
- **Region**: `us-central1` (configurable)
- **Voice**: Charon (configurable)
- **Language**: Arabic (Egypt) - `ar-EG` (configurable)

### WebSocket Protocol
- **Protocol**: WebSocket Secure (WSS)
- **Endpoint**: Vertex AI Live API
- **Authentication**: Bearer token (OAuth)

---

## Setup Instructions

### Prerequisites
1. Google Cloud Project with Vertex AI API enabled
2. Service Account with appropriate permissions
3. Node.js 16+ installed

### Step 1: Google Cloud Setup

1. **Create a Google Cloud Project**
   - Go to: https://console.cloud.google.com/projectcreate
   - Create a new project or select existing one

2. **Enable Vertex AI API**
   - Go to: https://console.cloud.google.com/apis/library/aiplatform.googleapis.com
   - Click "Enable"

3. **Create a Service Account**
   - Go to: https://console.cloud.google.com/iam-admin/serviceaccounts
   - Click "Create Service Account"
   - Grant roles: "Vertex AI User" or "Editor"
   - Click "Create and Continue"

4. **Download Service Account Key**
   - Click on the created service account
   - Go to "Keys" tab
   - Click "Add Key" → "Create new key"
   - Select "JSON" format
   - Download the key file

5. **Set Environment Variable**
   ```bash
   # Linux/Mac
   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
   
   # Windows (Command Prompt)
   set GOOGLE_APPLICATION_CREDENTIALS=C:\path\to\key.json
   
   # Windows (PowerShell)
   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\path\to\key.json"
   ```

### Step 2: Update Configuration

Edit `.env` file:
```env
# Required
GOOGLE_CLOUD_PROJECT_ID=your-project-id-here
GOOGLE_CLOUD_REGION=us-central1

# Optional (with defaults)
GEMINI_LIVE_MODEL=gemini-live-2.5-flash-native-audio
GEMINI_VOICE_NAME=Charon
GEMINI_LANGUAGE_CODE=ar-EG
WAKE_WORD=روبوت
PORT=8080
DEBUG_MODE=true
```

### Step 3: Install Dependencies

```bash
cd bot_it
npm install
```

This will install:
- `google-auth-library` - For OAuth authentication
- Other existing dependencies

### Step 4: Start the Server

```bash
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

### Step 5: Open in Browser

Navigate to: http://localhost:8080

---

## Usage

1. **Click the microphone button** to start talking
2. **Say "روبوت" (Robot)** followed by your question
3. **Listen to the response** in Arabic

### Example Questions
- "روبوت ما هي لغة بايثون؟"
- "روبوت ما الفرق بين TCP و UDP؟"
- "روبوت ما هي قواعد البيانات؟"
- "روبوت ما هو الذكاء الاصطناعي؟"

---

## Key Features

### ✅ Real-time Audio Streaming
- Direct PCM audio streaming (no intermediate text conversion)
- Low latency response
- Natural conversation flow

### ✅ Native Audio Support
- Input: 16kHz PCM (optimized for speech recognition)
- Output: 24kHz PCM (high-quality voice synthesis)

### ✅ Wake Word Detection
- Bot only responds when addressed with "روبوت"
- Reduces false activations
- Maintains focus on computer science topics

### ✅ Interruption Support
- Users can interrupt the bot's response
- Seamless conversation flow
- Natural interaction patterns

### ✅ Arabic Language Support
- Native Arabic voice synthesis
- Egyptian Arabic accent (configurable)
- Specialized in computer science topics

---

## Troubleshooting

### Error: "Google Cloud credentials not found"
**Solution**: Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable to your service account key file path.

### Error: "Project ID not found"
**Solution**: Set `GOOGLE_CLOUD_PROJECT_ID` in `.env` file to your Google Cloud project ID.

### Error: "Access token: Could not load the default credentials"
**Solution**: 
1. Verify service account key file exists
2. Check environment variable is set correctly
3. Ensure service account has proper permissions

### No audio output
**Solution**:
1. Check browser console for errors
2. Ensure microphone permissions are granted
3. Verify WebSocket connection is established
4. Check debug log for detailed error messages

### Poor audio quality
**Solution**:
1. Use a good quality microphone
2. Reduce background noise
3. Speak clearly and at moderate pace
4. Ensure stable internet connection

---

## Browser Compatibility

- ✅ Chrome 90+
- ✅ Edge 90+
- ⚠️ Firefox 85+ (may require configuration)
- ❌ Safari (limited Web Audio API support)

**Recommended**: Google Chrome or Microsoft Edge

---

## Performance Notes

### Latency
- **Expected**: 1-2 seconds for first response
- **Subsequent**: < 1 second for streaming responses

### Bandwidth
- **Upload**: ~32 KB/s (16kHz PCM)
- **Download**: ~48 KB/s (24kHz PCM)

### CPU Usage
- **Client**: Low (Web Audio API is hardware-accelerated)
- **Server**: Moderate (WebSocket + audio processing)

---

## Future Enhancements

Potential improvements for future versions:

1. **Voice Activity Detection (VAD)**
   - Automatic start/stop of recording
   - Better silence detection

2. **Multiple Language Support**
   - Easy switching between languages
   - Different voices per language

3. **Conversation History**
   - Persistent chat history
   - Context-aware responses

4. **Audio Visualization**
   - Real-time waveform display
   - Frequency analysis

5. **Mobile Support**
   - Progressive Web App (PWA)
   - Offline capabilities

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (Client)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐         ┌─────────────────┐               │
│  │ AudioStreamer   │         │  AudioPlayer    │               │
│  │  (Capture)      │         │  (Playback)     │               │
│  └────────┬────────┘         └────────┬────────┘               │
│           │                           │                         │
│           │ PCM 16kHz                 │ PCM 24kHz              │
│           │                           │                         │
│  ┌────────▼───────────────────────────▼────────┐              │
│  │           WebSocket (Binary/JSON)            │              │
│  └────────────────────────┬────────────────────┘              │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │
                            │ WebSocket (WSS)
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                      Node.js Server                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────────────────────────────────────┐           │
│  │          server.js (WebSocket Handler)           │           │
│  └────────────────────┬────────────────────────────┘           │
│                       │                                          │
│  ┌────────────────────▼────────────────────────────┐           │
│  │     gemini-live-handler.js (Session Manager)     │           │
│  └────────────────────┬────────────────────────────┘           │
│                       │                                          │
│                       │ WebSocket (WSS)                          │
│                       │                                          │
└───────────────────────┼──────────────────────────────────────────┘
                        │
                        │
┌───────────────────────▼──────────────────────────────────────────┐
│                  Gemini Live API                                 │
├──────────────────────────────────────────────────────────────────┤
│  • Model: gemini-live-2.5-flash-native-audio                    │
│  • Input: PCM 16kHz                                              │
│  • Output: PCM 24kHz                                             │
│  • Voice: Charon (Arabic)                                        │
└──────────────────────────────────────────────────────────────────┘
```

---

## Summary

✅ **Migration Complete**: Successfully migrated from text-based architecture to direct audio streaming

✅ **Performance Improved**: Lower latency, more natural conversation flow

✅ **Code Quality**: Clean separation of concerns, modular design

✅ **Documentation**: Comprehensive setup and usage instructions

✅ **Ready for Testing**: All files created and configured

---

## Next Steps

1. **Set up Google Cloud credentials** (see Setup Instructions)
2. **Install dependencies**: `npm install`
3. **Start the server**: `npm start`
4. **Test the application** in browser
5. **Monitor debug logs** for any issues
6. **Adjust configuration** as needed

---

## Support

For issues or questions:
1. Check the debug log in the browser console
2. Review server logs for detailed error messages
3. Verify all configuration values in `.env`
4. Ensure Google Cloud setup is correct

---

**Migration Date**: 2025-02-08  
**Version**: 4.0.0  
**Status**: ✅ Complete and Ready for Testing
