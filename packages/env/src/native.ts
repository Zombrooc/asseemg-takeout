import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const DEFAULT_SERVER_URL = "http://127.0.0.1:5555";

export const env = createEnv({
  clientPrefix: "EXPO_PUBLIC_",
  client: {
    EXPO_PUBLIC_SERVER_URL: z.url().default(DEFAULT_SERVER_URL),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
