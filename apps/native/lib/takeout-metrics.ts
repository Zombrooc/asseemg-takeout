type MetricName =
  | "participant_snapshot_ms"
  | "participant_search_ms"
  | "local_commit_ms"
  | "operation_send_ms"
  | "operation_ack_ms"
  | "realtime_event_ms"
  | "participant_render"
  | "list_ids_update"
  | "outbox_size"
  | "operation_retry"
  | "operation_conflict"
  | "ws_reconnect";

const totals = new Map<MetricName, { count: number; total: number; max: number }>();

export function metricNow(): number {
  return globalThis.performance?.now?.() ?? Date.now();
}

/** Development-only aggregate metrics; labels deliberately exclude participant data. */
export function recordTakeoutMetric(name: MetricName, value = 1): void {
  if (typeof __DEV__ === "undefined" || !__DEV__) return;
  const previous = totals.get(name) ?? { count: 0, total: 0, max: 0 };
  const next = { count: previous.count + 1, total: previous.total + value, max: Math.max(previous.max, value) };
  totals.set(name, next);
  if (next.count === 1 || next.count % 100 === 0) {
    console.debug("[takeout.metric]", name, {
      count: next.count,
      average: Math.round((next.total / next.count) * 100) / 100,
      max: Math.round(next.max * 100) / 100,
    });
  }
}

export function resetTakeoutMetricsForTests(): void {
  totals.clear();
}
