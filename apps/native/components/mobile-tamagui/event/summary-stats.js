"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SummaryStats = SummaryStats;
var react_native_1 = require("react-native");
function SummaryStats(_a) {
    var total = _a.total, confirmed = _a.confirmed, pending = _a.pending, _b = _a.pendingSync, pendingSync = _b === void 0 ? 0 : _b;
    return (<react_native_1.View style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: "row",
            gap: 12,
            borderBottomWidth: 1,
            borderColor: "#e5e7eb",
            flexWrap: "wrap",
            backgroundColor: "#ffffff",
        }}>
      <react_native_1.View style={{
            borderRadius: 8,
            padding: 12,
            flex: 1,
            minWidth: 80,
            backgroundColor: "rgba(156,163,175,0.1)",
            borderWidth: 1,
            borderColor: "rgba(229,231,235,0.5)",
            overflow: "hidden",
        }}>
        <react_native_1.Text style={{ fontSize: 20, fontWeight: "700", color: "#111827" }}>{total}</react_native_1.Text>
        <react_native_1.Text style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>Total</react_native_1.Text>
      </react_native_1.View>
      <react_native_1.View style={{
            borderRadius: 8,
            padding: 12,
            flex: 1,
            minWidth: 80,
            backgroundColor: "rgba(16,185,129,0.1)",
            borderWidth: 1,
            borderColor: "rgba(16,185,129,0.2)",
            overflow: "hidden",
        }}>
        <react_native_1.Text style={{ fontSize: 20, fontWeight: "700", color: "#10b981" }}>{confirmed}</react_native_1.Text>
        <react_native_1.Text style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>Confirmados</react_native_1.Text>
      </react_native_1.View>
      <react_native_1.View style={{
            borderRadius: 8,
            padding: 12,
            flex: 1,
            minWidth: 80,
            backgroundColor: "rgba(245,158,11,0.1)",
            borderWidth: 1,
            borderColor: "rgba(245,158,11,0.2)",
            overflow: "hidden",
        }}>
        <react_native_1.Text style={{ fontSize: 20, fontWeight: "700", color: "#f59e0b" }}>{pending}</react_native_1.Text>
        <react_native_1.Text style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>Aguardando</react_native_1.Text>
      </react_native_1.View>
      {pendingSync > 0 ? (<react_native_1.View style={{
                borderRadius: 8,
                padding: 12,
                backgroundColor: "rgba(156,163,175,0.2)",
                borderWidth: 1,
                borderColor: "rgba(229,231,235,0.5)",
                alignSelf: "center",
                overflow: "hidden",
            }}>
          <react_native_1.Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>{pendingSync}</react_native_1.Text>
          <react_native_1.Text style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>Sync</react_native_1.Text>
        </react_native_1.View>) : null}
    </react_native_1.View>);
}
