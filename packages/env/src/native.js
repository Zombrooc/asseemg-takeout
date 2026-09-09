"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
var env_core_1 = require("@t3-oss/env-core");
var zod_1 = require("zod");
var DEFAULT_SERVER_URL = "http://127.0.0.1:5555";
exports.env = (0, env_core_1.createEnv)({
    clientPrefix: "EXPO_PUBLIC_",
    client: {
        EXPO_PUBLIC_SERVER_URL: zod_1.z.url().default(DEFAULT_SERVER_URL),
    },
    runtimeEnv: process.env,
    emptyStringAsUndefined: true,
});
