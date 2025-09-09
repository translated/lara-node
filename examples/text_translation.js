const { Credentials, Translator } = require('@translated/lara');

/**
 * Complete text translation examples for the Lara Node.js SDK
 * 
 * This example demonstrates:
 * - Single string translation
 * - Multiple strings translation
 * - Translation with instructions
 * - TextBlocks translation (mixed translatable/non-translatable content)
 * - Auto-detect source language
 * - Advanced translation options
 * - Get available languages
 */

async function main() {
    // All examples use environment variables for credentials, so set them first:
    // export LARA_ACCESS_KEY_ID="your-access-key-id"
    // export LARA_ACCESS_KEY_SECRET="your-access-key-secret"

    // Set your credentials here
    const accessKeyId = process.env.LARA_ACCESS_KEY_ID;
    const accessKeySecret = process.env.LARA_ACCESS_KEY_SECRET;

    const credentials = new Credentials(accessKeyId, accessKeySecret);
    const lara = new Translator(credentials);
    
    try {
        // Example 1: Basic single string translation
        console.log("=== Basic Single String Translation ===");
        const result1 = await lara.translate("Hello, world!", "en-US", "fr-FR");
        console.log("Original: Hello, world!");
        console.log("French: " + result1.translation + "\n");

        // Example 2: Multiple strings translation
        console.log("=== Multiple Strings Translation ===");
        const texts = ["Hello", "How are you?", "Goodbye"];
        const result2 = await lara.translate(texts, "en-US", "es-ES");
        console.log("Original: [" + texts.join(", ") + "]");
        console.log("Spanish: [" + result2.translation.join(", ") + "]\n");

        // Example 3: TextBlocks translation (mixed translatable/non-translatable content)
        console.log("=== TextBlocks Translation ===");
        const textBlocks = [
            { text: "Adventure novels, mysteries, cookbooks—wait, who packed those?", translatable: true },
            { text: "<br>", translatable: false },  // Non-translatable HTML
            { text: "Suddenly, it doesn't feel so deserted after all.", translatable: true },
            { text: "<div class=\"separator\"></div>", translatable: false },  // Non-translatable HTML
            { text: "Every page you turn is a new journey, and the best part?", translatable: true }
        ];
        
        const result3 = await lara.translate(textBlocks, "en-US", "it-IT");
        console.log("Original TextBlocks: " + textBlocks.length + " blocks");
        console.log("Translated blocks: " + result3.translation.length);
        result3.translation.forEach((translation, i) => {
            console.log("Block " + (i + 1) + ": " + translation.text);
        });

        // Example 4: Translation with instructions
        console.log("=== Translation with Instructions ===");
        const options1 = {
            instructions: ["Be formal", "Use technical terminology"]
        };
        
        const result4 = await lara.translate("Could you send me the report by tomorrow morning?", "en-US", "de-DE", options1);
        console.log("Original: Could you send me the report by tomorrow morning?");
        console.log("German (formal): " + result4.translation + "\n");

        // Example 5: Auto-detecting source language
        console.log("=== Auto-detect Source Language ===");
        const result5 = await lara.translate("Bonjour le monde!", null, "en-US");
        console.log("Original: Bonjour le monde!");
        console.log("Detected source: " + result5.sourceLanguage);
        console.log("English: " + result5.translation + "\n");

        // Example 6: Advanced options with comprehensive settings
        console.log("=== Translation with Advanced Options ===");
        const options2 = {
            adaptTo: ["mem_1A2b3C4d5E6f7G8h9I0jKl", "mem_2XyZ9AbC8dEf7GhI6jKlMn"], // Replace with actual memory IDs
            glossaries: ["gls_1A2b3C4d5E6f7G8h9I0jKl", "gls_2XyZ9AbC8dEf7GhI6jKlMn"], // Replace with actual glossary IDs
            instructions: ["Be professional"],
            style: "fluid",
            contentType: "text/plain",
            timeoutInMillis: 10000,
        };
        
        const result6 = await lara.translate("This is a comprehensive translation example", "en-US", "it-IT", options2);
        console.log("Original: This is a comprehensive translation example");
        console.log("Italian (with all options): " + result6.translation + "\n");

        // Example 7: Get available languages
        console.log("=== Available Languages ===");
        const languages = await lara.getLanguages();
        console.log("Supported languages: [" + languages +"]");

    } catch (error) {
        console.error("Error:", error.message);
    }
}

main(); 