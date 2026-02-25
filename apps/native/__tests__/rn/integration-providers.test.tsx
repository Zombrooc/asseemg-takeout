import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import renderer, { act } from "react-test-renderer";

import { AppThemeProvider } from "@/contexts/app-theme-context";
import { TakeoutConnectionProvider, useTakeoutConnection } from "@/contexts/takeout-connection-context";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock("@/lib/takeout-api", () => ({
  createTakeoutClient: jest.fn(() => ({ getEvents: jest.fn() })),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({ getItem: jest.fn(), setItem: jest.fn() }));
jest.mock("@/lib/takeout-realtime", () => ({ useTakeoutRealtime: () => ({ lockMap: {} }), useEventsListRealtime: () => null }));
jest.mock("uniwind", () => ({
  Uniwind: { setTheme: jest.fn() },
  useUniwind: () => ({ theme: "light" }),
}));

function Probe() {
  const conn = useTakeoutConnection();
  return <>{conn.isPaired ? "paired" : "not-paired"}</>;
}

describe("providers integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("loads secure store and builds api client", async () => {
    const SecureStore = await import("expo-secure-store");
    const takeoutApi = await import("@/lib/takeout-api");

    (SecureStore.getItemAsync as jest.Mock)
      .mockResolvedValueOnce("http://desktop:5555")
      .mockResolvedValueOnce("token")
      .mockResolvedValueOnce("device");

    const queryClient = new QueryClient();

    await act(async () => {
      renderer.create(
        <QueryClientProvider client={queryClient}>
          <AppThemeProvider>
            <TakeoutConnectionProvider>
              <Probe />
            </TakeoutConnectionProvider>
          </AppThemeProvider>
        </QueryClientProvider>,
      );
    });

    expect(SecureStore.getItemAsync).toHaveBeenCalled();
    expect((takeoutApi.createTakeoutClient as jest.Mock)).toHaveBeenCalled();
  });
});
