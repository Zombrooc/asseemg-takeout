"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Loader;
var lucide_react_1 = require("lucide-react");
function Loader() {
    return (<div className="flex h-full items-center justify-center pt-8">
      <lucide_react_1.Loader2 className="animate-spin"/>
    </div>);
}
