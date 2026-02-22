import { env } from "@pickup/env/native";
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient();

/** Takeout API base URL (desktop Axum on :5555). Health check for connection status. */
export async function fetchTakeoutHealth(): Promise<string> {
  const res = await fetch(`${env.EXPO_PUBLIC_SERVER_URL.replace(/\/$/, "")}/health`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { status?: string };
  return data.status === "ok" ? "OK" : "OFF";
}
