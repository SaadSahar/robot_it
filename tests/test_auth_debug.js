
const { getAccessToken, getProjectId, validateAuthConfig } = require('./backend/auth');
const path = require('path');
const fs = require('fs');

async function testAuth() {
    console.log("Testing Authentication...");
    console.log("Current Directory:", process.cwd());
    const envPath = path.resolve(process.cwd(), '.env');
    console.log(".env path:", envPath);

    if (fs.existsSync(envPath)) {
        require('dotenv').config({ path: envPath });
        console.log("Loaded .env file");
        console.log("GOOGLE_APPLICATION_CREDENTIALS:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
    } else {
        console.error("No .env file found!");
    }

    try {
        console.log("Validating Auth Config...");
        const validation = await validateAuthConfig();
        console.log("Validation Result:", validation);

        if (validation.valid) {
            console.log("Attempting to get Access Token...");
            const token = await getAccessToken();
            console.log("Token obtained successfully (first 10 chars):", token.substring(0, 10) + "...");

            const projectId = await getProjectId();
            console.log("Project ID:", projectId);
        } else {
            console.error("Auth validation failed:", validation.errors);
        }

    } catch (error) {
        console.error("Auth Test Failed:", error);
    }
}

testAuth();
