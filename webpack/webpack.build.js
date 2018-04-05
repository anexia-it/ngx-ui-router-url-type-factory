"use strict";


/**
 * Module imports
 */
const
    path = require('path');


/**
 * Build configuration
 */
const
    config = {
        'entry': path.resolve(__dirname, '..', 'ngx-ui-router-url-type-factory'),
        'dist': path.resolve(__dirname, '..', 'dist', 'bundle'),
        'name': 'ngx-ui-router-url-type-factory'
    };


/**
 * Webpack plugin classes
 */
const
    UglifyJsPlugin = require('uglifyjs-webpack-plugin');


/**
 * Webpack configuration
 */
module.exports = {
    devtool: false,
    entry: config.entry,

    output: {
        filename: config.name + '.min.js',
        library: config.name.replace(/-([\w])/g, function (g) { return g[1].toUpperCase(); }),
        libraryTarget: 'umd',
        path: config.dist
    },

    module: {
        rules: [
            /**
             * Bundle configurations
             */
            {
                test: /\.(ts|tsx)$/,
                loader: 'ts-loader',
                options: {
                    compilerOptions: {
                        declaration: false
                    }
                },
                exclude: [
                    /\.(spec|e2e)\./
                ]
            }
        ]
    },
    plugins: [
        new UglifyJsPlugin({
            sourceMap: false,
            uglifyOptions: {
                compress: {
                    drop_console: true
                }
            }
        })
    ],
    resolve: {
        extensions: [
            '.ts',
            '.tsx',
            '.js',
            '.jsx'
        ],
        modules: [
            path.resolve(__dirname, '..', 'src'),
            path.resolve(__dirname, '..', 'node_modules')
        ]
    }
};
