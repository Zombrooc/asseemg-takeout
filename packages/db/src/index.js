"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var server_1 = require("@pickup/env/server");
var adapter_libsql_1 = require("@prisma/adapter-libsql");
var client_1 = require("../prisma/generated/client");
var adapter = new adapter_libsql_1.PrismaLibSql({
    url: server_1.env.DATABASE_URL,
});
var prisma = new client_1.PrismaClient({ adapter: adapter });
exports.default = prisma;
