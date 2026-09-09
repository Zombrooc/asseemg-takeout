"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Devtools = Devtools;
var react_1 = require("react");
/**
 * Loads React Query and Router devtools only in development (dynamic import).
 * No devtools code in production bundle.
 */
function Devtools() {
    var _a = (0, react_1.useState)(null), components = _a[0], setComponents = _a[1];
    (0, react_1.useEffect)(function () {
        if (import.meta.env.DEV) {
            Promise.all([
                Promise.resolve().then(function () { return require("@tanstack/react-query-devtools"); }).then(function (m) { return m.ReactQueryDevtools; }),
                Promise.resolve().then(function () { return require("@tanstack/react-router-devtools"); }).then(function (m) { return m.TanStackRouterDevtools; }),
            ]).then(function (_a) {
                var ReactQueryDevtools = _a[0], TanStackRouterDevtools = _a[1];
                setComponents({
                    ReactQueryDevtools: ReactQueryDevtools,
                    TanStackRouterDevtools: TanStackRouterDevtools,
                });
            });
        }
    }, []);
    if (!import.meta.env.DEV || !components)
        return null;
    var ReactQueryDevtools = components.ReactQueryDevtools, TanStackRouterDevtools = components.TanStackRouterDevtools;
    return (<>
      <TanStackRouterDevtools position="bottom-left"/>
      <ReactQueryDevtools position="bottom" buttonPosition="bottom-right"/>
    </>);
}
