const path = require('path');
const fs = require('fs');

// Parameters
const SAMPLE_RATE = 16000;
const DURATION_SEC = 2;
const FREQUENCY = 440; // A4 tone
const AMPLITUDE = 16000; // ~50% volume (max 32767)

const numSamples = SAMPLE_RATE * DURATION_SEC;
const buffer = Buffer.alloc(numSamples * 2); // 16-bit = 2 bytes per sample

for (let i = 0; i < numSamples; i++) {
    // Generate sine wave
    const sample = Math.sin(2 * Math.PI * FREQUENCY * i / SAMPLE_RATE) * AMPLITUDE;
    // Write as 16-bit Little Endian
    buffer.writeInt16LE(Math.floor(sample), i * 2);
}

const outputPath = path.join(__dirname, '../assets/test_16k.pcm');
fs.writeFileSync(outputPath, buffer);
console.log(`Generated ${outputPath}: ${buffer.length} bytes`);
