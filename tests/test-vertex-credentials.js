/**
 * Vertex AI Credentials Test Script
 * 
 * This script tests if the Vertex AI credentials are valid and working
 * by making a simple text generation request.
 */

const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');

// Configuration
const CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || './ser_api.json';
const PROJECT_ID = 'refined-circuit-480414-c1';
const LOCATION = 'us-central1';
const MODEL = 'gemini-2.0-flash-exp'; // Using a standard text model for testing

async function testVertexAICredentials() {
    console.log('============================================================');
    console.log('🔑 Vertex AI Credentials Test');
    console.log('============================================================\n');

    try {
        // Step 1: Check credentials file
        console.log('📁 Step 1: Checking credentials file...');
        console.log(`   Path: ${CREDENTIALS_PATH}`);
        
        const fs = require('fs');
        if (!fs.existsSync(CREDENTIALS_PATH)) {
            throw new Error(`❌ Credentials file not found: ${CREDENTIALS_PATH}`);
        }
        
        const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
        console.log(`   ✅ File exists`);
        console.log(`   📧 Service Account: ${credentials.client_email}`);
        console.log(`   🔑 Project ID: ${credentials.project_id}\n`);

        // Step 2: Authenticate and get access token
        console.log('🔐 Step 2: Authenticating with Google...');
        const auth = new GoogleAuth({
            keyFilename: CREDENTIALS_PATH,
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });

        const client = await auth.getClient();
        const accessTokenResponse = await client.getAccessToken();
        const accessToken = accessTokenResponse.token;
        console.log(`   ✅ Authentication successful`);
        console.log(`   🔑 Access token obtained (length: ${accessToken ? accessToken.length : 0} chars)\n`);

        // Step 3: Make a simple API request
        console.log('🌐 Step 3: Testing Vertex AI API...');
        console.log(`   📍 Location: ${LOCATION}`);
        console.log(`   🤖 Model: ${MODEL}`);
        console.log(`   📝 Test prompt: "مرحبا" (Hello in Arabic)\n`);

        const apiUrl = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:generateContent`;

        const requestBody = {
            contents: [{
                role: 'user',
                parts: [{ text: 'مرحبا' }]
            }],
            generationConfig: {
                maxOutputTokens: 100,
                temperature: 0.7
            }
        };

        console.log('   📤 Sending request...');
        const response = await axios.post(apiUrl, requestBody, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        // Step 4: Display results
        console.log('   ✅ Request successful!\n');
        console.log('============================================================');
        console.log('📊 Response:');
        console.log('============================================================');
        
        if (response.data && response.data.candidates) {
            const candidate = response.data.candidates[0];
            const text = candidate.content.parts[0].text;
            console.log(`\n🤖 Model Response:\n${text}\n`);
            
            // Check for safety ratings
            if (candidate.safetyRatings) {
                console.log('🛡️  Safety Ratings:');
                candidate.safetyRatings.forEach(rating => {
                    console.log(`   ${rating.category}: ${rating.probability}`);
                });
            }
        }

        console.log('\n============================================================');
        console.log('✅ CREDENTIALS TEST PASSED');
        console.log('============================================================');
        console.log('\n✨ Your Vertex AI credentials are working correctly!');
        console.log('📝 Summary:');
        console.log('   ✅ Credentials file is valid');
        console.log('   ✅ Authentication successful');
        console.log('   ✅ API access granted');
        console.log('   ✅ Model can generate responses');
        console.log('\n🚀 You can now use the voice chatbot!\n');

    } catch (error) {
        console.log('\n============================================================');
        console.log('❌ CREDENTIALS TEST FAILED');
        console.log('============================================================\n');
        
        if (error.response) {
            console.log('📋 Error Details:');
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Status Text: ${error.response.statusText}`);
            console.log(`   Message: ${JSON.stringify(error.response.data, null, 2)}`);
        } else if (error.code === 'ENOENT') {
            console.log(`❌ Error: Credentials file not found`);
            console.log(`   Expected path: ${CREDENTIALS_PATH}`);
        } else {
            console.log(`❌ Error: ${error.message}`);
        }
        
        console.log('\n🔧 Troubleshooting:');
        console.log('   1. Verify the credentials file path is correct');
        console.log('   2. Check that the service account has "Vertex AI User" role');
        console.log('   3. Ensure Vertex AI API is enabled in your Google Cloud project');
        console.log('   4. Verify billing is enabled for your project\n');
        
        process.exit(1);
    }
}

// Run the test
testVertexAICredentials();
