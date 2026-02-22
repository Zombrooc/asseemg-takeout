import { env } from "@pickup/env/native";
import * as SecureStore from "expo-secure-store";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { createTakeoutClient } from "@/lib/takeout-api";
import type { TakeoutApi } from "@/lib/takeout-api";

const KEYS = {
  baseUrl: "takeout_base_url",
  accessToken: "takeout_access_token",
  deviceId: "takeout_device_id",
} as const;

function generateDeviceId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type ConnectionState = {
  baseUrl: string | null;
  accessToken: string | null;
  deviceId: string | null;
  isPaired: boolean;
  isLoading: boolean;
};

type TakeoutConnectionContextValue = ConnectionState & {
  setConnection: (baseUrl: string, accessToken: string, deviceId: string) => Promise<void>;
  clearConnection: () => Promise<void>;
  api: TakeoutApi | null;
  defaultBaseUrl: string;
};

const defaultBaseUrl = env.EXPO_PUBLIC_SERVER_URL?.replace(/\/$/, "") ?? "http://127.0.0.1:5555";

const TakeoutConnectionContext = createContext<TakeoutConnectionContextValue | null>(null);

export function TakeoutConnectionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConnectionState>({
    baseUrl: null,
    accessToken: null,
    deviceId: null,
    isPaired: false,
    isLoading: true,
  });

  const loadStored = useCallback(async () => {
    try {
      const [baseUrl, accessToken, deviceId] = await Promise.all([
        SecureStore.getItemAsync(KEYS.baseUrl),
        SecureStore.getItemAsync(KEYS.accessToken),
        SecureStore.getItemAsync(KEYS.deviceId),
      ]);
      const isPaired = !!(baseUrl && accessToken && deviceId);
      setState({
        baseUrl,
        accessToken,
        deviceId,
        isPaired,
        isLoading: false,
      });
    } catch {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    loadStored();
  }, [loadStored]);

  const setConnection = useCallback(
    async (baseUrl: string, accessToken: string, deviceId: string) => {
      const url = baseUrl.replace(/\/$/, "");
      await Promise.all([
        SecureStore.setItemAsync(KEYS.baseUrl, url),
        SecureStore.setItemAsync(KEYS.accessToken, accessToken),
        SecureStore.setItemAsync(KEYS.deviceId, deviceId),
      ]);
      setState({
        baseUrl: url,
        accessToken,
        deviceId,
        isPaired: true,
        isLoading: false,
      });
    },
    []
  );

  const clearConnection = useCallback(async () => {
    await Promise.all([
      SecureStore.deleteItemAsync(KEYS.baseUrl),
      SecureStore.deleteItemAsync(KEYS.accessToken),
      SecureStore.deleteItemAsync(KEYS.deviceId),
    ]);
    setState({
      baseUrl: null,
      accessToken: null,
      deviceId: null,
      isPaired: false,
      isLoading: false,
    });
  }, []);

  const api = useMemo(() => {
    if (!state.baseUrl || !state.accessToken || !state.deviceId) return null;
    return createTakeoutClient({
      baseUrl: state.baseUrl,
      getAccessToken: async () => state.accessToken,
    });
  }, [state.baseUrl, state.accessToken, state.deviceId]);

  const value = useMemo<TakeoutConnectionContextValue>(
    () => ({
      ...state,
      setConnection,
      clearConnection,
      api,
      defaultBaseUrl,
    }),
    [state, setConnection, clearConnection, api]
  );

  return (
    <TakeoutConnectionContext.Provider value={value}>
      {children}
    </TakeoutConnectionContext.Provider>
  );
}

export function useTakeoutConnection() {
  const ctx = useContext(TakeoutConnectionContext);
  if (!ctx) throw new Error("useTakeoutConnection must be used within TakeoutConnectionProvider");
  return ctx;
}

