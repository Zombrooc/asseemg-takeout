import { useTakeoutConnection } from "@/contexts/takeout-connection-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { Platform, Text, View } from "react-native";

import {
  ManualPairForm,
  PairingMethodTabs,
  PairingTipsCard,
  PermissionPrompt,
  QrScannerOverlay,
} from "@/components/mobile-tamagui/pair";
import { Button, Input, ScreenContainer } from "@/components/ui-tamagui";

function generateDeviceId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function parsePairingUrl(
  urlString: string,
): { baseUrl: string; token: string } | null {
  try {
    const u = new URL(urlString.trim());
    const token = u.searchParams.get("token");
    if (!token) return null;
    const baseUrl = `${u.protocol}//${u.host}`;
    return { baseUrl, token };
  } catch {
    return null;
  }
}

export default function PairScreen() {
  const { defaultBaseUrl, setConnection } = useTakeoutConnection();
  const router = useRouter();
  const [baseUrl, setBaseUrl] = useState(defaultBaseUrl);
  const [pairingToken, setPairingToken] = useState("");
  const [operatorAlias, setOperatorAlias] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [pairMethod, setPairMethod] = useState<"qr" | "manual">("qr");
  const [permission, requestPermission] = useCameraPermissions();
  const pairingInFlightRef = useRef(false);

  const doPair = useCallback(
    async (url: string, token: string) => {
      if (pairingInFlightRef.current) return;
      const base = url.trim().replace(/\/$/, "");
      const t = token.trim();
      const alias = operatorAlias.trim();
      if (!base || !t || !alias) {
        setError("URL, token e nome do operador sao obrigatorios.");
        return;
      }

      const deviceId = generateDeviceId();
      pairingInFlightRef.current = true;
      setError(null);
      setLoading(true);
      console.info("[pair.mobile] start", {
        platform: Platform.OS,
        appVersion: Constants.expoConfig?.version ?? "unknown",
        deviceId,
        baseUrl: base,
      });

      try {
        const res = await fetch(`${base}/pair`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            device_id: deviceId,
            pairing_token: t,
            operator_alias: alias,
          }),
        });

        const raw = await res.text();
        let data: {
          access_token?: string;
          error?: string;
          code?: string;
        } = {};

        try {
          data = raw ? (JSON.parse(raw) as typeof data) : {};
        } catch {
          data = {};
        }

        if (!res.ok) {
          console.info("[pair.mobile] failed", {
            status: res.status,
            code: data.code ?? null,
            error: data.error ?? raw,
          });

          if (res.status === 401 && data.code === "PAIRING_TOKEN_EXPIRED") {
            setError("Token expirado. Gere um novo QR no desktop e tente novamente.");
            return;
          }
          if (res.status === 401 && data.code === "PAIRING_TOKEN_INVALID") {
            setError("Token invalido. Gere um novo QR no desktop e tente novamente.");
            return;
          }
          if (res.status === 400 && data.code === "OPERATOR_ALIAS_REQUIRED") {
            setError("Informe o nome do operador para concluir o pareamento.");
            return;
          }

          setError(data.error ?? `Erro ${res.status}`);
          return;
        }

        if (!data.access_token) {
          console.info("[pair.mobile] failed", {
            status: res.status,
            code: data.code ?? null,
            error: "missing_access_token",
          });
          setError("Resposta invalida do servidor.");
          return;
        }

        console.info("[pair.mobile] success", {
          deviceId,
          baseUrl: base,
        });
        await setConnection(base, data.access_token, deviceId);
        router.replace("/(drawer)");
      } catch (e) {
        console.info("[pair.mobile] failed", {
          error: e instanceof Error ? e.message : String(e),
        });
        setError(e instanceof Error ? e.message : "Falha ao conectar.");
      } finally {
        pairingInFlightRef.current = false;
        setLoading(false);
      }
    },
    [operatorAlias, router, setConnection],
  );

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      if (pairingInFlightRef.current || loading) return;
      const parsed = parsePairingUrl(data);
      if (parsed) {
        setShowScanner(false);
        setBaseUrl(parsed.baseUrl);
        setPairingToken(parsed.token);
        void doPair(parsed.baseUrl, parsed.token);
      } else {
        setError("QR invalido. Escaneie o QR exibido no desktop.");
      }
    },
    [doPair, loading],
  );

  if (showScanner) {
    if (!permission) {
      return (
        <ScreenContainer mode="static">
          <View style={{ padding: 16, paddingTop: 24 }}>
            <Text style={{ color: "#6b7280" }}>Verificando permissao da camera...</Text>
          </View>
        </ScreenContainer>
      );
    }
    if (!permission.granted) {
      return (
        <ScreenContainer mode="static">
          <View style={{ padding: 16, paddingTop: 24, flex: 1 }}>
            <PermissionPrompt
              title="Acesso a camera"
              description="Necessario para escanear o QR code exibido no app desktop."
              onConfirm={requestPermission}
              onBack={() => setShowScanner(false)}
            />
          </View>
        </ScreenContainer>
      );
    }
    return (
      <View style={{ flex: 1, backgroundColor: "black" }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <QrScannerOverlay
          description={
            loading
              ? "Conectando ao desktop..."
              : "Aponte para o QR code na tela do desktop"
          }
          onCancel={() => setShowScanner(false)}
        />
        {error ? (
          <View
            style={{
              position: "absolute",
              top: 32,
              left: 16,
              right: 16,
              borderRadius: 12,
              backgroundColor: "rgba(220,38,38,0.95)",
              paddingVertical: 10,
              paddingHorizontal: 12,
            }}
          >
            <Text style={{ color: "white", fontSize: 13 }}>{error}</Text>
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <ScreenContainer mode="scroll">
      <View style={{ padding: 16, paddingTop: 24, flex: 1, backgroundColor: "#ffffff" }}>
        <Text style={{ fontSize: 24, fontWeight: "600", color: "#111827", marginBottom: 4 }}>
          Parear com o Desktop
        </Text>
        <Text style={{ color: "#6b7280", fontSize: 14, marginBottom: 16 }}>
          Escaneie o QR no desktop ou informe URL e token manualmente.
        </Text>

        <PairingTipsCard />
        <Text style={{ color: "#111827", fontWeight: "600", fontSize: 16, marginBottom: 4 }}>
          Modo de pareamento
        </Text>
        <Text style={{ color: "#6b7280", fontSize: 14, marginBottom: 12 }}>
          Escolha como deseja conectar
        </Text>
        <PairingMethodTabs method={pairMethod} onChange={setPairMethod} />

        {pairMethod === "qr" ? (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ color: "#111827", fontWeight: "500", fontSize: 14, marginBottom: 6 }}>
              Nome do operador
            </Text>
            <Input
              placeholder="Ex: Posto 1 - Ana"
              value={operatorAlias}
              onChangeText={setOperatorAlias}
              autoCorrect={false}
              style={{ marginBottom: 16, minHeight: 48 }}
            />
            <Button isDisabled={loading} onPress={() => setShowScanner(true)}>
              {loading ? "Conectando..." : "Escanear QR code"}
            </Button>
            {error ? (
              <Text style={{ color: "#dc2626", fontSize: 14, marginTop: 12 }}>
                {error}
              </Text>
            ) : null}
          </View>
        ) : (
          <ManualPairForm
            baseUrl={baseUrl}
            pairingToken={pairingToken}
            operatorAlias={operatorAlias}
            onChangeBaseUrl={setBaseUrl}
            onChangeToken={setPairingToken}
            onChangeOperatorAlias={setOperatorAlias}
            onSubmit={() => doPair(baseUrl, pairingToken)}
            loading={loading}
            error={error}
          />
        )}
      </View>
    </ScreenContainer>
  );
}
