const path = require("node:path");

module.exports = {
    mode: "production",
    entry: "./src/index.ts",
    output: {
        filename: `lara.min.js`,
        path: path.resolve(__dirname, "lib_browser"),
        library: {
            name: "Lara",
            type: "umd"
        },
        globalObject: "this"
    },
    resolve: {
        extensions: [".ts", ".js"],
        alias: {
            // Alias the crypto index to use the browser version
            [path.resolve(__dirname, "src/crypto/index.ts")]: path.resolve(__dirname, "src/crypto/index.browser.ts"),
            // Alias the lara client index to use the browser version
            [path.resolve(__dirname, "src/net/lara/index.ts")]: path.resolve(
                __dirname,
                "src/net/lara/index.browser.ts"
            ),
            // Alias the s3 client index to use the browser version
            [path.resolve(__dirname, "src/net/s3/index.ts")]: path.resolve(__dirname, "src/net/s3/index.browser.ts"),
            // Alias the s3 lara stream to use the browser version
            [path.resolve(__dirname, "src/net/s3/laraStream.ts")]: path.resolve(
                __dirname,
                "src/net/s3/laraStream.browser.ts"
            )
        },
        fallback: {
            https: false,
            http: false,
            fs: false,
            crypto: false,
            stream: false
        }
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: "ts-loader",
                exclude: /node_modules/
            }
        ]
    }
};
