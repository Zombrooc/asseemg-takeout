import { env } from "@pickup/env/native";
import * as SecureStore from "expo-secure-store";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { createTakeoutClient } from "@/lib/takeout-api";
import type { TakeoutApi } from "@/lib/takeout-api";

const HEALTH_CHECK_INTERVAL_MS = 15_000;

const KEYS = {
  baseUrl: "takeout_base_url",
  accessToken: "takeout_access_token",
  deviceId: "takeout_device_id",
} as const;

type ConnectionState = {
  baseUrl: string | null;
  accessToken: string | null;
  deviceId: string | null;
  isPaired: boolean;
  isLoading: boolean;
  isReachable: boolean;
};

type TakeoutConnectionContextValue = ConnectionState & {
  setConnection: (baseUrl: string, accessToken: string, deviceId: string) => Promise<void>;
  clearConnection: () => Promise<void>;
  checkReachability: () => Promise<void>;
  api: TakeoutApi | null;
  defaultBaseUrl: string;
};

const defaultBaseUrl = env.EXPO_PUBLIC_SERVER_URL.replace(/\/$/, "");

const TakeoutConnectionContext = createContext<TakeoutConnectionContextValue | null>(null);

export function TakeoutConnectionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConnectionState>({
    baseUrl: null,
    accessToken: null,
    deviceId: null,
    isPaired: false,
    isLoading: true,
    isReachable: false,
  });
  const checkInFlight = useRef(false);

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
        isReachable: false,
      });
    } catch {
      setState((s) => ({ ...s, isLoading: false }));
    }
  }, []);

  const checkReachability = useCallback(async () => {
    const url = state.baseUrl;
    if (!url || checkInFlight.current) return;
    checkInFlight.current = true;
    try {
      const res = await fetch(`${url.replace(/\/$/, "")}/health`, { method: "GET" });
      const data = (await res.json()) as { status?: string };
      const ok = res.ok && data.status === "ok";
      setState((s) => (s.baseUrl === url ? { ...s, isReachable: ok } : s));
    } catch {
      setState((s) => (s.baseUrl === url ? { ...s, isReachable: false } : s));
    } finally {
      checkInFlight.current = false;
    }
  }, [state.baseUrl]);

  useEffect(() => {
    if (!state.isPaired || !state.baseUrl) {
      setState((s) => (s.isReachable ? { ...s, isReachable: false } : s));
      return;
    }
    checkReachability();
    const id = setInterval(checkReachability, HEALTH_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [state.isPaired, state.baseUrl]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next: AppStateStatus) => {
      if (next === "active" && state.isPaired && state.baseUrl) checkReachability();
    });
    return () => sub.remove();
  }, [state.isPaired, state.baseUrl, checkReachability]);

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
        isReachable: true,
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
      isReachable: false,
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
      checkReachability,
      api,
      defaultBaseUrl,
    }),
    [state, setConnection, clearConnection, checkReachability, api]
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

