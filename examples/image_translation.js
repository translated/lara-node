const { Credentials, Translator } = require("lara-sdk");
const fs = require("fs");
const path = require("path");

/**
 * Complete image translation examples for the Lara Node.js SDK
 *
 * This example demonstrates:
 * - Basic image translation
 * - Advanced options with memories and glossaries
 * - Extracting and translating text from an image
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

  // Replace with your actual image file path
  const sampleFilePath = path.join(__dirname, "sample_image.png");

  if (!fs.existsSync(sampleFilePath)) {
    console.log(`Please create a sample image file at: ${sampleFilePath}`);
    return;
  }

  const sourceLang = "en";
  const targetLang = "de";

  // Example 1: Basic image translation (image output)
  console.log("=== Basic Image Translation ===");
  console.log(`Translating image: ${path.basename(sampleFilePath)} from ${sourceLang} to ${targetLang}`);

  try {
    const fileStream = fs.createReadStream(sampleFilePath);
    const translatedStream = await lara.images.translate(fileStream, sourceLang, targetLang, {
      textRemoval: "overlay"
    });

    const outputPath = path.join(__dirname, "sample_image_translated.png");
    const writeStream = fs.createWriteStream(outputPath);

    await new Promise((resolve, reject) => {
      translatedStream.pipe(writeStream);
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
      translatedStream.on("error", reject);
    });

    console.log("✅ Image translation completed");
    console.log(`📄 Translated image saved to: ${path.basename(outputPath)}\n`);
  } catch (error) {
    console.log(`Error translating image: ${error.message}\n`);
    return;
  }

  // Example 2: Image translation with advanced options
  console.log("=== Image Translation with Advanced Options ===");
  try {
    const fileStream2 = fs.createReadStream(sampleFilePath);
    const translatedStream2 = await lara.images.translate(fileStream2, sourceLang, targetLang, {
      adaptTo: ["mem_1A2b3C4d5E6f7G8h9I0jKl"],
      glossaries: ["gls_1A2b3C4d5E6f7G8h9I0jKl"],
      style: "faithful",
      textRemoval: "inpainting"
    });

    const outputPath = path.join(__dirname, "advanced_image_translated.png");
    const writeStream2 = fs.createWriteStream(outputPath);

    await new Promise((resolve, reject) => {
      translatedStream2.pipe(writeStream2);
      writeStream2.on("finish", resolve);
      writeStream2.on("error", reject);
      translatedStream2.on("error", reject);
    });

    console.log("✅ Advanced image translation completed");
    console.log(`📄 Translated image saved to: ${path.basename(outputPath)}\n`);
  } catch (error) {
    console.log(`Error in advanced translation: ${error.message}`);
  }
  console.log();

  // Example 3: Extract and translate text from an image
  console.log("=== Extract and Translate Text ===");
  try {
    const fileStream3 = fs.createReadStream(sampleFilePath);
    const results = await lara.images.translateText(fileStream3, sourceLang, targetLang, {
      adaptTo: ["mem_1A2b3C4d5E6f7G8h9I0jKl"],
      glossaries: ["gls_1A2b3C4d5E6f7G8h9I0jKl"],
      style: "faithful"
    });

    console.log("✅ Extract and translate completed");
    console.log(`Found ${results.paragraphs.length} text blocks`);

    
    results.paragraphs.forEach((result, index) => {
      console.log(`\nText Block ${index + 1}:`);
      console.log(`Original: ${result.text}`);
      console.log(`Translated: ${result.translation}`);
    });
  } catch (error) {
    console.log(`Error extracting and translating text: ${error.message}`);
  }
}

main().catch(console.error);
