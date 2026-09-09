"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
var env_core_1 = require("@t3-oss/env-core");
var zod_1 = require("zod");
exports.env = (0, env_core_1.createEnv)({
    clientPrefix: "VITE_",
    client: {
        VITE_SERVER_URL: zod_1.z.url(),
    },
    runtimeEnv: import.meta.env,
    emptyStringAsUndefined: true,
});
