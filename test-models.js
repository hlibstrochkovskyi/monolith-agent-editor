require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');

const key = process.env.ANTHROPIC_API_KEY;
console.log("Checking key:", key ? key.substring(0, 15) + "..." : "MISSING");

console.log("Initializing Anthropic client...");
const anthropic = new Anthropic({ apiKey: key });

async function main() {
    try {
        // 1. Try to list models (if supported by this SDK version/endpoint)
        // Note: models.list() might not be standard in all SDK versions, but let's try.
        // If it fails, we will try a simple completion with a known older model.
        console.log("Attempting to list models...");
        // The SDK might not expose list() easily, let's try a direct request if needed, 
        // but first let's try a simple message to a "very safe" model ID: claude-3-opus-20240229

        const knownModels = [
            'claude-3-5-sonnet-20241022', // Newest
            'claude-3-5-sonnet-20240620', // Previous (failing?)
            'claude-3-5-sonnet-latest',   // Alias
            'claude-3-opus-20240229',      // Opus
            'claude-3-sonnet-20240229',    // Old Sonnet
            'claude-3-haiku-20240307'      // Haiku
        ];

        for (const model of knownModels) {
            console.log(`\nTesting model ID: ${model}...`);
            try {
                const msg = await anthropic.messages.create({
                    model: model,
                    max_tokens: 10,
                    messages: [{ role: 'user', content: 'Hello' }],
                });
                console.log(`SUCCESS: ${model} is available!`);
            } catch (e) {
                console.log(`FAILED: ${model} - ${e.status} ${e.error ? e.error.message : e.message}`);
            }
        }

    } catch (error) {
        console.error("Critical Error:", error);
    }
}

main();
