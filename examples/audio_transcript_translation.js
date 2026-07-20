const { Credentials, Translator } = require("@translated/lara");
const fs = require("fs");
const path = require("path");

/**
 * Complete audio transcript translation examples for the Lara Node.js SDK
 *
 * This example demonstrates the async Audio2Text flow, which returns only the
 * translated transcript (JSON) instead of a dubbed audio file:
 * - Basic transcript translation
 * - Advanced options with memories and glossaries
 * - Step-by-step transcript translation with status monitoring
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


  // Replace with your actual audio file path
  const sampleFilePath = path.join(__dirname, "sample_audio.mp3");  // Create this file with your content

  if (!fs.existsSync(sampleFilePath)) {
    console.log(`Please create a sample audio file at: ${sampleFilePath}`);
    console.log("Add some sample audio content to translate.\n");
    return;
  }

  const sourceLang = "en-US";
  const targetLang = "de-DE";

  // Example 1: Basic transcript translation
  console.log("=== Basic Transcript Translation ===");
  console.log(`Translating transcript: ${path.basename(sampleFilePath)} from ${sourceLang} to ${targetLang}`);

  try {
    const fileStream = fs.createReadStream(sampleFilePath);
    const result = await lara.audio.translateTranscript(fileStream, path.basename(sampleFilePath), sourceLang, targetLang);

    console.log("✅ Transcript translation completed");
    console.log(`📝 Translation: ${result.translation}`);
    console.log(`🔎 Segments: ${result.segments.length}\n`);
  } catch (error) {
    console.log(`Error translating transcript: ${error.message}\n`);
    return;
  }

  // Example 2: Transcript translation with advanced options
  console.log("=== Transcript Translation with Advanced Options ===");
  try {
    const fileStream2 = fs.createReadStream(sampleFilePath);
    const result2 = await lara.audio.translateTranscript(
      fileStream2,
      path.basename(sampleFilePath),
      sourceLang,
      targetLang,
      {
        adaptTo: ["mem_1A2b3C4d5E6f7G8h9I0jKl"],  // Replace with actual memory IDs
        glossaries: ["gls_1A2b3C4d5E6f7G8h9I0jKl"]  // Replace with actual glossary IDs
      }
    );

    console.log("✅ Advanced transcript translation completed");
    console.log(`📝 Translation: ${result2.translation}\n`);
  } catch (error) {
    console.log(`Error in advanced translation: ${error.message}`);
  }
  console.log();

  // Example 3: Step-by-step transcript translation
  console.log("=== Step-by-Step Transcript Translation ===");

  try {
    // Upload audio
    console.log("Step 1: Uploading audio...");
    const fileStream3 = fs.createReadStream(sampleFilePath);
    const audio = await lara.audio.uploadForTranscription(
      fileStream3,
      path.basename(sampleFilePath),
      sourceLang,
      targetLang,
      {
        adaptTo: ["mem_1A2b3C4d5E6f7G8h9I0jKl"],  // Replace with actual memory IDs
        glossaries: ["gls_1A2b3C4d5E6f7G8h9I0jKl"]  // Replace with actual glossary IDs
      }
    );
    console.log(`Audio uploaded with ID: ${audio.id}`);
    console.log(`Initial status: ${audio.status}`);

    // Check status with polling
    console.log("\nStep 2: Checking status...");
    let updatedAudio = await lara.audio.status(audio.id);
    console.log(`Current status: ${updatedAudio.status}`);

    // Poll until translation is complete
    while (updatedAudio.status !== 'translated') {
      updatedAudio = await lara.audio.status(audio.id);
      console.log(`Current status: ${updatedAudio.status}`);

      if (updatedAudio.status === 'error') {
        throw new Error(`Translation failed: ${updatedAudio.errorReason || 'Unknown error'}`);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Retrieve translated transcript
    console.log("\nStep 3: Retrieving translated transcript...");
    const result3 = await lara.audio.getTranslatedTranscript(audio.id);

    console.log("✅ Step-by-step transcript translation completed");
    console.log(`📝 Translation: ${result3.translation}`);
    console.log(`🔎 Segments: ${result3.segments.length}`);
  } catch (error) {
    console.log(`Error in step-by-step process: ${error.message}`);
  }
}

main().catch(console.error);
