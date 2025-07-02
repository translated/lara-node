const fs = require("fs");
const path = require("node:path");

const packageJsonFile = path.resolve(__dirname, "..", "package.json");
const apiVersionFile = path.resolve(__dirname, "..", "src", "sdk-version.ts");

const packageJson = JSON.parse(fs.readFileSync(packageJsonFile, "utf8"));

const apiVersionContent = `export const version = "${packageJson.version}";\n`;
fs.writeFileSync(apiVersionFile, apiVersionContent);
