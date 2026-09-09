"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tsdown_1 = require("tsdown");
exports.default = (0, tsdown_1.defineConfig)({
    entry: "./src/index.ts",
    format: "esm",
    outDir: "./dist",
    clean: true,
    noExternal: [/@pickup\/.*/],
});
