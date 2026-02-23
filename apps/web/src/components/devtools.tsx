import { useEffect, useState } from "react";

/**
 * Loads React Query and Router devtools only in development (dynamic import).
 * No devtools code in production bundle.
 */
export function Devtools() {
  const [components, setComponents] = useState<{
    ReactQueryDevtools: React.ComponentType<Record<string, unknown>>;
    TanStackRouterDevtools: React.ComponentType<Record<string, unknown>>;
  } | null>(null);

  useEffect(() => {
    if (import.meta.env.DEV) {
      Promise.all([
        import("@tanstack/react-query-devtools").then((m) => m.ReactQueryDevtools),
        import("@tanstack/react-router-devtools").then((m) => m.TanStackRouterDevtools),
      ]).then(([ReactQueryDevtools, TanStackRouterDevtools]) => {
        setComponents({
          ReactQueryDevtools: ReactQueryDevtools as React.ComponentType<Record<string, unknown>>,
          TanStackRouterDevtools: TanStackRouterDevtools as React.ComponentType<Record<string, unknown>>,
        });
      });
    }
  }, []);

  if (!import.meta.env.DEV || !components) return null;
  const { ReactQueryDevtools, TanStackRouterDevtools } = components;
  return (
    <>
      <TanStackRouterDevtools position="bottom-left" />
      <ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
    </>
  );
}
