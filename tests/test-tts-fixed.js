/**
 * 🧪 Simple TTS Test Script
 * 
 * This script tests the fixed TTS handler with Arabic text
 */

const fs = require('fs');
const path = require('path');
const { textToSpeech } = require('./backend/tts-handler-fixed');

// Test text (Arabic)
const TEST_TEXT = `بايثون هي لغة برمجة عالية المستوى، سهلة التعلم وقوية. تستخدم في تطوير الويب، تحليل البيانات، الذكاء الاصطناعي، وغيرها. تتميز ببساطة تركيبها وقراءتها الجيدة.`;

// Output file
const OUTPUT_FILE = path.join(__dirname, 'response_audio_fixed.mp3');

async function main() {
    console.log('='.repeat(70));
    console.log('🧪 Testing Fixed TTS Handler');
    console.log('='.repeat(70));
    console.log('');
    
    try {
        console.log('📝 Test Text:');
        console.log(TEST_TEXT);
        console.log('');
        console.log('📁 Output File: ' + OUTPUT_FILE);
        console.log('');
        
        // Convert text to speech
        const audioBuffer = await textToSpeech(TEST_TEXT);
        
        // Save to file
        fs.writeFileSync(OUTPUT_FILE, audioBuffer);
        
        console.log('');
        console.log('='.repeat(70));
        console.log('✅ TEST COMPLETED SUCCESSFULLY!');
        console.log('='.repeat(70));
        console.log(`🔊 Audio saved: ${OUTPUT_FILE}`);
        console.log(`📊 File size: ${audioBuffer.length} bytes`);
        console.log('');
        console.log('💡 Play the file to hear the Arabic pronunciation!');
        console.log('='.repeat(70));
        
    } catch (error) {
        console.log('');
        console.log('='.repeat(70));
        console.error('❌ TEST FAILED!');
        console.log('='.repeat(70));
        console.error(`Error: ${error.message}`);
        console.error('');
        console.error('💡 Troubleshooting:');
        console.error('   1. Make sure GOOGLE_APPLICATION_CREDENTIALS is set in .env');
        console.error('   2. Make sure the service account has TTS permissions');
        console.error('   3. Make sure Say.js is installed (npm install say)');
        console.error('   4. Make sure your system has Arabic voices installed');
        console.log('='.repeat(70));
        
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    main().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { main };
