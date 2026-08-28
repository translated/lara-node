const { Credentials, Translator } = require("@translated/lara");

/**
 * Complete styleguide management examples for the Lara Node.js SDK
 *
 * This example demonstrates:
 * - Create, list, get, update, delete styleguides
 * - Sharing a styleguide with the account or a group (add, rename, list, revoke)
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

        // Example 5: Styleguide sharing
        // Sharing requires a multi-user account and the appropriate role (account owner for
        // account-wide shares, owner/admin for group shares). Each call returns the shared
        // styleguide, whose `name` reflects the shared copy's name and `sharedAt` the share time.
        console.log("=== Styleguide Sharing ===");
        try {
            // Share with the whole account/team (the optional second argument names the shared copy)
            const teamShare = await lara.styleguides.addAccountShare(styleguideId, "Shared with the team");
            console.log(`🤝 Shared with the account as: '${teamShare.name}' (shared at ${teamShare.sharedAt})`);

            // Rename the account/team share
            const renamedTeamShare = await lara.styleguides.renameAccountShare(styleguideId, "Team styleguide");
            console.log(`📝 Renamed account share to: '${renamedTeamShare.name}'`);

            // List every share visible to the caller: the account share, group shares and user shares
            const shares = await lara.styleguides.getShares(styleguideId);
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
            await lara.styleguides.revokeAccountShare(styleguideId);
            console.log("🚫 Revoked the account share");

            // Group shares work the same way, addressed by a group ID (grp_...)
            const groupId = process.env.LARA_GROUP_ID; // Replace with an actual group ID
            if (groupId) {
                const groupShare = await lara.styleguides.addGroupShare(styleguideId, groupId, "Shared with the group");
                console.log(`🤝 Shared with group ${groupId} as: '${groupShare.name}'`);

                await lara.styleguides.renameGroupShare(styleguideId, groupId, "Marketing group");
                console.log("📝 Renamed the group share");

                await lara.styleguides.revokeGroupShare(styleguideId, groupId);
                console.log("🚫 Revoked the group share");
            } else {
                console.log("Set LARA_GROUP_ID to try the group sharing methods.");
            }
            console.log();
        } catch (error) {
            console.log(`Error sharing styleguide: ${error.message}\n`);
        }

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
