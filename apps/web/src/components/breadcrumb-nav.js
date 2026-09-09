"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BreadcrumbNav = BreadcrumbNav;
var react_router_1 = require("@tanstack/react-router");
var lucide_react_1 = require("lucide-react");
function BreadcrumbNav(_a) {
    var items = _a.items;
    return (<nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm text-muted-foreground">
      {items.map(function (item, i) {
            var isLast = i === items.length - 1;
            return (<span key={i} className="flex items-center gap-1">
            {i > 0 && <lucide_react_1.ChevronRight className="size-4 shrink-0" aria-hidden/>}
            {item.href != null && !isLast ? (<react_router_1.Link to={item.href} className="hover:text-foreground hover:underline">
                {item.label}
              </react_router_1.Link>) : (<span className={isLast ? "font-medium text-foreground" : undefined}>
                {item.label}
              </span>)}
          </span>);
        })}
    </nav>);
}
