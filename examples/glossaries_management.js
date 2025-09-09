const { Credentials, Translator } = require("lara-sdk");
const fs = require("fs");
const path = require("path");

/**
 * Complete glossary management examples for the Lara Node.js SDK
 * 
 * This example demonstrates:
 * - Create, list, update, delete glossaries
 * - CSV import with status monitoring
 * - Glossary export
 * - Glossary terms count
 * - Import status checking
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
    
    console.log("🗒️  Glossaries require a specific subscription plan.");
    console.log("   If you encounter errors, please check your subscription level.\n");
    
    let glossaryId = null;

    try {
        // Example 1: Basic glossary management
        console.log("=== Basic Glossary Management ===");
        const glossary = await lara.glossaries.create("MyDemoGlossary");
        console.log(`✅ Created glossary: ${glossary.name} (ID: ${glossary.id})`);
        glossaryId = glossary.id;
        
        // List all glossaries
        const glossaries = await lara.glossaries.list();
        console.log(`📝 Total glossaries: ${glossaries.length}`);
        console.log();

        // Example 2: Glossary operations
        console.log("=== Glossary Operations ===");
        // Get glossary details
        const retrievedGlossary = await lara.glossaries.get(glossaryId);
        if (retrievedGlossary) {
            console.log(`📖 Glossary: ${retrievedGlossary.name} (Owner: ${retrievedGlossary.ownerId})`);
        }
        
        // Get glossary terms count
        const counts = await lara.glossaries.counts(glossaryId);
        if (counts.unidirectional) {
            for (const [lang, count] of Object.entries(counts.unidirectional)) {
                console.log(`   ${lang}: ${count} entries`);
            }
        }
        
        // Update glossary
        const updatedGlossary = await lara.glossaries.update(glossaryId, "UpdatedDemoGlossary");
        console.log(`📝 Updated name: '${glossary.name}' -> '${updatedGlossary.name}'`);

        // Example 3: CSV import functionality
        console.log("=== CSV Import Functionality ===");
        
        // Replace with your actual CSV file path
        const csvFilePath = path.join(__dirname, "sample_glossary.csv");  // Create this file with your glossary data
        
        if (fs.existsSync(csvFilePath)) {
            console.log(`Importing CSV file: ${path.basename(csvFilePath)}`);
            const csvImport = await lara.glossaries.importCsv(glossaryId, csvFilePath);
            console.log(`Import started with ID: ${csvImport.id}`);
            console.log(`Initial progress: ${Math.round(csvImport.progress * 100)}%`);
            
            // Check import status manually
            console.log("Checking import status...");
            const importStatus = await lara.glossaries.getImportStatus(csvImport.id);
            console.log(`Current progress: ${Math.round(importStatus.progress * 100)}%`);
            
            // Wait for import to complete
            try {
                const completedImport = await lara.glossaries.waitForImport(csvImport, 10);
                console.log("✅ Import completed!");
                console.log(`Final progress: ${Math.round(completedImport.progress * 100)}%`);
            } catch (error) {
                console.log("Import timeout: The import process took too long to complete.");
            }
            console.log();
        } else {
            console.log(`CSV file not found: ${csvFilePath}`);
        }

        // Example 4: Export functionality
        console.log("=== Export Functionality ===");
        try {
            // Export as CSV table unidirectional format
            console.log("📤 Exporting as CSV table unidirectional...");
            const csvUniData = await lara.glossaries.export(glossaryId, "csv/table-uni", "en-US");
            console.log(`✅ CSV unidirectional export successful (${csvUniData.length} bytes)`);
            
            // Save sample exports to files - replace with your desired output paths
            const exportFilePath = path.join(__dirname, "exported_glossary.csv");  // Replace with actual path
            fs.writeFileSync(exportFilePath, csvUniData);
            console.log(`💾 Sample export saved to: ${path.basename(exportFilePath)}`);
            console.log();
        } catch (error) {
            console.log(`Error with export: ${error.message}\n`);
        }

        // Example 5: Glossary Terms Count
        console.log("=== Glossary Terms Count ===");
        try {
            // Get detailed counts
            const detailedCounts = await lara.glossaries.counts(glossaryId);
            
            console.log("📊 Detailed glossary terms count:");

            if (detailedCounts.unidirectional) {
                console.log("   Unidirectional entries by language pair:");
                for (const [langPair, count] of Object.entries(detailedCounts.unidirectional)) {
                    console.log(`     ${langPair}: ${count} terms`);
                }
            } else {
                console.log("   No unidirectional entries found");
            }
            
            let totalEntries = 0;
            if (detailedCounts.unidirectional) {
                totalEntries += Object.values(detailedCounts.unidirectional).reduce((sum, count) => sum + count, 0);
            }
            console.log(`   Total entries: ${totalEntries}`);
            console.log();
        } catch (error) {
            console.log(`Error getting glossary terms count: ${error.message}\n`);
        }

    } catch (error) {
        console.log(`Error creating glossary: ${error.message}\n`);
        return;
    } finally {
        // Cleanup
        console.log("=== Cleanup ===");
        if (glossaryId) {
            try {
                const deletedGlossary = await lara.glossaries.delete(glossaryId);
                console.log(`🗑️  Deleted glossary: ${deletedGlossary.name}`);
                
                // Clean up export files - replace with actual cleanup if needed
                const exportFilePath = path.join(__dirname, "exported_glossary.csv");
                if (fs.existsSync(exportFilePath)) {
                    fs.unlinkSync(exportFilePath);
                    console.log("🗑️  Cleaned up export file");
                }
            } catch (error) {
                console.log(`Error deleting glossary: ${error.message}`);
            }
        }
    }

    console.log("\n🎉 Glossary management examples completed!");
}

main().catch(console.error); 