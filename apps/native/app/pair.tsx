import { useTakeoutConnection } from "@/contexts/takeout-connection-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import { Text, View } from "react-native";

import {
  ManualPairForm,
  PairingMethodTabs,
  PairingTipsCard,
  PermissionPrompt,
  QrScannerOverlay,
} from "@/components/mobile-tamagui/pair";
import { Button, ScreenContainer } from "@/components/ui-tamagui";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [pairMethod, setPairMethod] = useState<"qr" | "manual">("qr");
  const [permission, requestPermission] = useCameraPermissions();

  const doPair = useCallback(
    async (url: string, token: string) => {
      const base = url.trim().replace(/\/$/, "");
      const t = token.trim();
      if (!base || !t) {
        setError("URL e token são obrigatórios.");
        return;
      }
      setError(null);
      setLoading(true);
      const deviceId = generateDeviceId();
      try {
        const res = await fetch(`${base}/pair`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            device_id: deviceId,
            pairing_token: t,
          }),
        });
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
        setError(e instanceof Error ? e.message : "Falha ao conectar.");
      } finally {
        setLoading(false);
      }
    },
    [setConnection, router],
  );

  const handleBarcodeScanned = useCallback(
    ({ data }: { data: string }) => {
      const parsed = parsePairingUrl(data);
      if (parsed) {
        setShowScanner(false);
        setBaseUrl(parsed.baseUrl);
        setPairingToken(parsed.token);
        doPair(parsed.baseUrl, parsed.token);
      } else {
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
          onBarcodeScanned={handleBarcodeScanned}
        />
        <QrScannerOverlay
          description="Aponte para o QR code na tela do desktop"
          onCancel={() => setShowScanner(false)}
        />
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
            <Button
              minHeight={48}
              onPress={() => setShowScanner(true)}
            >
              Escanear QR code
            </Button>
          </View>
        ) : (
          <ManualPairForm
            baseUrl={baseUrl}
            pairingToken={pairingToken}
            onChangeBaseUrl={setBaseUrl}
            onChangeToken={setPairingToken}
            onSubmit={() => doPair(baseUrl, pairingToken)}
            loading={loading}
            error={error}
          />
        )}
      </View>
    </ScreenContainer>
  );
}
