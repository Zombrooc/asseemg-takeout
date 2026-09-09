"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vite_1 = require("@tailwindcss/vite");
var vite_2 = require("@tanstack/router-plugin/vite");
var plugin_react_1 = require("@vitejs/plugin-react");
var node_path_1 = require("node:path");
var vite_3 = require("vite");
exports.default = (0, vite_3.defineConfig)(function (_a) {
    var command = _a.command;
    return ({
        plugins: [(0, vite_1.default)(), (0, vite_2.tanstackRouter)({}), (0, plugin_react_1.default)()],
        base: command === "build" ? "./" : "/",
        resolve: {
            alias: {
                "@": node_path_1.default.resolve(__dirname, "./src"),
                react: node_path_1.default.resolve(__dirname, "./node_modules/react"),
                "react-dom": node_path_1.default.resolve(__dirname, "./node_modules/react-dom"),
            },
            dedupe: ["react", "react-dom"],
        },
        build: {
            outDir: node_path_1.default.resolve(__dirname, "dist"),
        },
        server: {
            port: 3001,
            strictPort: true,
        },
    });
});
