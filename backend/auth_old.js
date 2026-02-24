console.log("🔥 I AM THE NEW AUTH.JS LOADING...");
/**
 * Google Cloud Authentication Manager
 * Handles authentication for Gemini Live API using Service Account credentials
 * 
 * Supports two methods for providing credentials:
 * 1. GOOGLE_APPLICATION_CREDENTIALS environment variable (recommended for production)
 * 2. Default project path: bot_it/credentials/service-account-key.json (automatic fallback)
 */

const { GoogleAuth } = require('google-auth-library');
const path = require('path');
const fs = require('fs');

/**
 * Get access token for Gemini Live API
 * Uses Google Application Default Credentials (ADC)
 * 
 * @returns {Promise<string>} Access token
 */
async function getAccessToken() {
    // Check for environment variable
    let envCredentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

    // Default project path for service account key (standard location)
    const defaultCredentialsPath = path.join(__dirname, '..', 'credentials', 'service-account-key.json');
    // Root location (fallback)
    const rootCredentialsPath = path.join(__dirname, '..', 'ser_api.json');

    // Determine which credentials path to use
    let credentialsPath = envCredentialsPath;
    let usingDefaultPath = false;

    // If environment variable is set but file doesn't exist, try root path
    if (envCredentialsPath && !fs.existsSync(envCredentialsPath)) {
        console.warn(`⚠️ [AUTH] GOOGLE_APPLICATION_CREDENTIALS points to non-existent file: ${envCredentialsPath}`);
        console.log(`ℹ️ [AUTH] Checking for fallback at: ${rootCredentialsPath}`);
        if (fs.existsSync(rootCredentialsPath)) {
            credentialsPath = rootCredentialsPath;
            process.env.GOOGLE_APPLICATION_CREDENTIALS = rootCredentialsPath;
            console.log(`✓ [AUTH] Using fallback credentials: ${rootCredentialsPath}`);
        }
    }

    // If environment variable is not set, try the default project paths
    if (!envCredentialsPath) {
        if (fs.existsSync(defaultCredentialsPath)) {
            credentialsPath = defaultCredentialsPath;
            usingDefaultPath = true;
            process.env.GOOGLE_APPLICATION_CREDENTIALS = defaultCredentialsPath;
            console.log(`✓ [AUTH] Using default credentials path: ${defaultCredentialsPath}`);
        } else if (fs.existsSync(rootCredentialsPath)) {
            credentialsPath = rootCredentialsPath;
            process.env.GOOGLE_APPLICATION_CREDENTIALS = rootCredentialsPath;
            console.log(`✓ [AUTH] Using root credentials path: ${rootCredentialsPath}`);
        } else {
            // Neither env var nor default file exists - provide helpful error
            throw new Error(
                'Google Cloud credentials not found. Please:\n' +
                '1. Create a service account at: https://console.cloud.google.com/iam-admin/serviceaccounts\n' +
                '2. Download the JSON key file\n' +
                '3. Place the file at: bot_it/credentials/service-account-key.json OR bot_it/ser_api.json\n' +
                '   OR set GOOGLE_APPLICATION_CREDENTIALS in .env file\n' +
                '\n' +
                `Checked paths:\n` +
                `- Env: ${envCredentialsPath}\n` +
                `- Default: ${defaultCredentialsPath}\n` +
                `- Root: ${rootCredentialsPath}\n`
            );
        }
    } else if (fs.existsSync(credentialsPath)) {
        console.log(`✓ [AUTH] Using credentials from environment variable: ${credentialsPath}`);
    }

    try {
        // Create GoogleAuth with the credentials
        const auth = new GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });

        const client = await auth.getClient();
        const tokenResponse = await client.getAccessToken();

        // Extract the actual token string from the response
        // getAccessToken() returns an object with token property
        const accessToken = tokenResponse.token || tokenResponse;

        console.log('✓ [AUTH] Access token obtained successfully');
        return accessToken;
    } catch (error) {
        console.error('✗ [AUTH] Failed to get access token:', error.message);

        // Provide helpful error messages
        if (error.message.includes('Could not load the default credentials')) {
            throw new Error(
                'Failed to load Google Cloud credentials.\n' +
                'Please check:\n' +
                `1. The file exists at: ${credentialsPath}\n` +
                '2. The file is a valid JSON service account key\n' +
                '3. The service account has "Vertex AI User" role\n' +
                '\n' +
                'For detailed instructions, see: bot_it/credentials/README.md'
            );
        }

        throw error;
    }
}

/**
 * Get project ID from environment or Google Cloud
 * @returns {Promise<string>} Project ID
 */
async function getProjectId() {
    // First try environment variable
    if (process.env.GOOGLE_CLOUD_PROJECT_ID) {
        return process.env.GOOGLE_CLOUD_PROJECT_ID;
    }

    // Try to get from Google Auth (extracted from service account key)
    try {
        const auth = new GoogleAuth();
        const projectId = await auth.getProjectId();
        return projectId;
    } catch (error) {
        throw new Error(
            'Project ID not found. Please:\n' +
            '1. Set GOOGLE_CLOUD_PROJECT_ID in your .env file\n' +
            '2. Find your Project ID at: https://console.cloud.google.com/projectselector2/home/dashboard\n' +
            '\n' +
            'Example: GOOGLE_CLOUD_PROJECT_ID=my-project-12345'
        );
    }
}

/**
 * Validate authentication configuration
 * @returns {Promise<Object>} Validation result
 */
async function validateAuthConfig() {
    const errors = [];
    const warnings = [];

    // Check for API key (optional, for REST API fallback)
    if (!process.env.GOOGLE_CLOUD_API_KEY) {
        warnings.push('GOOGLE_CLOUD_API_KEY not set (optional for Live API)');
    }

    // Check for project ID
    try {
        const projectId = await getProjectId();
        console.log(`✓ [AUTH] Project ID: ${projectId}`);
    } catch (error) {
        errors.push(error.message);
    }

    // Try to get access token
    try {
        await getAccessToken();
    } catch (error) {
        errors.push(`Access token: ${error.message}`);
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

module.exports = {
    getAccessToken,
    getProjectId,
    validateAuthConfig
};
