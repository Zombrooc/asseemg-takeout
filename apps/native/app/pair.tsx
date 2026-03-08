import { useTakeoutConnection } from "@/contexts/takeout-connection-context";
import { parsePairingUrl } from "@/lib/parse-pairing-url";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import { Text, View } from "react-native";

import {
  ManualPairForm,
  PairingMethodTabs,
  PairingTipsCard,
  PermissionPrompt,
  QrScannerOverlay,
} from "@/components/mobile-tamagui/pair";
import { Button, Input, ScreenContainer } from "@/components/ui-tamagui";

const PAIR_FETCH_TIMEOUT_MS = 15_000;
const BARCODE_SCAN_THROTTLE_MS = 2_000;

function generateDeviceId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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
  const [cameraReady, setCameraReady] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const lastScannedAt = useRef(0);

  const doPair = useCallback(
    async (url: string, token: string) => {
      const base = url.trim().replace(/\/$/, "");
      const t = token.trim();
      const alias = operatorAlias.trim();
      if (!base || !t || !alias) {
        setError("URL, token e nome do operador são obrigatórios.");
        return;
      }
      setError(null);
      setLoading(true);
      const deviceId = generateDeviceId();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), PAIR_FETCH_TIMEOUT_MS);
      try {
        const res = await fetch(`${base}/pair`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            device_id: deviceId,
            pairing_token: t,
            operator_alias: alias,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        const data = (await res.json()) as {
          access_token?: string;
          error?: string;
        };
        if (!res.ok) {
          setError(data.error ?? `Erro ${res.status}`);
          return;
        }
        if (!data.access_token) {
          setError("Resposta inválida do servidor.");
          return;
        }
        await setConnection(base, data.access_token, deviceId);
        router.replace("/(drawer)");
      } catch (e) {
        clearTimeout(timeoutId);
        if (e instanceof Error) {
          if (e.name === "AbortError") {
            setError("Tempo esgotado. Verifique se o celular e o desktop estão na mesma rede.");
          } else {
            setError(e.message || "Falha ao conectar.");
          }
        } else {
          setError("Falha ao conectar.");
        }
      } finally {
        setLoading(false);
      }
    },
    [setConnection, router, operatorAlias],
  );

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      const now = Date.now();
      if (now - lastScannedAt.current < BARCODE_SCAN_THROTTLE_MS) return;
      lastScannedAt.current = now;

      if (!__DEV__) {
        console.warn("[pair] barcodeScanned", { len: data?.length ?? 0, prefix: (data ?? "").slice(0, 30) });
      }

      const parsed = parsePairingUrl(data);
      if (parsed) {
        setShowScanner(false);
        setBaseUrl(parsed.baseUrl);
        setPairingToken(parsed.token);
        doPair(parsed.baseUrl, parsed.token);
      } else {
        if (!__DEV__) {
          console.warn("[pair] parsePairingUrl null", { raw: (data ?? "").slice(0, 80) });
        }
        setError("QR inválido. Escaneie o QR exibido no desktop.");
      }
    },
    [doPair],
  );

  if (showScanner) {
    if (!permission) {
      return (
        <ScreenContainer mode="static">
          <View style={{ padding: 16, paddingTop: 24 }}>
            <Text style={{ color: "#6b7280" }}>Verificando permissão da câmera...</Text>
          </View>
        </ScreenContainer>
      );
    }
    if (!permission.granted) {
      return (
        <ScreenContainer mode="static">
          <View style={{ padding: 16, paddingTop: 24, flex: 1 }}>
            <PermissionPrompt
              title="Acesso à câmera"
              description="Necessário para escanear o QR code exibido no app desktop."
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
          onCameraReady={() => setCameraReady(true)}
          onBarcodeScanned={cameraReady ? handleBarcodeScanned : undefined}
        />
        <QrScannerOverlay
          description="Aponte para o QR code na tela do desktop"
          onCancel={() => setShowScanner(false)}
        />
      </View>
    );
  }

  const operatorFilled = operatorAlias.trim().length > 0;

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
            {error ? (
              <Text style={{ color: "#dc2626", fontSize: 14, marginBottom: 12 }}>{error}</Text>
            ) : null}
            <Button
              minHeight={48}
              onPress={() => {
                setCameraReady(false);
                setShowScanner(true);
              }}
              disabled={!operatorFilled || loading}
            >
              {loading ? "Conectando..." : "Escanear QR code"}
            </Button>
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
