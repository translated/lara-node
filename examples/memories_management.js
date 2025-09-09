const { Credentials, Translator } = require("lara-sdk");
const fs = require("fs");
const path = require("path");

/**
 * Complete memory management examples for the Lara Node.js SDK
 * 
 * This example demonstrates:
 * - Create, list, update, delete memories
 * - Add individual translations
 * - Multiple memory operations
 * - TMX file import with progress monitoring
 * - Translation deletion
 * - Translation with TUID and context
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
    
    let memoryId = null;
    let memory2ToDelete = null;

    try {
        // Example 1: Basic memory management
        console.log("=== Basic Memory Management ===");
        const memory = await lara.memories.create("MyDemoMemory");
        console.log(`✅ Created memory: ${memory.name} (ID: ${memory.id})`);
        memoryId = memory.id;

        // Get memory details
        const retrievedMemory = await lara.memories.get(memoryId);
        if (retrievedMemory) {
            console.log(`📖 Memory: ${retrievedMemory.name} (Owner: ${retrievedMemory.ownerId})`);
        }

        // Update memory
        const updatedMemory = await lara.memories.update(memoryId, "UpdatedDemoMemory");
        console.log(`📝 Updated name: '${memory.name}' -> '${updatedMemory.name}'`);
        console.log();

        // List all memories
        const memories = await lara.memories.list();
        console.log(`📝 Total memories: ${memories.length}`);
        console.log();

        // Example 2: Adding translations
        // Important: To update/overwrite a translation unit you must provide a tuid. Calls without a tuid always create a new unit and will not update existing entries.
        console.log("=== Adding Translations ===");
        try {
            // Basic translation addition (with TUID)
            const memImport1 = await lara.memories.addTranslation(memoryId, "en-US", "fr-FR", "Hello", "Bonjour", "greeting_001");
            console.log(`✅ Added: 'Hello' -> 'Bonjour' with TUID 'greeting_001' (Import ID: ${memImport1.id})`);
            
            // Translation with context
            const memImport2 = await lara.memories.addTranslation(
                memoryId, "en-US", "fr-FR", "How are you?", "Comment allez-vous?", "greeting_002",
                "Good morning", "Have a nice day"
            );
            console.log(`✅ Added with context (Import ID: ${memImport2.id})`);
            console.log();
        } catch (error) {
            console.log(`Error adding translations: ${error.message}\n`);
        }

        // Example 3: Multiple memory operations
        console.log("=== Multiple Memory Operations ===");
        try {
            // Create second memory for multi-memory operations
            const memory2 = await lara.memories.create("SecondDemoMemory");
            const memory2Id = memory2.id;
            console.log(`✅ Created second memory: ${memory2.name}`);
            
            // Add translation to multiple memories (with TUID)
            const memoryIds = [memoryId, memory2Id];
            const multiImportJob = await lara.memories.addTranslation(memoryIds, "en-US", "it-IT", "Hello World!", "Ciao Mondo!", "greeting_003");
            console.log(`✅ Added translation to multiple memories (Import ID: ${multiImportJob.id})`);
            console.log();
            
            // Store for cleanup
            memory2ToDelete = memory2Id;
        } catch (error) {
            console.log(`Error with multiple memory operations: ${error.message}\n`);
            memory2ToDelete = null;
        }

        // Example 4: TMX import functionality
        console.log("=== TMX Import Functionality ===");
        
        // Replace with your actual TMX file path
        const tmxFilePath = path.join(__dirname, "sample_memory.tmx");  // Create this file with your TMX content
        
        if (fs.existsSync(tmxFilePath)) {
            try {
                console.log(`Importing TMX file: ${path.basename(tmxFilePath)}`);
                const tmxImport = await lara.memories.importTmx(memoryId, tmxFilePath);
                console.log(`Import started with ID: ${tmxImport.id}`);
                console.log(`Initial progress: ${Math.round(tmxImport.progress * 100)}%`);
                
                // Wait for import to complete
                try {
                    const completedImport = await lara.memories.waitForImport(tmxImport, 10);
                    console.log("✅ Import completed!");
                    console.log(`Final progress: ${Math.round(completedImport.progress * 100)}%`);
                } catch (error) {
                    console.log("Import timeout: The import process took too long to complete.");
                }
                console.log();
            } catch (error) {
                console.log(`Error with TMX import: ${error.message}\n`);
            }
        } else {
            console.log(`TMX file not found: ${tmxFilePath}`);
        }

        // Example 5: Translation deletion
        console.log("=== Translation Deletion ===");
        try {
            // Delete a specific translation unit (with TUID)
            // Important: if you omit tuid, all entries that match the provided fields will be removed
            const deleteJob = await lara.memories.deleteTranslation(
                memoryId,
                "en-US",
                "fr-FR",
                "Hello",
                "Bonjour",
                tuid="greeting_001"  // Specify the TUID to delete a specific translation unit
        );
            console.log(`🗑️  Deleted translation unit (Job ID: ${deleteJob.id})`);
            console.log();
        } catch (error) {
            console.log(`Error deleting translation: ${error.message}\n`);
        }

    } catch (error) {
        console.log(`Error creating memory: ${error.message}\n`);
        return;
    } finally {
        // Cleanup
        console.log("=== Cleanup ===");
        if (memoryId) {
            try {
                const deletedMemory = await lara.memories.delete(memoryId);
                console.log(`🗑️  Deleted memory: ${deletedMemory.name}`);
            } catch (error) {
                console.log(`Error deleting memory: ${error.message}`);
            }
        }

        
        if (memory2ToDelete) {
            try {
                const deletedMemory2 = await lara.memories.delete(memory2ToDelete);
                console.log(`🗑️  Deleted second memory: ${deletedMemory2.name}`);
            } catch (error) {
                console.log(`Error deleting second memory: ${error.message}`);
            }
        }
    }

    console.log("\n🎉 Memory management examples completed!");
}

main().catch(console.error); 