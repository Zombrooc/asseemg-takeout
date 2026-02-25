import { Link, useRouterState } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { LayoutDashboard, FileInput, ClipboardList, Settings } from "lucide-react";
import { ModeToggle } from "./mode-toggle";

export type HeaderCurrentPage = "dashboard" | "import" | "audit" | "events";

function getCurrentPage(pathname: string): HeaderCurrentPage {
  if (pathname === "/") return "dashboard";
  if (pathname.startsWith("/import")) return "import";
  if (pathname.startsWith("/audit")) return "audit";
  if (pathname.startsWith("/events")) return "events";
  return "dashboard";
}

export default function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const currentPage = getCurrentPage(pathname);

  const navItems = [
    { to: "/", label: "Dashboard", id: "dashboard" as const, icon: LayoutDashboard },
    { to: "/import", label: "Importar", id: "import" as const, icon: FileInput },
    { to: "/audit", label: "Auditoria", id: "audit" as const, icon: ClipboardList },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <div className="flex h-14 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo e Nome */}
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            T
          </span>
          <span className="hidden sm:inline-block">Takeout Desktop</span>
        </Link>

        {/* Navegação Central */}
        <nav className="flex items-center gap-1" aria-label="Navegação principal">
          {navItems.map(({ to, label, id, icon: Icon }) => {
            const isActive = currentPage === id;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Menu de Ações */}
        <div className="flex items-center gap-2">
          <ModeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button variant="ghost" size="icon" aria-label="Abrir menu">
                <Settings className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem disabled>Preferências</DropdownMenuItem>
              <DropdownMenuItem disabled>Sobre</DropdownMenuItem>
              <DropdownMenuItem disabled>Sair</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
