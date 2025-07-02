const path = require("path");
const version = require("./package.json").version;

module.exports = {
    mode: "production",
    entry: "./lib/index.js",
    output: {
        filename: "lara-" + version + ".min.js",
        path: path.resolve(__dirname, "lib_browser"),
        library: {
            name: "Lara",
            type: "umd"
        }
    },
    resolve: {
        fallback: {
            https: false,
            http: false,
            fs: false,
            crypto: false,
            stream: false
        }
    }
};
