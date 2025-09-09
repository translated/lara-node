# Lara Node.js SDK

[![Node Version](https://img.shields.io/badge/node-12+-blue.svg)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

This SDK empowers you to build your own branded translation AI leveraging our translation fine-tuned language model. 

All major translation features are accessible, making it easy to integrate and customize for your needs. 

## 🌍 **Features:**
- **Text Translation**: Single strings, multiple strings, and complex text blocks
- **Document Translation**: Word, PDF, and other document formats with status monitoring
- **Translation Memory**: Store and reuse translations for consistency
- **Glossaries**: Enforce terminology standards across translations
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
  - Glossary export
  - Glossary terms count
  - Import status checking

```bash
cd examples
node glossaries_management.js
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

// Delete translation
// Important: if you omit tuid, all entries that match the provided fields will be removed
const deleteJob = await lara.memories.deleteTranslation(
        "mem_1A2b3C4d5E6f7G8h9I0jKl", "en-US", "fr-FR", "Hello", "Bonjour", tuid="greeting_001"
);

// Wait for import completion
const completedImport = await lara.memories.waitForImport(memoryImport, undefined, 300000); // 5 minutes
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

// Get glossary terms count
const counts = await lara.glossaries.counts("gls_1A2b3C4d5E6f7G8h9I0jKl");
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
