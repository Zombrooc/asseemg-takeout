"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var config_1 = require("vitest/config");
var node_path_1 = require("node:path");
var plugin_react_1 = require("@vitejs/plugin-react");
var appReact = node_path_1.default.resolve(__dirname, "./node_modules/react");
var appReactDom = node_path_1.default.resolve(__dirname, "./node_modules/react-dom");
exports.default = (0, config_1.defineConfig)({
    plugins: [(0, plugin_react_1.default)()],
    resolve: {
        alias: [
            { find: "@", replacement: node_path_1.default.resolve(__dirname, "./src") },
            { find: /^react$/, replacement: appReact },
            { find: /^react\/(.+)$/, replacement: "".concat(appReact, "/$1") },
            { find: /^react-dom$/, replacement: appReactDom },
            { find: /^react-dom\/(.+)$/, replacement: "".concat(appReactDom, "/$1") },
        ],
        dedupe: ["react", "react-dom"],
    },
    test: {
        environment: "jsdom",
        globals: false,
        setupFiles: ["./vitest.setup.ts"],
        include: ["src/**/*.test.{ts,tsx}"],
        server: {
            deps: {
                inline: ["react", "react-dom", "@base-ui/react", "@testing-library/react", "@tanstack/react-query"],
            },
        },
    },
});
