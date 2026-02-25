import { useTakeoutConnection } from "@/contexts/takeout-connection-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";

import {
  ManualPairForm,
  PairingMethodTabs,
  PairingTipsCard,
  PermissionPrompt,
  QrScannerOverlay,
} from "@/components/mobile/pair";
import { Button, Container } from "@/components/ui";
import { Text, View } from "@/lib/primitives";

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
        <Container className="px-4 py-6">
          <Text className="text-muted-foreground">
            Verificando permissão da câmera...
          </Text>
        </Container>
      );
    }
    if (!permission.granted) {
      return (
        <Container className="px-4 py-6" contentClassName="flex-1">
          <PermissionPrompt
            title="Acesso à câmera"
            description="Necessário para escanear o QR code exibido no app desktop."
            onConfirm={requestPermission}
            onBack={() => setShowScanner(false)}
          />
        </Container>
      );
    }
    return (
      <View className="flex-1 bg-black">
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
    <Container className="px-4 py-6 bg-background" contentClassName="flex-1">
      <Text className="text-2xl font-semibold text-foreground mb-1 leading-tight">
        Parear com o Desktop
      </Text>
      <Text className="text-muted-foreground text-sm mb-4 leading-relaxed">
        Escaneie o QR no desktop ou informe URL e token manualmente.
      </Text>

      <PairingTipsCard />
      <Text className="text-foreground font-semibold text-base mb-1 leading-snug">
        Modo de pareamento
      </Text>
      <Text className="text-muted-foreground text-sm mb-3 leading-snug">
        Escolha como deseja conectar
      </Text>
      <PairingMethodTabs method={pairMethod} onChange={setPairMethod} />

      {pairMethod === "qr" ? (
        <Button
          className="px-4 py-3 mb-6 rounded-xl min-h-[48px]"
          onPress={() => setShowScanner(true)}
        >
          Escanear QR code
        </Button>
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
    </Container>
  );
}
