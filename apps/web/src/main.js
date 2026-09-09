"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_query_1 = require("@tanstack/react-query");
var react_router_1 = require("@tanstack/react-router");
var client_1 = require("react-dom/client");
var loader_1 = require("./components/loader");
var initial_location_1 = require("./lib/initial-location");
var routeTree_gen_1 = require("./routeTree.gen");
var trpc_1 = require("./utils/trpc");
(0, initial_location_1.normalizeInitialLocation)(window.location, window.history.replaceState.bind(window.history));
var router = (0, react_router_1.createRouter)({
    routeTree: routeTree_gen_1.routeTree,
    defaultPreload: "intent",
    defaultPendingComponent: function () { return <loader_1.default />; },
    context: { queryClient: trpc_1.queryClient },
    Wrap: function WrapComponent(_a) {
        var children = _a.children;
        return <react_query_1.QueryClientProvider client={trpc_1.queryClient}>{children}</react_query_1.QueryClientProvider>;
    },
});
var rootElement = document.getElementById("app");
if (!rootElement) {
    throw new Error("Root element not found");
}
if (!rootElement.innerHTML) {
    var root = client_1.default.createRoot(rootElement);
    root.render(<react_router_1.RouterProvider router={router}/>);
}
