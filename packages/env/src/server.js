"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
var env_core_1 = require("@t3-oss/env-core");
var zod_1 = require("zod");
exports.env = (0, env_core_1.createEnv)({
    server: {
        DATABASE_URL: zod_1.z.string().min(1),
        CORS_ORIGIN: zod_1.z.url(),
        NODE_ENV: zod_1.z.enum(["development", "production", "test"]).default("development"),
    },
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
});
