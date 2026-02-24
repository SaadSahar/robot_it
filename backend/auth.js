/**
 * Google Cloud Authentication Manager (Re-created)
 * Handles authentication for Gemini Live API using Service Account credentials
 */

const { GoogleAuth } = require('google-auth-library');
const path = require('path');
const fs = require('fs');

console.log("🔥 BRAND NEW AUTH.JS LOADING...");

/**
 * Get access token for Gemini Live API
 * Uses Google Application Default Credentials (ADC)
 * 
 * @returns {Promise<string>} Access token
 */
async function getAccessToken() {
    console.log("🔑 getAccessToken() called");

    // Check for environment variable
    let envCredentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    // Default paths
    const defaultCredentialsPath = path.join(__dirname, '..', 'credentials', 'service-account-key.json');
    const rootCredentialsPath = path.join(__dirname, '..', 'ser_api.json');

    let credentialsPath = envCredentialsPath;

    // PATH CORRECTION LOGIC
    if (envCredentialsPath) {
        if (!fs.existsSync(envCredentialsPath)) {
            console.warn(`⚠️ [AUTH] Env var points to missing file: ${envCredentialsPath}`);
            // Try fallback
            if (fs.existsSync(rootCredentialsPath)) {
                console.log(`✓ [AUTH] Falling back to: ${rootCredentialsPath}`);
                credentialsPath = rootCredentialsPath;
                process.env.GOOGLE_APPLICATION_CREDENTIALS = rootCredentialsPath;
            } else {
                console.error(`❌ [AUTH] Fallback file also missing at: ${rootCredentialsPath}`);
            }
        }
    } else {
        // No env var
        if (fs.existsSync(rootCredentialsPath)) {
            console.log(`✓ [AUTH] Found credentials in root: ${rootCredentialsPath}`);
            credentialsPath = rootCredentialsPath;
            process.env.GOOGLE_APPLICATION_CREDENTIALS = rootCredentialsPath;
        } else if (fs.existsSync(defaultCredentialsPath)) {
            console.log(`✓ [AUTH] Found credentials in default path: ${defaultCredentialsPath}`);
            credentialsPath = defaultCredentialsPath;
            process.env.GOOGLE_APPLICATION_CREDENTIALS = defaultCredentialsPath;
        }
    }

    try {
        console.log(`Attempting auth with GOOGLE_APPLICATION_CREDENTIALS=${process.env.GOOGLE_APPLICATION_CREDENTIALS}`);
        const auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });

        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();
        const accessToken = tokenResponse.token || tokenResponse;

        console.log('✓ [AUTH] Access token obtained successfully');
        return accessToken;
    } catch (error) {
        console.error('✗ [AUTH] Failed to get access token:', error.message);
        throw error;
    }
}

async function getProjectId() {
    if (process.env.GOOGLE_CLOUD_PROJECT_ID) {
        return process.env.GOOGLE_CLOUD_PROJECT_ID;
    }
    // Minimal fallback
    return 'unknown-project-id';
}

async function validateAuthConfig() {
    try {
        await getAccessToken();
        return { valid: true, errors: [], warnings: [] };
    } catch (e) {
        return { valid: false, errors: [e.message], warnings: [] };
    }
}

module.exports = {
    getAccessToken,
    getProjectId,
    validateAuthConfig
};
