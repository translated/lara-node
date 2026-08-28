const { Credentials, Translator } = require("lara-sdk");
const fs = require("fs");
const path = require("path");

/**
 * Complete glossary management examples for the Lara Node.js SDK
 * 
 * This example demonstrates:
 * - Create, list, update, delete glossaries
 * - CSV import with status monitoring
 * - Glossary export (sync and async)
 * - Glossary terms count
 * - Import status checking
 * - Add or replace glossary entries
 * - Delete glossary entries
 * - Sharing a glossary with the account or a group (add, rename, list, revoke)
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

        // Example 4: CSV import with a callback URL (async notification when import completes)
        console.log("=== CSV Import with Callback URL ===");
        if (fs.existsSync(csvFilePath)) {
            try {
                const callbackUrl = "https://your-server.example.com/lara/import-callback"; // Replace with your endpoint
                // Note: the callback URL must follow the gzip flag (importCsv has no callback-only overload),
                // so pass gzip explicitly even when you don't need compression.
                const importWithCallback = await lara.glossaries.importCsv(glossaryId, csvFilePath, false, callbackUrl);
                console.log(`Import started with ID: ${importWithCallback.id} (callback: ${callbackUrl})`);

                // You can also combine a content type + gzip + callbackUrl:
                // await lara.glossaries.importCsv(glossaryId, csvFilePath, "csv/table-uni", true, callbackUrl);
                console.log();
            } catch (error) {
                console.log(`Error starting CSV import with callback: ${error.message}\n`);
            }
        }

        // Example 5: Export functionality
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

            // Async export - returns a jobId; the result is delivered to your callback URL when ready
            console.log("📤 Starting async export...");
            const { jobId } = await lara.glossaries.exportAsync(
                glossaryId,
                "https://your-server.example.com/lara/export-callback",  // Replace with your actual callback URL
                "csv/table-uni",
                "en-US"
            );
            console.log(`✅ Async export started (job ID: ${jobId})`);
            console.log("   The export result will be delivered to your callback URL when ready.");
            console.log();
        } catch (error) {
            console.log(`Error with export: ${error.message}\n`);
        }

        // Example 6: Glossary Terms Count
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

        // Example 7: Add or replace glossary entries
        console.log("=== Add or Replace Glossary Entries ===");
        try {
            // Add a new entry with multiple language terms
            const terms = [
                { language: "en-US", value: "computer" },
                { language: "it-IT", value: "computer" }
            ];
            const addResult = await lara.glossaries.addOrReplaceEntry(glossaryId, terms);
            console.log(`✅ Entry added/replaced (import ID: ${addResult.id})`);

            // Wait for the import to complete
            const completedAdd = await lara.glossaries.waitForImport(addResult);
            console.log(`   Import progress: ${Math.round(completedAdd.progress * 100)}%`);

            // Add another entry with a custom GUID
            const termsWithGuid = [
                { language: "en-US", value: "keyboard" },
                { language: "it-IT", value: "tastiera" }
            ];
            const addWithGuidResult = await lara.glossaries.addOrReplaceEntry(glossaryId, termsWithGuid, "custom-guid-123");
            console.log(`✅ Entry added with GUID (import ID: ${addWithGuidResult.id})`);
            await lara.glossaries.waitForImport(addWithGuidResult);

            // Replace an existing entry by using the same GUID
            const updatedTerms = [
                { language: "en-US", value: "keyboard" },
                { language: "it-IT", value: "tastiera" },
                { language: "fr-FR", value: "clavier" }
            ];
            const replaceResult = await lara.glossaries.addOrReplaceEntry(glossaryId, updatedTerms, "custom-guid-123");
            console.log(`✅ Entry replaced with updated terms (import ID: ${replaceResult.id})`);
            await lara.glossaries.waitForImport(replaceResult);
            console.log();
        } catch (error) {
            console.log(`Error adding/replacing entry: ${error.message}\n`);
        }

        // Example 8: Delete glossary entries
        console.log("=== Delete Glossary Entries ===");
        try {
            // Delete an entry by GUID
            const deleteByGuidResult = await lara.glossaries.deleteEntry(glossaryId, undefined, "custom-guid-123");
            console.log(`✅ Entry deleted by GUID (import ID: ${deleteByGuidResult.id})`);
            await lara.glossaries.waitForImport(deleteByGuidResult);

            // Delete an entry by term
            const term = { language: "en-US", value: "computer" };
            const deleteByTermResult = await lara.glossaries.deleteEntry(glossaryId, term);
            console.log(`✅ Entry deleted by term: ${term.language} -> "${term.value}" (import ID: ${deleteByTermResult.id})`);
            await lara.glossaries.waitForImport(deleteByTermResult);
            console.log();
        } catch (error) {
            console.log(`Error deleting entry: ${error.message}\n`);
        }

        // Example 9: Glossary sharing
        // Sharing requires a multi-user account and the appropriate role (account owner for
        // account-wide shares, owner/admin for group shares). Each call returns the shared
        // glossary, whose `name` reflects the shared copy's name and `sharedAt` the share time.
        console.log("=== Glossary Sharing ===");
        try {
            // Share with the whole account/team (the optional second argument names the shared copy)
            const teamShare = await lara.glossaries.addAccountShare(glossaryId, "Shared with the team");
            console.log(`🤝 Shared with the account as: '${teamShare.name}' (shared at ${teamShare.sharedAt})`);

            // Rename the account/team share
            const renamedTeamShare = await lara.glossaries.renameAccountShare(glossaryId, "Team glossary");
            console.log(`📝 Renamed account share to: '${renamedTeamShare.name}'`);

            // List every share visible to the caller: the account share, group shares and user shares
            const shares = await lara.glossaries.getShares(glossaryId);
            if (shares.account) {
                console.log(`👥 Account share '${shares.account.shareName}' (${shares.account.permissions})`);
            }
            for (const group of shares.groups) {
                console.log(`👥 Group ${group.name}: '${group.shareName}' (${group.permissions})`);
            }
            for (const user of shares.users) {
                console.log(`👤 User ${user.name}: '${user.shareName}' (${user.permissions})`);
            }

            // Revoke the account/team share
            await lara.glossaries.revokeAccountShare(glossaryId);
            console.log("🚫 Revoked the account share");

            // Group shares work the same way, addressed by a group ID (grp_...)
            const groupId = process.env.LARA_GROUP_ID; // Replace with an actual group ID
            if (groupId) {
                const groupShare = await lara.glossaries.addGroupShare(glossaryId, groupId, "Shared with the group");
                console.log(`🤝 Shared with group ${groupId} as: '${groupShare.name}'`);

                await lara.glossaries.renameGroupShare(glossaryId, groupId, "Marketing group");
                console.log("📝 Renamed the group share");

                await lara.glossaries.revokeGroupShare(glossaryId, groupId);
                console.log("🚫 Revoked the group share");
            } else {
                console.log("Set LARA_GROUP_ID to try the group sharing methods.");
            }
            console.log();
        } catch (error) {
            console.log(`Error sharing glossary: ${error.message}\n`);
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