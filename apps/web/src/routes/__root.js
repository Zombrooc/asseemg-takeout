"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Route = void 0;
var react_router_1 = require("@tanstack/react-router");
var header_1 = require("@/components/header");
var theme_provider_1 = require("@/components/theme-provider");
var sonner_1 = require("@/components/ui/sonner");
require("../index.css");
var devtools_1 = require("@/components/devtools");
exports.Route = (0, react_router_1.createRootRouteWithContext)()({
    component: RootComponent,
    head: function () { return ({
        meta: [
            {
                title: "pickup",
            },
            {
                name: "description",
                content: "pickup is a web application",
            },
        ],
    }); },
});
function RootComponent() {
    return (<>
      <react_router_1.HeadContent />
      <theme_provider_1.ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" disableTransitionOnChange storageKey="vite-ui-theme">
        <div className="grid grid-rows-[auto_1fr] h-svh">
          <header_1.default />
          <react_router_1.Outlet />
        </div>
        <sonner_1.Toaster richColors/>
      </theme_provider_1.ThemeProvider>
      <devtools_1.Devtools />
    </>);
}
