const { Credentials, Translator } = require("@translated/lara");

/**
 * Complete styleguide management examples for the Lara Node.js SDK
 *
 * This example demonstrates:
 * - Create, list, get, update, delete styleguides
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

    console.log("📘 Styleguides require a specific subscription plan.");
    console.log("   If you encounter errors, please check your subscription level.\n");

    let styleguideId = null;

    try {
        // Example 1: Basic styleguide management
        console.log("=== Basic Styleguide Management ===");
        const initialContent = "Use a formal tone. Prefer British English spelling. Avoid contractions.";
        const styleguide = await lara.styleguides.create("MyDemoStyleguide", initialContent);
        console.log(`✅ Created styleguide: ${styleguide.name} (ID: ${styleguide.id})`);
        styleguideId = styleguide.id;

        // List all styleguides
        const styleguides = await lara.styleguides.list();
        console.log(`📝 Total styleguides: ${styleguides.length}`);
        console.log();

        // Example 2: Styleguide operations
        console.log("=== Styleguide Operations ===");
        // Get styleguide details
        const retrievedStyleguide = await lara.styleguides.get(styleguideId);
        if (retrievedStyleguide) {
            console.log(`📖 Styleguide: ${retrievedStyleguide.name} (Owner: ${retrievedStyleguide.ownerId})`);
            console.log(`   Personal: ${retrievedStyleguide.isPersonal}`);
            console.log(`   Created at: ${retrievedStyleguide.createdAt}`);
            if (retrievedStyleguide.content) {
                console.log(`   Content preview: ${retrievedStyleguide.content.substring(0, 80)}...`);
            }
        }
        console.log();

        // Example 3: Update styleguide
        console.log("=== Update Styleguide ===");
        // Update only the name
        const renamedStyleguide = await lara.styleguides.update(styleguideId, "UpdatedDemoStyleguide", undefined);
        console.log(`📝 Updated name: '${styleguide.name}' -> '${renamedStyleguide.name}'`);

        // Update only the content
        const updatedContent = "Use a casual tone. Prefer American English spelling. Contractions are welcome.";
        const updatedStyleguide = await lara.styleguides.update(styleguideId, undefined, updatedContent);
        console.log(`📝 Updated content for styleguide: ${updatedStyleguide.name}`);
        if (updatedStyleguide.content) {
            console.log(`   New content preview: ${updatedStyleguide.content.substring(0, 80)}...`);
        }

        // Update both name and content at the same time
        const fullyUpdatedStyleguide = await lara.styleguides.update(
            styleguideId,
            "FinalDemoStyleguide",
            "Use clear and concise language. Avoid jargon."
        );
        console.log(`📝 Updated name and content: ${fullyUpdatedStyleguide.name}`);
        console.log();

        // Example 4: Get a non-existent styleguide
        console.log("=== Get Non-Existent Styleguide ===");
        const missing = await lara.styleguides.get("non-existent-id");
        if (missing === null) {
            console.log("ℹ️  Styleguide not found (returned null as expected)");
        }
        console.log();

    } catch (error) {
        console.log(`Error during styleguide management: ${error.message}\n`);
        return;
    } finally {
        // Cleanup
        console.log("=== Cleanup ===");
        if (styleguideId) {
            try {
                await lara.styleguides.delete(styleguideId);
                console.log(`🗑️  Deleted styleguide with ID: ${styleguideId}`);
            } catch (error) {
                console.log(`Error deleting styleguide: ${error.message}`);
            }
        }
    }

    console.log("\n🎉 Styleguide management examples completed!");
}

main().catch(console.error);
