import { QueryClient } from "@tanstack/react-query";

/** tRPC removed; takeout uses REST (takeout-api.ts) against Axum on :5555. */
export const queryClient = new QueryClient();
