const { Credentials, Translator } = require("lara-sdk");
const fs = require("fs");
const path = require("path");

/**
 * Complete audio translation examples for the Lara Node.js SDK
 *
 * This example demonstrates:
 * - Basic audio translation
 * - Advanced options with memories and glossaries
 * - Step-by-step audio translation with status monitoring
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

  // Example 1: Basic audio translation
  console.log("=== Basic Audio Translation ===");
  const sourceLang = "en-US";
  const targetLang = "de-DE";

  console.log(`Translating audio: ${path.basename(sampleFilePath)} from ${sourceLang} to ${targetLang}`);

  try {
    const fileStream = fs.createReadStream(sampleFilePath);
    const translatedStream = await lara.audio.translate(fileStream, path.basename(sampleFilePath), sourceLang, targetLang);

    // Save translated audio - replace with your desired output path
    const outputPath = path.join(__dirname, "sample_audio_translated.mp3");
    const writeStream = fs.createWriteStream(outputPath);

    // Pipe the stream to the file
    await new Promise((resolve, reject) => {
      translatedStream.pipe(writeStream);
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
      translatedStream.on('error', reject);
    });

    console.log("✅ Audio translation completed");
    console.log(`📄 Translated file saved to: ${path.basename(outputPath)}\n`);
  } catch (error) {
    console.log(`Error translating audio: ${error.message}\n`);
    return;
  }

  // Example 2: Audio translation with advanced options
  console.log("=== Audio Translation with Advanced Options ===");
  try {

    const fileStream2 = fs.createReadStream(sampleFilePath);
    const translatedStream2 = await lara.audio.translate(
      fileStream2,
      path.basename(sampleFilePath),
      sourceLang,
      targetLang,
      {
        adaptTo: ["mem_1A2b3C4d5E6f7G8h9I0jKl"],  // Replace with actual memory IDs
        glossaries: ["gls_1A2b3C4d5E6f7G8h9I0jKl"]  // Replace with actual glossary IDs
      }
    );

    // Save translated audio - replace with your desired output path
    const outputPath = path.join(__dirname, "advanced_audio_translated.mp3");
    const writeStream2 = fs.createWriteStream(outputPath);

    // Pipe the stream to the file
    await new Promise((resolve, reject) => {
      translatedStream2.pipe(writeStream2);
      writeStream2.on('finish', resolve);
      writeStream2.on('error', reject);
      translatedStream2.on('error', reject);
    });

    console.log("✅ Advanced Audio translation completed");
    console.log(`📄 Translated file saved to: ${path.basename(outputPath)}\n`);
  } catch (error) {
    console.log(`Error in advanced translation: ${error.message}`);
  }
  console.log();

  // Example 3: Step-by-step audio translation
  console.log("=== Step-by-Step Audio Translation ===");

  try {
    // Upload audio
    console.log("Step 1: Uploading audio...");
    const fileStream3 = fs.createReadStream(sampleFilePath);
    const audio = await lara.audio.upload(
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

    // Download translated audio
    console.log("\nStep 3: Downloading translated audio...");
    const translatedStream3 = await lara.audio.download(audio.id);

    // Save translated audio - replace with your desired output path
    const outputPath = path.join(__dirname, "step_audio_translated.mp3");
    const writeStream3 = fs.createWriteStream(outputPath);

    // Pipe the stream to the file
    await new Promise((resolve, reject) => {
      translatedStream3.pipe(writeStream3);
      writeStream3.on('finish', resolve);
      writeStream3.on('error', reject);
      translatedStream3.on('error', reject);
    });
    console.log("✅ Step-by-step translation completed");
    console.log(`📄 Translated file saved to: ${path.basename(outputPath)}`);
  } catch (error) {
    console.log(`Error in step-by-step process: ${error.message}`);
  }
}

main().catch(console.error);