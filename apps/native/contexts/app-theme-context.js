"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppThemeProvider = void 0;
exports.useAppTheme = useAppTheme;
var react_1 = require("react");
var uniwind_1 = require("uniwind");
var AppThemeContext = (0, react_1.createContext)(undefined);
var AppThemeProvider = function (_a) {
    var children = _a.children;
    var theme = (0, uniwind_1.useUniwind)().theme;
    (0, react_1.useEffect)(function () {
        uniwind_1.Uniwind.setTheme("light");
    }, []);
    var isLight = (0, react_1.useMemo)(function () {
        return theme === "light";
    }, [theme]);
    var isDark = (0, react_1.useMemo)(function () { return theme === "dark"; }, [theme]);
    var value = (0, react_1.useMemo)(function () { return ({
        currentTheme: theme,
        isLight: isLight,
        isDark: isDark,
    }); }, [theme, isLight, isDark]);
    return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
};
exports.AppThemeProvider = AppThemeProvider;
function useAppTheme() {
    var context = (0, react_1.useContext)(AppThemeContext);
    if (!context) {
        throw new Error("useAppTheme must be used within AppThemeProvider");
    }
    return context;
}
