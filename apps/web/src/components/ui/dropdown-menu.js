"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DropdownMenu = DropdownMenu;
exports.DropdownMenuPortal = DropdownMenuPortal;
exports.DropdownMenuTrigger = DropdownMenuTrigger;
exports.DropdownMenuContent = DropdownMenuContent;
exports.DropdownMenuGroup = DropdownMenuGroup;
exports.DropdownMenuLabel = DropdownMenuLabel;
exports.DropdownMenuItem = DropdownMenuItem;
exports.DropdownMenuCheckboxItem = DropdownMenuCheckboxItem;
exports.DropdownMenuRadioGroup = DropdownMenuRadioGroup;
exports.DropdownMenuRadioItem = DropdownMenuRadioItem;
exports.DropdownMenuSeparator = DropdownMenuSeparator;
exports.DropdownMenuShortcut = DropdownMenuShortcut;
exports.DropdownMenuSub = DropdownMenuSub;
exports.DropdownMenuSubTrigger = DropdownMenuSubTrigger;
exports.DropdownMenuSubContent = DropdownMenuSubContent;
var menu_1 = require("@base-ui/react/menu");
var lucide_react_1 = require("lucide-react");
var React = require("react");
var utils_1 = require("@/lib/utils");
function DropdownMenu(_a) {
    var props = __rest(_a, []);
    return <menu_1.Menu.Root data-slot="dropdown-menu" {...props}/>;
}
function DropdownMenuPortal(_a) {
    var props = __rest(_a, []);
    return <menu_1.Menu.Portal data-slot="dropdown-menu-portal" {...props}/>;
}
function DropdownMenuTrigger(_a) {
    var props = __rest(_a, []);
    return <menu_1.Menu.Trigger data-slot="dropdown-menu-trigger" {...props}/>;
}
function DropdownMenuContent(_a) {
    var _b = _a.align, align = _b === void 0 ? "start" : _b, _c = _a.alignOffset, alignOffset = _c === void 0 ? 0 : _c, _d = _a.side, side = _d === void 0 ? "bottom" : _d, _e = _a.sideOffset, sideOffset = _e === void 0 ? 4 : _e, className = _a.className, props = __rest(_a, ["align", "alignOffset", "side", "sideOffset", "className"]);
    return (<menu_1.Menu.Portal>
      <menu_1.Menu.Positioner className="isolate z-50 outline-none" align={align} alignOffset={alignOffset} side={side} sideOffset={sideOffset}>
        <menu_1.Menu.Popup data-slot="dropdown-menu-content" className={(0, utils_1.cn)("data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 bg-popover text-popover-foreground min-w-32 rounded-none shadow-md ring-1 duration-100 z-50 max-h-(--available-height) w-(--anchor-width) origin-(--transform-origin) overflow-x-hidden overflow-y-auto outline-none data-closed:overflow-hidden", className)} {...props}/>
      </menu_1.Menu.Positioner>
    </menu_1.Menu.Portal>);
}
function DropdownMenuGroup(_a) {
    var props = __rest(_a, []);
    return <menu_1.Menu.Group data-slot="dropdown-menu-group" {...props}/>;
}
function DropdownMenuLabel(_a) {
    var className = _a.className, inset = _a.inset, props = __rest(_a, ["className", "inset"]);
    return (<menu_1.Menu.GroupLabel data-slot="dropdown-menu-label" data-inset={inset} className={(0, utils_1.cn)("text-muted-foreground px-2 py-2 text-xs data-[inset]:pl-8", className)} {...props}/>);
}
function DropdownMenuItem(_a) {
    var className = _a.className, inset = _a.inset, _b = _a.variant, variant = _b === void 0 ? "default" : _b, props = __rest(_a, ["className", "inset", "variant"]);
    return (<menu_1.Menu.Item data-slot="dropdown-menu-item" data-inset={inset} data-variant={variant} className={(0, utils_1.cn)("focus:bg-accent focus:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:focus:text-destructive data-[variant=destructive]:*:[svg]:text-destructive not-data-[variant=destructive]:focus:**:text-accent-foreground gap-2 rounded-none px-2 py-2 text-xs [&_svg:not([class*='size-'])]:size-4 group/dropdown-menu-item relative flex cursor-default items-center outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0", className)} {...props}/>);
}
function DropdownMenuSub(_a) {
    var props = __rest(_a, []);
    return <menu_1.Menu.SubmenuRoot data-slot="dropdown-menu-sub" {...props}/>;
}
function DropdownMenuSubTrigger(_a) {
    var className = _a.className, inset = _a.inset, children = _a.children, props = __rest(_a, ["className", "inset", "children"]);
    return (<menu_1.Menu.SubmenuTrigger data-slot="dropdown-menu-sub-trigger" data-inset={inset} className={(0, utils_1.cn)("focus:bg-accent focus:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground gap-2 rounded-none px-2 py-2 text-xs [&_svg:not([class*='size-'])]:size-4 flex cursor-default items-center outline-hidden select-none data-[inset]:pl-8 [&_svg]:pointer-events-none [&_svg]:shrink-0", className)} {...props}>
      {children}
      <lucide_react_1.ChevronRightIcon className="ml-auto"/>
    </menu_1.Menu.SubmenuTrigger>);
}
function DropdownMenuSubContent(_a) {
    var _b = _a.align, align = _b === void 0 ? "start" : _b, _c = _a.alignOffset, alignOffset = _c === void 0 ? -3 : _c, _d = _a.side, side = _d === void 0 ? "right" : _d, _e = _a.sideOffset, sideOffset = _e === void 0 ? 0 : _e, className = _a.className, props = __rest(_a, ["align", "alignOffset", "side", "sideOffset", "className"]);
    return (<DropdownMenuContent data-slot="dropdown-menu-sub-content" className={(0, utils_1.cn)("data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 bg-popover text-popover-foreground min-w-[96px] rounded-none shadow-lg ring-1 duration-100 w-auto", className)} align={align} alignOffset={alignOffset} side={side} sideOffset={sideOffset} {...props}/>);
}
function DropdownMenuCheckboxItem(_a) {
    var className = _a.className, children = _a.children, checked = _a.checked, props = __rest(_a, ["className", "children", "checked"]);
    return (<menu_1.Menu.CheckboxItem data-slot="dropdown-menu-checkbox-item" className={(0, utils_1.cn)("focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground gap-2 rounded-none py-2 pr-8 pl-2 text-xs [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0", className)} checked={checked} {...props}>
      <span className="pointer-events-none absolute right-2 flex items-center justify-center pointer-events-none" data-slot="dropdown-menu-checkbox-item-indicator">
        <menu_1.Menu.CheckboxItemIndicator>
          <lucide_react_1.CheckIcon />
        </menu_1.Menu.CheckboxItemIndicator>
      </span>
      {children}
    </menu_1.Menu.CheckboxItem>);
}
function DropdownMenuRadioGroup(_a) {
    var props = __rest(_a, []);
    return <menu_1.Menu.RadioGroup data-slot="dropdown-menu-radio-group" {...props}/>;
}
function DropdownMenuRadioItem(_a) {
    var className = _a.className, children = _a.children, props = __rest(_a, ["className", "children"]);
    return (<menu_1.Menu.RadioItem data-slot="dropdown-menu-radio-item" className={(0, utils_1.cn)("focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground gap-2 rounded-none py-2 pr-8 pl-2 text-xs [&_svg:not([class*='size-'])]:size-4 relative flex cursor-default items-center outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0", className)} {...props}>
      <span className="pointer-events-none absolute right-2 flex items-center justify-center pointer-events-none" data-slot="dropdown-menu-radio-item-indicator">
        <menu_1.Menu.RadioItemIndicator>
          <lucide_react_1.CheckIcon />
        </menu_1.Menu.RadioItemIndicator>
      </span>
      {children}
    </menu_1.Menu.RadioItem>);
}
function DropdownMenuSeparator(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return (<menu_1.Menu.Separator data-slot="dropdown-menu-separator" className={(0, utils_1.cn)("bg-border -mx-1 h-px", className)} {...props}/>);
}
function DropdownMenuShortcut(_a) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return (<span data-slot="dropdown-menu-shortcut" className={(0, utils_1.cn)("text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground ml-auto text-xs tracking-widest", className)} {...props}/>);
}
