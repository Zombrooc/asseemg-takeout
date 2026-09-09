"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryClient = void 0;
var react_query_1 = require("@tanstack/react-query");
/** tRPC removed; takeout uses REST (takeout-api.ts) against Axum on :5555. */
exports.queryClient = new react_query_1.QueryClient();
