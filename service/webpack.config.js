const path = require('path');
const resolveAppPath = appPath => path.resolve(__dirname, appPath);
const APP_NODE_MODULES = resolveAppPath('node_modules');
module.exports = {
    entry: {
        authorizer: "./src/lambda/authorizer.ts",
        enrichment: "./src/lambda/enrichment.ts",
        orderNotification: "./src/lambda/order-notification.ts",
        processOrder: "./src/lambda/process-order.ts",
        lambda: "./src/index.ts"
    },
    mode: 'development',  // Explicitly set mode to avoid the warning
    target: 'node',
    output: {
        filename: '[name].js',
        libraryTarget: 'commonjs'
    },
    externals: ['aws-sdk'],
    devtool: "source-map",
    resolve: {
        extensions: ['.webpack.js', '.web.js', '.tsx', '.ts', '.js'],
        modules: ['node_modules', APP_NODE_MODULES]
    },
    module: {
        rules: [
            { test: /\.tsx?$/, loader: "ts-loader" },
            { test: /\.js$/, loader: "source-map-loader" }
        ]
    }
};
