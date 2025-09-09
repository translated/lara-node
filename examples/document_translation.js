const { Credentials, Translator } = require("lara-sdk");
const fs = require("fs");
const path = require("path");

/**
 * Complete document translation examples for the Lara Node.js SDK
 * 
 * This example demonstrates:
 * - Basic document translation
 * - Advanced options with memories and glossaries
 * - Step-by-step document translation with status monitoring
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

    // Replace with your actual document file path
    const sampleFilePath = path.join(__dirname, "sample_document.docx");  // Create this file with your content
    
    if (!fs.existsSync(sampleFilePath)) {
        console.log(`Please create a sample document file at: ${sampleFilePath}`);
        console.log("Add some sample text content to translate.\n");
        return;
    }

    // Example 1: Basic document translation
    console.log("=== Basic Document Translation ===");
    const sourceLang = "en-US";
    const targetLang = "de-DE";
    
    console.log(`Translating document: ${path.basename(sampleFilePath)} from ${sourceLang} to ${targetLang}`);
    
    try {
        const fileStream = fs.createReadStream(sampleFilePath);
        const translatedContent = await lara.documents.translate(fileStream, path.basename(sampleFilePath), sourceLang, targetLang);
        
        // Save translated document - replace with your desired output path
        const outputPath = path.join(__dirname, "sample_document_translated.docx");
        fs.writeFileSync(outputPath, translatedContent);
        
        console.log("✅ Document translation completed");
        console.log(`📄 Translated file saved to: ${path.basename(outputPath)}\n`);
    } catch (error) {
        console.log(`Error translating document: ${error.message}\n`);
        return;
    }

    // Example 2: Document translation with advanced options
    console.log("=== Document Translation with Advanced Options ===");
    try {
        
        const fileStream2 = fs.createReadStream(sampleFilePath);
        const translatedContent2 = await lara.documents.translate(
            fileStream2,
            path.basename(sampleFilePath),
            sourceLang,
            targetLang,
            {
                adaptTo: ["mem_1A2b3C4d5E6f7G8h9I0jKl"],  // Replace with actual memory IDs
                glossaries: ["gls_1A2b3C4d5E6f7G8h9I0jKl"]  // Replace with actual glossary IDs
            }
        );
        
        // Save translated document - replace with your desired output path
        const outputPath2 = path.join(__dirname, "advanced_document_translated.docx");
        fs.writeFileSync(outputPath2, translatedContent2);
        
        console.log("✅ Advanced document translation completed");
        console.log(`📄 Translated file saved to: ${path.basename(outputPath2)}`);
    } catch (error) {
        console.log(`Error in advanced translation: ${error.message}`);
    }
    console.log();

    // Example 3: Step-by-step document translation
    console.log("=== Step-by-Step Document Translation ===");
    
    try {
        // Upload document
        console.log("Step 1: Uploading document...");
        const fileStream3 = fs.createReadStream(sampleFilePath);
        const document = await lara.documents.upload(
            fileStream3,
            path.basename(sampleFilePath),
            sourceLang,
            targetLang,
            {
                adaptTo: ["mem_1A2b3C4d5E6f7G8h9I0jKl"],  // Replace with actual memory IDs
                glossaries: ["gls_1A2b3C4d5E6f7G8h9I0jKl"]  // Replace with actual glossary IDs
            }
        );
        console.log(`Document uploaded with ID: ${document.id}`);
        console.log(`Initial status: ${document.status}`);
        
        // Check status
        console.log("\nStep 2: Checking status...");
        const updatedDocument = await lara.documents.status(document.id);
        console.log(`Current status: ${updatedDocument.status}`);
        
        // Download translated document
        console.log("\nStep 3: Downloading would happen after translation completes...");
        const downloadedContent = await lara.documents.download(document.id);
        console.log("✅ Step-by-step translation completed");
    } catch (error) {
        console.log(`Error in step-by-step process: ${error.message}`);
    }
}

main().catch(console.error); 