const { Credentials, Translator } = require("@translated/lara");
const fs = require("fs");
const path = require("path");
const { pipeline } = require("stream");
const { promisify } = require("util");

const saveImage = promisify(pipeline);

/**
 * Complete image translation examples for the Lara Node.js SDK
 *
 * This example demonstrates:
 * - Basic image translation
 * - Advanced options with memories and glossaries
 * - Extracting and translating text from an image
 * - Editing translations and rendering with classic and generative models
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
      model: "generative_fast"
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
      model: "inpainting"
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

  // Example 3: Extract text with layout, edit a translation, and render it
  console.log("=== Extract, Edit, and Render Translations ===");
  try {
    const results = await lara.images.translateText(fs.createReadStream(sampleFilePath), sourceLang, targetLang, {
      style: "faithful",
      includeLayout: true
    });

    console.log("✅ Extract and translate completed");
    console.log(`Found ${results.paragraphs.length} text blocks`);

    results.paragraphs.forEach((result, index) => {
      console.log(`\nText Block ${index + 1}:`);
      console.log(`Original: ${result.text}`);
      console.log(`Translated: ${result.translation}`);
    });

    if (results.paragraphs.length === 0) {
      console.log("No text found to render.");
      return;
    }

    // Replace with your desired translation, keeping all layout metadata.
    const editedParagraphs = results.paragraphs.map((paragraph, index) =>
      index === 0 ? { ...paragraph, translation: "Hallo Welt!" } : paragraph
    );

    // Classic models (overlay and inpainting) require bbox, linesBboxes, textInfo,
    // and alignment on every paragraph. includeLayout guarantees these fields.
    // Open a fresh input stream for each request because streams are consumed.
    const classicImage = await lara.images.renderTranslated(
      fs.createReadStream(sampleFilePath),
      results.sourceLanguage,
      targetLang,
      editedParagraphs,
      "overlay"
    );
    const classicOutputPath = path.join(__dirname, "edited_image_overlay.png");
    await saveImage(classicImage, fs.createWriteStream(classicOutputPath));
    console.log(`Edited image saved to: ${path.basename(classicOutputPath)}`);

    // Example 4: Generative rendering accepts text-only paragraphs.
    // Omit model to use the API default generative_fast, or pass "generative"
    // or "generative_fast" explicitly. Pass null to omit the source language.
    const textOnlyParagraphs = editedParagraphs.map(({ text, translation }) => ({ text, translation }));
    const generativeImage = await lara.images.renderTranslated(
      fs.createReadStream(sampleFilePath),
      null,
      targetLang,
      textOnlyParagraphs
    );
    const generativeOutputPath = path.join(__dirname, "edited_image_generative.png");
    await saveImage(generativeImage, fs.createWriteStream(generativeOutputPath));
    console.log(`Generative image saved to: ${path.basename(generativeOutputPath)}`);
  } catch (error) {
    console.log(`Error extracting, editing, or rendering translations: ${error.message}`);
  }
}

main().catch(console.error);
