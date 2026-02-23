import { env } from "@pickup/env/native";
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient();

/** Takeout API base URL (desktop Axum on :5555). Health check for connection status. */
export async function fetchTakeoutHealth(): Promise<string> {
  const baseUrl = env.EXPO_PUBLIC_SERVER_URL.replace(/\/$/, "");
  const res = await fetch(`${baseUrl}/health`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { status?: string };
  return data.status === "ok" ? "OK" : "OFF";
}
