const axios = require('axios');
const { getAccessToken, getProjectId } = require('./backend/auth');
require('dotenv').config();

async function listModels() {
    try {
        const token = await getAccessToken();
        const projectId = await getProjectId();
        const location = process.env.GOOGLE_CLOUD_REGION || 'us-central1';

        console.log(`Checking models for Project: ${projectId}, Location: ${location}`);

        const url = `https://${location}-aiplatform.googleapis.com/v1beta1/projects/${projectId}/locations/${location}/publishers/google/models`;

        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const models = response.data.models || [];
        console.log(`Found ${models.length} models.`);

        models.forEach(model => {
            if (model.name.includes("gemini")) {
                console.log(`- ${model.name.split('/').pop()} (${model.versionId})`);
            }
        });

    } catch (error) {
        console.error("❌ Error listing models:", error.message);
        if (error.response) {
            console.error("Response data:", JSON.stringify(error.response.data, null, 2));
        }
    }
}

listModels();
