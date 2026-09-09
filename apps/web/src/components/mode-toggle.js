"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ModeToggle = ModeToggle;
var lucide_react_1 = require("lucide-react");
var theme_provider_1 = require("@/components/theme-provider");
var button_1 = require("@/components/ui/button");
var dropdown_menu_1 = require("@/components/ui/dropdown-menu");
function ModeToggle() {
    var setTheme = (0, theme_provider_1.useTheme)().setTheme;
    return (<dropdown_menu_1.DropdownMenu>
      <dropdown_menu_1.DropdownMenuTrigger render={<button_1.Button variant="outline" size="icon"/>}>
        <lucide_react_1.Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90"/>
        <lucide_react_1.Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0"/>
        <span className="sr-only">Toggle theme</span>
      </dropdown_menu_1.DropdownMenuTrigger>
      <dropdown_menu_1.DropdownMenuContent align="end">
        <dropdown_menu_1.DropdownMenuItem onClick={function () { return setTheme("light"); }}>Light</dropdown_menu_1.DropdownMenuItem>
        <dropdown_menu_1.DropdownMenuItem onClick={function () { return setTheme("dark"); }}>Dark</dropdown_menu_1.DropdownMenuItem>
        <dropdown_menu_1.DropdownMenuItem onClick={function () { return setTheme("system"); }}>System</dropdown_menu_1.DropdownMenuItem>
      </dropdown_menu_1.DropdownMenuContent>
    </dropdown_menu_1.DropdownMenu>);
}
