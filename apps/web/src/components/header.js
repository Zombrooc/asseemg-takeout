"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Header;
var react_router_1 = require("@tanstack/react-router");
var button_1 = require("@/components/ui/button");
var dropdown_menu_1 = require("@/components/ui/dropdown-menu");
var utils_1 = require("@/lib/utils");
var lucide_react_1 = require("lucide-react");
var mode_toggle_1 = require("./mode-toggle");
function getCurrentPage(pathname) {
    if (pathname === "/")
        return "dashboard";
    if (pathname.startsWith("/import"))
        return "import";
    if (pathname.startsWith("/audit"))
        return "audit";
    if (pathname.startsWith("/events"))
        return "events";
    return "dashboard";
}
function Header() {
    var pathname = (0, react_router_1.useRouterState)({ select: function (s) { return s.location.pathname; } });
    var currentPage = getCurrentPage(pathname);
    var navItems = [
        { to: "/", label: "Dashboard", id: "dashboard", icon: lucide_react_1.LayoutDashboard },
        { to: "/import", label: "Importar", id: "import", icon: lucide_react_1.FileInput },
        { to: "/audit", label: "Auditoria", id: "audit", icon: lucide_react_1.ClipboardList },
    ];
    return (<header className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo e Nome */}
        <react_router_1.Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            T
          </span>
          <span className="hidden sm:inline-block">Takeout Desktop</span>
        </react_router_1.Link>

        {/* Navegação Central */}
        <nav className="flex items-center gap-1" aria-label="Navegação principal">
          {navItems.map(function (_a) {
            var to = _a.to, label = _a.label, id = _a.id, Icon = _a.icon;
            var isActive = currentPage === id;
            return (<react_router_1.Link key={to} to={to} className={(0, utils_1.cn)("flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors", isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                <Icon className="size-4" aria-hidden/>
                {label}
              </react_router_1.Link>);
        })}
        </nav>

        {/* Menu de Ações */}
        <div className="flex items-center gap-2">
          <mode_toggle_1.ModeToggle />
          <dropdown_menu_1.DropdownMenu>
            <dropdown_menu_1.DropdownMenuTrigger>
              <button_1.Button variant="ghost" size="icon" aria-label="Abrir menu">
                <lucide_react_1.Settings className="size-4"/>
              </button_1.Button>
            </dropdown_menu_1.DropdownMenuTrigger>
            <dropdown_menu_1.DropdownMenuContent align="end">
              <dropdown_menu_1.DropdownMenuItem disabled>Preferências</dropdown_menu_1.DropdownMenuItem>
              <dropdown_menu_1.DropdownMenuItem disabled>Sobre</dropdown_menu_1.DropdownMenuItem>
              <dropdown_menu_1.DropdownMenuItem disabled>Sair</dropdown_menu_1.DropdownMenuItem>
            </dropdown_menu_1.DropdownMenuContent>
          </dropdown_menu_1.DropdownMenu>
        </div>
      </div>
    </header>);
}
