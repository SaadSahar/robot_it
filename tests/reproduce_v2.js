
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = 3004;
const URL = `ws://localhost:${PORT}`;

console.log(`Connecting to ${URL}...`);
const ws = new WebSocket(URL);

ws.on('open', () => {
    console.log('✅ Connected');
    // Keep connection alive
    setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
        }
    }, 5000);
});

ws.on('message', (data, isBinary) => {
    if (isBinary) {
        console.log(`🔊 Received AUDIO chunk: ${data.length} bytes`);
        return;
    }

    try {
        const msg = JSON.parse(data.toString());
        console.log('nb received:', msg);

        if (msg.status === 'ready') {
            console.log('🎯 System READY. Sending Audio...');
            sendAudio();
        }
    } catch (e) {
        console.log('RAW:', data.toString());
    }
});

ws.on('close', (code, reason) => {
    console.log(`❌ Disconnected: ${code} ${reason}`);
});

ws.on('error', (err) => {
    console.error('❌ Error:', err.message);
});

function sendAudio() {
    try {
        const audioPath = path.join(__dirname, '..', 'assets', 'test_16k.pcm');
        if (!fs.existsSync(audioPath)) {
            console.error("Audio file not found:", audioPath);
            return;
        }

        const pcmData = fs.readFileSync(audioPath);
        console.log(`Sending ${pcmData.length} bytes of audio...`);

        ws.send(JSON.stringify({
            realtime_input: {
                media_chunks: [{
                    mime_type: "audio/pcm",
                    data: pcmData.toString('base64')
                }]
            }
        }));

        console.log('Audio sent.');

        // Send end of turn manually if needed, or just specific text
        setTimeout(() => {
            console.log("Sending text query...");
            ws.send(JSON.stringify({
                client_content: {
                    turns: [{ role: "user", parts: [{ text: "Hello Gemini" }] }],
                    turn_complete: true
                }
            }));
        }, 2000);

    } catch (e) {
        console.error("Error sending audio:", e);
    }
}
