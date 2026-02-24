/**
 * Reproduction Script for Gemini Live Arabic Support
 * Connects to the local WebSocket server and sends an Arabic greeting.
 * Expects to receive audio back.
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = 3004;
const URL = `ws://localhost:${PORT}`;
const OUTPUT_FILE = path.join(__dirname, 'reproduction_audio.pcm');

// Create WebSocket connection
console.log(`🔌 Connecting to ${URL}...`);
const ws = new WebSocket(URL);

let audioData = [];
let isListening = false;

ws.on('open', () => {
    console.log('✅ Connected to server');
    ws.send("PING");
});

ws.on('message', (data, isBinary) => {
    try {
        // If it's a binary message, it might be raw audio (though server sends JSON currently)
        if (isBinary) {
            console.log(`🔊 Received BINARY audio chunk: ${data.length} bytes`);
            audioData.push(data);
            return;
        }

        // It's a text message - parse as JSON
        const text = data.toString();
        const message = JSON.parse(text);

        // Log message type (except too frequent audio chunks)
        if (message.type !== 'audio_chunk') {
            console.log('📥 Received:', message.type, message.status || '');
        }

        if (message.type === 'status' && message.status === 'ready') {
            console.log('✅ Server is ready. Sending Arabic Audio...');

            // Read test_16k.pcm (Generated Raw 16kHz Mono 16-bit LE)
            try {
                const fs = require('fs');
                const pcmBuffer = fs.readFileSync(path.join(__dirname, '../assets/test_16k.pcm'));
                console.log(`📄 Read test_16k.pcm: ${pcmBuffer.length} bytes`);

                // No header to skip for raw PCM
                const pcmData = pcmBuffer;

                // Send in chunks
                const CHUNK_SIZE = 3200; // 100ms at 16kHz
                let offset = 0;

                const sendChunk = () => {
                    if (offset >= pcmData.length) {
                        console.log('✅ Audio sent complete.');
                        ws.send(JSON.stringify({ type: 'audio_complete' }));
                        return;
                    }

                    const chunk = pcmData.subarray(offset, offset + CHUNK_SIZE);
                    const base64Audio = chunk.toString('base64');

                    ws.send(JSON.stringify({
                        realtime_input: {
                            media_chunks: [{
                                mime_type: "audio/pcm",
                                data: base64Audio
                            }]
                        }
                    }));

                    offset += CHUNK_SIZE;
                    setTimeout(sendChunk, 50); // Simulate real-time
                };

                sendChunk();

                /*
                // Send greeting as text (for model context)
                const textMessage = {
                    client_content: {
                        turns: [{
                            role: "user",
                            parts: [{ text: "مرحباً، عرف عن نفسك" }]
                        }],
                        turn_complete: true
                    }
                };
                
                console.log('📤 Sending text greeting...');
                ws.send(JSON.stringify(textMessage)); 
                */

                // Send plain text for REST fallback (WebSocket handler needs to be updated to accept this or wrapper)
                // The current server logic expects the specific JSON structure.
                // Let's modify reproduction script to send the structure server expects for TEXT.

                const textEvent = {
                    client_content: {
                        turns: [{ role: "user", parts: [{ text: "مرحباً، من أنت؟" }] }],
                        turn_complete: true
                    }
                };
                // Wait a bit then send text
                setTimeout(() => {
                    console.log('📤 Sending text greeting for REST fallback...');
                    ws.send(JSON.stringify(textEvent));
                }, 1000);

            } catch (e) {
                console.error("Failed to read test_16k.pcm:", e);
            }
        }

        if (message.type === 'audio_chunk') {
            // Decode base64 audio
            if (message.audio) {
                const chunk = Buffer.from(message.audio, 'base64');
                console.log(`🔊 Received audio chunk: ${chunk.length} bytes`);
                audioData.push(chunk);
            }
        }

        if (message.type === 'error') {
            console.error('❌ Server Error:', message.message);
        }

    } catch (error) {
        console.error('❌ Error processing message:', error);
    }
});

ws.on('close', () => {
    console.log('🔌 Disconnected');

    if (audioData.length > 0) {
        const finalBuffer = Buffer.concat(audioData);
        fs.writeFileSync(OUTPUT_FILE, finalBuffer);
        console.log(`💾 Saved ${finalBuffer.length} bytes of audio to ${OUTPUT_FILE}`);
        console.log('👉 Use a PCM player (24kHz, 1 channel, 16-bit) to play it.');
    } else {
        console.log('⚠️ No audio received.');
    }
});

ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
});

// Stop after 20 seconds
setTimeout(() => {
    console.log('⏱️ Timeout. Closing connection...');
    ws.close();
}, 20000);
