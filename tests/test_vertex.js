const { VertexAI } = require('@google-cloud/vertexai');
require('dotenv').config();

async function listModels() {
    const project = process.env.GOOGLE_CLOUD_PROJECT_ID || 'refined-circuit-480414-c1';
    const location = process.env.GOOGLE_CLOUD_REGION || 'us-central1';

    console.log(`Checking models for Project: ${project}, Location: ${location}`);

    // Initialize Vertex with your Cloud project and location
    const vertex_ai = new VertexAI({ project: project, location: location });

    // There isn't a direct "listModels" in the lightweight generative client usually, 
    // but we can try to instantiate a model and see if it works.
    // Or we can try to generate content with a known valid model.

    const modelsToTry = [
        "gemini-1.5-flash-001",
        "gemini-1.5-flash",
        "gemini-1.5-pro-001",
        "gemini-1.0-pro-001",
        "gemini-pro"
    ];

    for (const modelName of modelsToTry) {
        console.log(`\nTesting model: ${modelName}`);
        try {
            const model = vertex_ai.getGenerativeModel({ model: modelName });
            const resp = await model.generateContent("Hello");
            console.log(`✅ Success! Response:`, resp.response.candidates[0].content.parts[0].text);
            return; // Found a working model
        } catch (e) {
            console.error(`❌ Failed: ${e.message}`);
        }
    }
}

listModels();
