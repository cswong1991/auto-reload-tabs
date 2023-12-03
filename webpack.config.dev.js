const path = require('path');
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
    mode: "development",
    devtool: 'source-map',

    watch: true,
    watchOptions: {
        poll: 1000
    },

    entry: {
        popup: "./src/popup/index.ts",
        content_script: "./src/content_script/index.ts",
        service_worker: "./src/service_worker/index.ts",
    },
    resolve: {
        extensions: [".ts", ".js"],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: "ts-loader",
                exclude: /node_modules/,
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"],
            },
        ],
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "./src/popup/index.html",
            filename: "popup.html",
            chunks: ["popup"],
        }),
        new CopyPlugin({
            patterns: [
                { from: "src/manifest.json", to: "manifest.json" },
                { from: "src/icons", to: "icons" }],
        })
    ],
};