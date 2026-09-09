"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventSummary = EventSummary;
var card_1 = require("@/components/ui/card");
var lucide_react_1 = require("lucide-react");
function EventSummary(_a) {
    var totalParticipants = _a.totalParticipants, confirmedCount = _a.confirmedCount, pendingCount = _a.pendingCount, rateBaseTotal = _a.rateBaseTotal;
    var rateTotal = rateBaseTotal !== null && rateBaseTotal !== void 0 ? rateBaseTotal : totalParticipants;
    var rate = rateTotal > 0
        ? Math.round((confirmedCount / rateTotal) * 100)
        : 0;
    return (<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <card_1.Card>
        <card_1.CardContent className="flex items-center gap-3 pt-4">
          <lucide_react_1.Users className="size-8 text-muted-foreground" aria-hidden/>
          <div>
            <p className="text-2xl font-bold">{totalParticipants}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </div>
        </card_1.CardContent>
      </card_1.Card>
      <card_1.Card>
        <card_1.CardContent className="flex items-center gap-3 pt-4">
          <lucide_react_1.CheckCircle className="size-8 text-green-600 dark:text-green-400" aria-hidden/>
          <div>
            <p className="text-2xl font-bold text-green-700 dark:text-green-400">
              {confirmedCount}
            </p>
            <p className="text-sm text-muted-foreground">Confirmados</p>
          </div>
        </card_1.CardContent>
      </card_1.Card>
      <card_1.Card>
        <card_1.CardContent className="flex items-center gap-3 pt-4">
          <lucide_react_1.Clock className="size-8 text-yellow-600 dark:text-yellow-400" aria-hidden/>
          <div>
            <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
              {pendingCount}
            </p>
            <p className="text-sm text-muted-foreground">Pendentes</p>
          </div>
        </card_1.CardContent>
      </card_1.Card>
      <card_1.Card>
        <card_1.CardContent className="flex flex-col justify-center pt-4">
          <p className="text-2xl font-bold">{rate}%</p>
          <p className="text-sm text-muted-foreground">Taxa de confirmacao</p>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: "".concat(rate, "%") }} role="progressbar" aria-valuenow={rate} aria-valuemin={0} aria-valuemax={100}/>
          </div>
        </card_1.CardContent>
      </card_1.Card>
    </div>);
}
