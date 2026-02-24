/**
 * Test script to trigger authentication and see diagnostic output
 */

const { getAccessToken, getProjectId, validateAuthConfig } = require('./backend/auth');

async function testAuth() {
    console.log('========================================');
    console.log('🧪 Testing Authentication');
    console.log('========================================\n');

    // Test 1: Validate auth config
    console.log('Test 1: Validating auth configuration...');
    try {
        const validation = await validateAuthConfig();
        console.log('Result:', validation);
    } catch (error) {
        console.error('Error:', error.message);
    }

    console.log('\n----------------------------------------\n');

    // Test 2: Get access token
    console.log('Test 2: Getting access token...');
    try {
        const token = await getAccessToken();
        console.log('✓ Success! Token obtained');
        console.log('Token (first 50 chars):', token.substring(0, 50) + '...');
    } catch (error) {
        console.error('✗ Error:', error.message);
    }

    console.log('\n----------------------------------------\n');

    // Test 3: Get project ID
    console.log('Test 3: Getting project ID...');
    try {
        const projectId = await getProjectId();
        console.log('✓ Success! Project ID:', projectId);
    } catch (error) {
        console.error('✗ Error:', error.message);
    }

    console.log('\n========================================');
    console.log('🧪 Test Complete');
    console.log('========================================');
}

testAuth().catch(console.error);
