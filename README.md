# Lara Node.js SDK

[![Node Version](https://img.shields.io/badge/node-12+-blue.svg)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

This SDK empowers you to build your own branded translation AI leveraging our translation fine-tuned language model. 

All major translation features are accessible, making it easy to integrate and customize for your needs. 

## 🌍 **Features:**
- **Text Translation**: Single strings, multiple strings, and complex text blocks
- **Document Translation**: Word, PDF, and other document formats with status monitoring
- **Image Translation**: Translate whole images or extract and translate text blocks
- **Audio Translation**: Translate audio files with status monitoring
- **Translation Memory**: Store and reuse translations for consistency
- **Glossaries**: Enforce terminology standards across translations
- **Styleguides**: Define tone, voice, and writing style rules for translations
- **Language Detection**: Automatic source language identification
- **Advanced Options**: Translation instructions and more

## 📚 Documentation

Lara's SDK full documentation is available at [https://developers.laratranslate.com/](https://developers.laratranslate.com/)

## 🚀 Quick Start

### Installation

```bash
npm install @translated/lara
```

### Basic Usage

```javascript
const { Credentials, Translator } = require('@translated/lara');

// Set your credentials using environment variables (recommended)
const credentials = new Credentials(
    process.env.LARA_ACCESS_KEY_ID,
    process.env.LARA_ACCESS_KEY_SECRET
);

// Create translator instance
const lara = new Translator(credentials);

// Simple text translation
async function translateText() {
    try {
        const result = await lara.translate("Hello, world!", "en-US", "fr-FR");
        console.log("Translation: " + result.translation);
        // Output: Translation: Bonjour, le monde !
    } catch (error) {
        console.error("Translation error:", error.message);
    }
}

translateText();
```

## 📖 Examples

The `examples/` directory contains comprehensive examples for all SDK features.

**All examples use environment variables for credentials, so set them first:**
```bash
export LARA_ACCESS_KEY_ID="your-access-key-id"
export LARA_ACCESS_KEY_SECRET="your-access-key-secret"
```

### Text Translation
- **[text_translation.js](examples/text_translation.js)** - Complete text translation examples
  - Single string translation
  - Multiple strings translation  
  - Translation with instructions
  - TextBlocks translation (mixed translatable/non-translatable content)
  - Auto-detect source language
  - Advanced translation options
  - Get available languages

```bash
cd examples
node text_translation.js
```

### Document Translation
- **[document_translation.js](examples/document_translation.js)** - Document translation examples
  - Basic document translation
  - Advanced options with memories and glossaries
  - Step-by-step translation with status monitoring

```bash
cd examples
node document_translation.js
```

### Image Translation
- **[image_translation.js](examples/image_translation.js)** - Image translation examples
    - Basic image translation
    - Advanced options with memories and glossaries
    - Extract and translate text from an image

```bash
cd examples
node image_translation.js
```

### Audio Translation
- **[audio_translation.js](examples/audio_translation.js)** - Audio translation examples
  - Basic audio translation
  - Advanced options with memories and glossaries
  - Step-by-step audio translation with status monitoring

```bash
cd examples
node audio_translation.js
```

### Translation Memory Management
- **[memories_management.js](examples/memories_management.js)** - Memory management examples
  - Create, list, update, delete memories
  - Add individual translations
  - Multiple memory operations
  - TMX file import with progress monitoring
  - Translation deletion
  - Translation with TUID and context

```bash
cd examples
node memories_management.js
```

### Glossary Management
- **[glossaries_management.js](examples/glossaries_management.js)** - Glossary management examples
  - Create, list, update, delete glossaries
  - CSV import with status monitoring
  - Glossary export (sync and async)
  - Glossary terms count
  - Import status checking

```bash
cd examples
node glossaries_management.js
```

### Styleguide Management
- **[styleguide_management.js](examples/styleguide_management.js)** - Styleguide management examples
  - Create, list, get, update, delete styleguides
  - Update name, content, or both at once
  - Handling of non-existent styleguides

```bash
cd examples
node styleguide_management.js
```

## 🔧 API Reference

### Core Components

### 🔐 Authentication

The SDK supports authentication via access key and secret:

```javascript
const credentials = new Credentials("your-access-key-id", "your-access-key-secret");
const lara = new Translator(credentials);
```

**Environment Variables (Recommended):**
```bash
export LARA_ACCESS_KEY_ID="your-access-key-id"
export LARA_ACCESS_KEY_SECRET="your-access-key-secret"
```

```javascript
const credentials = new Credentials(
    process.env.LARA_ACCESS_KEY_ID,
    process.env.LARA_ACCESS_KEY_SECRET
);
```


### 🌍 Translator

```javascript
// Create translator with credentials
const lara = new Translator(credentials);
```

#### Text Translation

```javascript
// Basic translation
const result = await lara.translate("Hello", "en-US", "fr-FR");

// Multiple strings
const result = await lara.translate(["Hello", "World"], "en-US", "fr-FR");

// TextBlocks (mixed translatable/non-translatable content)
const textBlocks = [
    { text: "Translatable text", translatable: true },
    { text: "<br>", translatable: false },  // Non-translatable HTML
    { text: "More translatable text", translatable: true }
];
const result = await lara.translate(textBlocks, "en-US", "fr-FR");

// With advanced options
const options = {
    instructions: ["Formal tone"],
    adaptTo: ["mem_1A2b3C4d5E6f7G8h9I0jKl"],  // Replace with actual memory IDs
    glossaries: ["gls_1A2b3C4d5E6f7G8h9I0jKl"],  // Replace with actual glossary IDs
    style: "fluid",
    timeoutInMillis: 10000
};

const result = await lara.translate("Hello", "en-US", "fr-FR", options);
```

#### Language Detection

Use detect() to automatically identify the language of one or multiple texts.

```javascript
// Single string detection
const single = await lara.detect("Bonjour tout le monde");
console.log(single.language); // fr

// Multiple strings detection
const multiple = await lara.detect(["Hello world", "How are you?"]);
console.log(multiple.languages); // "en"
```

You can provide a hint (expected source language) and a passlist (restrict candidates) to improve accuracy.

```javascript
// Detection with hint and passlist
const detected = await lara.detect(
  "Es un día soleado",
  "es",                      // hint (optional)
  ["es", "pt", "fr"]         // passlist (optional)
);
console.log(detected.language); // es
```

#### Quality Estimation

Use `qualityEstimation()` to score how well a translation matches its source. Pass a single sentence/translation pair to get a single result, or two parallel arrays to get one result per pair.

```javascript
// Single pair
const single = await lara.qualityEstimation(
  "en-US",
  "it-IT",
  "Hello, how are you today?",
  "Ciao, come stai oggi?"
);
console.log(single.score); // e.g. 0.768

// Batch
const batch = await lara.qualityEstimation(
  "en-US",
  "it-IT",
  ["Good morning.", "The weather is nice."],
  ["Buongiorno.", "Il tempo è bello."]
);
console.log(batch.map(r => r.score)); // e.g. [0.751, 0.713]
```

### 📖 Document Translation
#### Simple document translation

```javascript
const fs = require('fs');

const fileStream = fs.createReadStream("/path/to/your/document.txt");  // Replace with actual file path
const translatedContent = await lara.documents.translate(fileStream, "document.txt", "en-US", "fr-FR");

// With options
const options = {
    adaptTo: ["mem_1A2b3C4d5E6f7G8h9I0jKl"],  // Replace with actual memory IDs
    glossaries: ["gls_1A2b3C4d5E6f7G8h9I0jKl"],  // Replace with actual glossary IDs
    style: "fluid"
};

const translatedContent = await lara.documents.translate(fileStream, "document.txt", "en-US", "fr-FR", options);
```
### Document translation with status monitoring
#### Document upload
```javascript
//Optional: upload options
const uploadOptions = {
    adaptTo: ["mem_1A2b3C4d5E6f7G8h9I0jKl"],  // Replace with actual memory IDs
    glossaries: ["gls_1A2b3C4d5E6f7G8h9I0jKl"]  // Replace with actual glossary IDs
};

const document = await lara.documents.upload(fileStream, "document.txt", "en-US", "fr-FR", uploadOptions);
```
#### Document translation status monitoring
```javascript
const status = await lara.documents.status(document.id);
```
#### Download translated document
```javascript
const translatedContent = await lara.documents.download(document.id);
```

### 🖼️ Image Translation

```javascript
const fs = require("fs");

const imageStream = fs.createReadStream("/path/to/your/image.png"); // Replace with actual file path

// Translate image and receive a translated image stream
const translatedImageStream = await lara.images.translate(imageStream, "en", "fr", {
    model: "inpainting",
    style: "faithful"
});

// Extract and translate text blocks from an image
const textBlocks = await lara.images.translateText(imageStream, "en", "fr", {
    adaptTo: ["mem_1A2b3C4d5E6f7G8h9I0jKl"],
    glossaries: ["gls_1A2b3C4d5E6f7G8h9I0jKl"],
});
```

### 🔊 Audio Translation
#### Simple audio translation

```javascript
const fs = require("fs");

const fileStream = fs.createReadStream("/path/to/your/audio.mp3");  // Replace with actual file path
const translatedStream = await lara.audio.translate(fileStream, "audio.mp3", "en-US", "de-DE");

// With options
const options = {
    adaptTo: ["mem_1A2b3C4d5E6f7G8h9I0jKl"],  // Replace with actual memory IDs
    glossaries: ["gls_1A2b3C4d5E6f7G8h9I0jKl"]  // Replace with actual glossary IDs
};

const translatedStream = await lara.audio.translate(fileStream, "audio.mp3", "en-US", "de-DE", options);
```
### Audio translation with status monitoring
#### Audio upload
```javascript
// Optional: upload options
const uploadOptions = {
    adaptTo: ["mem_1A2b3C4d5E6f7G8h9I0jKl"],  // Replace with actual memory IDs
    glossaries: ["gls_1A2b3C4d5E6f7G8h9I0jKl"]  // Replace with actual glossary IDs
};

const audio = await lara.audio.upload(fileStream, "audio.mp3", "en-US", "de-DE", uploadOptions);
```
#### Audio translation status monitoring
```javascript
const status = await lara.audio.status(audio.id);
```
#### Download translated audio
```javascript
const translatedStream = await lara.audio.download(audio.id);
```

### 🧠 Memory Management

```javascript
// Create memory
const memory = await lara.memories.create("MyMemory");

// Create memory with external ID (MyMemory integration)
const memory = await lara.memories.create("Memory from MyMemory", "aabb1122");  // Replace with actual external ID

// Important: To update/overwrite a translation unit you must provide a tuid. Calls without a tuid always create a new unit and will not update existing entries.
// Add translation to single memory
const memoryImport = await lara.memories.addTranslation("mem_1A2b3C4d5E6f7G8h9I0jKl", "en-US", "fr-FR", "Hello", "Bonjour", "greeting_001");

// Add translation to multiple memories
const memoryImport = await lara.memories.addTranslation(["mem_1A2b3C4d5E6f7G8h9I0jKl", "mem_2XyZ9AbC8dEf7GhI6jKlMn"], "en-US", "fr-FR", "Hello", "Bonjour", "greeting_002");

// Add with context
const memoryImport = await lara.memories.addTranslation(
    "mem_1A2b3C4d5E6f7G8h9I0jKl", "en-US", "fr-FR", "Hello", "Bonjour", "tuid", 
    "sentenceBefore", "sentenceAfter"
);

// TMX import from file
const tmxFileStream = fs.createReadStream("/path/to/your/memory.tmx");  // Replace with actual TMX file path
const memoryImport = await lara.memories.importTmx("mem_1A2b3C4d5E6f7G8h9I0jKl", tmxFileStream);

// TMX import with gzip compression
const memoryImport = await lara.memories.importTmx("mem_1A2b3C4d5E6f7G8h9I0jKl", tmxFileStream, true);

// TMX import with a callback URL (notified when the import completes)
const memoryImport = await lara.memories.importTmx(
    "mem_1A2b3C4d5E6f7G8h9I0jKl",
    tmxFileStream,
    "https://your-server.example.com/lara/import-callback"
);

// TMX import with both gzip compression and a callback URL
const memoryImport = await lara.memories.importTmx(
    "mem_1A2b3C4d5E6f7G8h9I0jKl",
    tmxFileStream,
    true,
    "https://your-server.example.com/lara/import-callback"
);

// Async memory export — returns a jobId; the result is delivered to your callback URL when ready
const { jobId } = await lara.memories.exportAsync(
    "mem_1A2b3C4d5E6f7G8h9I0jKl",
    "https://your-server.example.com/lara/export-callback",
    "tmx" // optional, defaults to the server-side default ("tmx" | "jtm")
);

// Delete translation
// Important: if you omit tuid, all entries that match the provided fields will be removed
const deleteJob = await lara.memories.deleteTranslation(
        "mem_1A2b3C4d5E6f7G8h9I0jKl", "en-US", "fr-FR", "Hello", "Bonjour", tuid="greeting_001"
);

// Wait for import completion
const completedImport = await lara.memories.waitForImport(memoryImport, undefined, 300000); // 5 minutes

// Share a memory with the whole account/team (optionally naming the shared copy)
const teamShare = await lara.memories.addAccountShare("mem_1A2b3C4d5E6f7G8h9I0jKl", "Shared with the team");

// Rename the account/team share
await lara.memories.renameAccountShare("mem_1A2b3C4d5E6f7G8h9I0jKl", "Team memory");

// Revoke the account/team share
await lara.memories.revokeAccountShare("mem_1A2b3C4d5E6f7G8h9I0jKl");

// Share a memory with a specific group (optionally naming the shared copy)
const groupShare = await lara.memories.addGroupShare("mem_1A2b3C4d5E6f7G8h9I0jKl", "grp_1A2b3C4d5E6f7G8h9I0jKl", "Shared with the group");

// Rename the group share
await lara.memories.renameGroupShare("mem_1A2b3C4d5E6f7G8h9I0jKl", "grp_1A2b3C4d5E6f7G8h9I0jKl", "Marketing group");

// Revoke the group share
await lara.memories.revokeGroupShare("mem_1A2b3C4d5E6f7G8h9I0jKl", "grp_1A2b3C4d5E6f7G8h9I0jKl");

// List the shares available on a memory (account, group and user shares visible to the caller)
const shares = await lara.memories.getShares("mem_1A2b3C4d5E6f7G8h9I0jKl");
if (shares.account) console.log(`Account ${shares.account.name}: ${shares.account.permissions}`);
for (const group of shares.groups) console.log(`Group ${group.name}: ${group.permissions}`);
for (const user of shares.users) console.log(`User ${user.name}: ${user.permissions}`);
```

### 📚 Glossary Management

```javascript
// Create glossary
const glossary = await lara.glossaries.create("MyGlossary");

// Import CSV from file
const csvFileStream = fs.createReadStream("/path/to/your/glossary.csv");  // Replace with actual CSV file path
const glossaryImport = await lara.glossaries.importCsv("gls_1A2b3C4d5E6f7G8h9I0jKl", csvFileStream);

// Check import status
const importStatus = await lara.glossaries.getImportStatus("gls_1A2b3C4d5E6f7G8h9I0jKl");

// Wait for import completion
const completedImport = await lara.glossaries.waitForImport(glossaryImport, undefined, 300000); // 5 minutes

// Export glossary
const csvData = await lara.glossaries.export("gls_1A2b3C4d5E6f7G8h9I0jKl", "csv/table-uni", "en-US");

// Async glossary export — returns a jobId; the result is delivered to your callback URL when ready
const { jobId } = await lara.glossaries.exportAsync(
    "gls_1A2b3C4d5E6f7G8h9I0jKl",
    "https://your-server.example.com/lara/export-callback",
    "csv/table-uni",
    "en-US"
);

// Get glossary terms count
const counts = await lara.glossaries.counts("gls_1A2b3C4d5E6f7G8h9I0jKl");

// Share with the whole account, rename the share, then list visible shares
await lara.glossaries.addAccountShare("gls_1A2b3C4d5E6f7G8h9I0jKl", "Team glossary");
await lara.glossaries.renameAccountShare("gls_1A2b3C4d5E6f7G8h9I0jKl", "Company terminology");
const glossaryShares = await lara.glossaries.getShares("gls_1A2b3C4d5E6f7G8h9I0jKl");

// Share with a group, rename the share, and revoke it
await lara.glossaries.addGroupShare("gls_1A2b3C4d5E6f7G8h9I0jKl", "grp_1A2b3C4d5E6f7G8h9I0jKl", "Marketing glossary");
await lara.glossaries.renameGroupShare("gls_1A2b3C4d5E6f7G8h9I0jKl", "grp_1A2b3C4d5E6f7G8h9I0jKl", "Marketing terminology");
await lara.glossaries.revokeGroupShare("gls_1A2b3C4d5E6f7G8h9I0jKl", "grp_1A2b3C4d5E6f7G8h9I0jKl");

// Revoke the account share
await lara.glossaries.revokeAccountShare("gls_1A2b3C4d5E6f7G8h9I0jKl");
```

### 📘 Styleguide Management

```javascript
// Create styleguide
const styleguide = await lara.styleguides.create(
    "MyStyleguide",
    "Use a formal tone. Prefer British English spelling. Avoid contractions."
);

// List all styleguides
const styleguides = await lara.styleguides.list();

// Get a styleguide by ID (returns null if not found)
const retrieved = await lara.styleguides.get("stg_1A2b3C4d5E6f7G8h9I0jKl");

// Update a styleguide — pass undefined for fields you don't want to change
// Update only the name
const renamed = await lara.styleguides.update("stg_1A2b3C4d5E6f7G8h9I0jKl", "UpdatedName", undefined);

// Update only the content
const updatedContent = await lara.styleguides.update(
    "stg_1A2b3C4d5E6f7G8h9I0jKl",
    undefined,
    "Use a casual tone. Prefer American English spelling."
);

// Update both name and content
const updated = await lara.styleguides.update(
    "stg_1A2b3C4d5E6f7G8h9I0jKl",
    "FinalName",
    "Use clear and concise language. Avoid jargon."
);

// Share with the whole account, rename the share, then list visible shares
await lara.styleguides.addAccountShare("stg_1A2b3C4d5E6f7G8h9I0jKl", "Team styleguide");
await lara.styleguides.renameAccountShare("stg_1A2b3C4d5E6f7G8h9I0jKl", "Company styleguide");
const styleguideShares = await lara.styleguides.getShares("stg_1A2b3C4d5E6f7G8h9I0jKl");

// Share with a group, rename the share, and revoke it
await lara.styleguides.addGroupShare("stg_1A2b3C4d5E6f7G8h9I0jKl", "grp_1A2b3C4d5E6f7G8h9I0jKl", "Marketing styleguide");
await lara.styleguides.renameGroupShare("stg_1A2b3C4d5E6f7G8h9I0jKl", "grp_1A2b3C4d5E6f7G8h9I0jKl", "Marketing guidelines");
await lara.styleguides.revokeGroupShare("stg_1A2b3C4d5E6f7G8h9I0jKl", "grp_1A2b3C4d5E6f7G8h9I0jKl");

// Revoke the account share
await lara.styleguides.revokeAccountShare("stg_1A2b3C4d5E6f7G8h9I0jKl");

// Delete a styleguide
await lara.styleguides.delete("stg_1A2b3C4d5E6f7G8h9I0jKl");
```

### Translation Options

```javascript
const TranslateOptions = {
    adaptTo: ["mem_1A2b3C4d5E6f7G8h9I0jKl"],              // Memory IDs to adapt to
    glossaries: ["gls_1A2b3C4d5E6f7G8h9I0jKl"],           // Glossary IDs to use
    instructions: ["instruction"],                        // Translation instructions
    style: "fluid",                                       // Translation style (fluid, faithful, creative)
    contentType: "text/plain",                            // Content type (text/plain, text/html, etc.)
    multiline: true,                                      // Enable multiline translation
    timeoutInMillis: 10000,                               // Request timeout in milliseconds
    sourceHint: "en",                                     // Hint for source language detection
    noTrace: false,                                       // Disable request tracing
    verbose: false,                                       // Enable verbose response
};
```

### Language Codes

The SDK supports full language codes (e.g., `en-US`, `fr-FR`, `es-ES`) as well as simple codes (e.g., `en`, `fr`, `es`):

```javascript
// Full language codes (recommended)
const result = await lara.translate("Hello", "en-US", "fr-FR");

// Simple language codes
const result = await lara.translate("Hello", "en", "fr");
```

### 🌐 Supported Languages

The SDK supports all languages available in the Lara API. Use the `getLanguages()` method to get the current list:

```javascript
const languages = await lara.getLanguages();
console.log("Supported languages: " + languages.join(', '));
```

## ⚙️ Configuration

### Error Handling

The SDK provides detailed error information:

```javascript
try {
    const result = await lara.translate("Hello", "en-US", "fr-FR");
    console.log("Translation: " + result.translation);
} catch (error) {
    if (error.constructor.name === 'LaraApiError') {
        console.error("API Error [" + error.statusCode + "]: " + error.message);
        console.error("Error type: " + error.type);
    } else {
        console.error("SDK Error: " + error.message);
    }
}
```

## 📋 Requirements

- Node.js 12 or higher
- npm or yarn
- Valid Lara API credentials

## 🧪 Testing

Run the examples to test your setup:

```bash
# All examples use environment variables for credentials, so set them first:
export LARA_ACCESS_KEY_ID="your-access-key-id"
export LARA_ACCESS_KEY_SECRET="your-access-key-secret"
```

```bash
# Run basic text translation example
cd examples
node text_translation.js
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Happy translating! 🌍✨
