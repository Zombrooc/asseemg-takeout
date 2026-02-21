import type { AppRouter } from "@pickup/api/routers/index";

import { env } from "@pickup/env/native";
import { QueryClient } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";

export const queryClient = new QueryClient();

const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${env.EXPO_PUBLIC_SERVER_URL}/trpc`,
    }),
  ],
});

export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: trpcClient,
  queryClient,
});
