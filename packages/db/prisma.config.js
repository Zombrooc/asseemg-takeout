"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv_1 = require("dotenv");
var node_path_1 = require("node:path");
var config_1 = require("prisma/config");
dotenv_1.default.config({
    path: "../../apps/server/.env",
});
exports.default = (0, config_1.defineConfig)({
    schema: node_path_1.default.join("prisma", "schema"),
    migrations: {
        path: node_path_1.default.join("prisma", "migrations"),
    },
    datasource: {
        url: (0, config_1.env)("DATABASE_URL"),
    },
});
