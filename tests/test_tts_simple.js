const { textToSpeech } = require('./backend/tts-edge-handler');
const fs = require('fs');

async function test() {
    console.log("Testing TTS...");
    try {
        const result = await textToSpeech("مرحباً بك في نظام المساعدة الصوتية", "ar-SA-ZariNeural");
        console.log("TTS Success:", result.filePath);
    } catch (e) {
        console.error("TTS Failed:", e);
    }
}

test();
