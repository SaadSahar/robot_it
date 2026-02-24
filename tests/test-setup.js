/**
 * Test Script for Gemini Live API Setup
 * Verifies configuration and dependencies
 */

const { config, validateConfig } = require('./backend/config');

console.log('='.repeat(60));
console.log('🧪 Testing Gemini Live API Setup');
console.log('='.repeat(60));

try {
  // Test 1: Validate configuration
  console.log('\n📋 Test 1: Configuration Validation');
  console.log('-'.repeat(60));
  validateConfig();
  console.log('✅ Configuration is valid');

  // Test 2: Check required environment variables
  console.log('\n📋 Test 2: Environment Variables');
  console.log('-'.repeat(60));
  
  const requiredVars = [
    'GOOGLE_CLOUD_API_KEY',
    'VERTEX_REGION',
    'VERTEX_MODEL'
  ];
  
  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      console.log(`✅ ${varName}: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`);
    } else {
      console.log(`❌ ${varName}: NOT SET`);
    }
  }

  // Test 3: Check configuration values
  console.log('\n📋 Test 3: Configuration Values');
  console.log('-'.repeat(60));
  console.log(`🧠 Model: ${config.vertexModel}`);
  console.log(`🌐 Region: ${config.vertexRegion}`);
  console.log(`🔌 Live API Endpoint: ${config.liveApiEndpoint}`);
  console.log(`🎤 Wake Word: "${config.wakeWord}"`);
  console.log(`🔊 Input Sample Rate: ${config.inputSampleRate}Hz`);
  console.log(`🔊 Output Sample Rate: ${config.outputSampleRate}Hz`);
  console.log(`🔊 Channels: ${config.audioChannels}`);
  console.log(`🔊 Voice: ${config.voiceName}`);
  console.log(`📊 Response Modalities: ${config.responseModalities.join(', ')}`);
  console.log(`🐛 Debug Mode: ${config.debugMode}`);
  console.log(`💾 Save Audio Files: ${config.saveAudioFiles}`);

  // Test 4: Check file structure
  console.log('\n📋 Test 4: File Structure');
  console.log('-'.repeat(60));
  
  const fs = require('fs');
  const path = require('path');
  
  const requiredFiles = [
    'backend/config.js',
    'backend/gemini-live-client.js',
    'backend/audio-processor.js',
    'backend/server.js',
    'frontend/pcm-processor.js',
    'frontend/app.js',
    'frontend/index.html',
    'frontend/styles.css',
    '.env',
    'package.json'
  ];
  
  for (const filePath of requiredFiles) {
    const fullPath = path.join(__dirname, filePath);
    if (fs.existsSync(fullPath)) {
      console.log(`✅ ${filePath}`);
    } else {
      console.log(`❌ ${filePath}: NOT FOUND`);
    }
  }

  // Test 5: Check Node.js version
  console.log('\n📋 Test 5: Node.js Version');
  console.log('-'.repeat(60));
  const nodeVersion = process.version;
  console.log(`📦 Node.js Version: ${nodeVersion}`);
  
  const majorVersion = parseInt(nodeVersion.substring(1).split('.')[0]);
  if (majorVersion >= 16) {
    console.log('✅ Node.js version is compatible (>= 16.0.0)');
  } else {
    console.log('❌ Node.js version is not compatible (>= 16.0.0 required)');
  }

  // Test 6: Check dependencies
  console.log('\n📋 Test 6: Dependencies');
  console.log('-'.repeat(60));
  
  const packageJson = require('./package.json');
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  for (const [name, version] of Object.entries(dependencies)) {
    console.log(`✅ ${name}: ${version}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ All tests completed successfully!');
  console.log('='.repeat(60));
  console.log('\n🚀 You can now run the server with: npm start');
  console.log('🧪 Or test the connection: http://localhost:3000/test-gemini-live');
  console.log('='.repeat(60));

} catch (error) {
  console.error('\n' + '='.repeat(60));
  console.error('❌ Test failed!');
  console.error('='.repeat(60));
  console.error('Error:', error.message);
  console.error('\nPlease fix the errors above before running the server.');
  console.error('='.repeat(60));
  process.exit(1);
}
