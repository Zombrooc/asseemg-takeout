import { useTakeoutConnection } from "@/contexts/takeout-connection-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useRouter } from "expo-router";
import { Button, Input } from "heroui-native";
import React, { useCallback, useState } from "react";

import { Container } from "@/components/container";
import { Text, View } from "@/lib/primitives";
import { useResponsiveScale } from "@/utils/responsive";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function generateDeviceId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Parse pairing URL from desktop QR: http://192.168.0.5:5555?token=ABC123 */
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
  const insets = useSafeAreaInsets();
  const { scale } = useResponsiveScale();
  const { defaultBaseUrl, setConnection } = useTakeoutConnection();
  const router = useRouter();
  const [baseUrl, setBaseUrl] = useState(defaultBaseUrl);
  const [pairingToken, setPairingToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
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

  const handlePair = () => doPair(baseUrl, pairingToken);

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
        <Container className="px-4 py-6">
          <Text className="text-foreground font-medium mb-2">
            Acesso à câmera
          </Text>
          <Text className="text-muted-foreground text-sm mb-4">
            Necessário para escanear o QR code exibido no app desktop.
          </Text>
          <Button className="px-4 py-3" onPress={requestPermission}>
            Permitir câmera
          </Button>
          <Button
            variant="bordered"
            className="px-4 py-3 mt-3"
            onPress={() => setShowScanner(false)}
          >
            Voltar
          </Button>
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
            interval: 500,
          }}
          onBarcodeScanned={handleBarcodeScanned}
        />
        <View
          className="absolute bottom-0 left-0 right-0 bg-black/70"
          style={{
            padding: scale(16),
            paddingBottom: scale(16) + insets.bottom,
          }}
        >
          <Text className="text-white text-center text-sm mb-2">
            Aponte para o QR code na tela do desktop
          </Text>
          <Button
            variant="bordered"
            className="px-4 py-3"
            onPress={() => setShowScanner(false)}
          >
            Cancelar
          </Button>
        </View>
      </View>
    );
  }

  return (
    <Container className="px-4 py-6">
      <Text className="text-2xl font-semibold text-foreground mb-1">
        Parear com o Desktop
      </Text>
      <Text className="text-muted-foreground text-sm mb-6">
        Escaneie o QR no desktop ou informe URL e token manualmente.
      </Text>

      <Button
        testID="cta-escanear"
        className="px-4 py-3 mb-6"
        onPress={() => setShowScanner(true)}
      >
        Escanear QR code
      </Button>

      <Text className="text-muted-foreground text-xs mb-2">Ou digite:</Text>
      <Input
        label="URL do Desktop"
        placeholder="http://192.168.0.5:5555"
        value={baseUrl}
        onChangeText={setBaseUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        className="mb-4"
      />
      <Input
        label="Token (ex.: 6 caracteres)"
        placeholder="Token exibido no desktop"
        value={pairingToken}
        onChangeText={setPairingToken}
        autoCapitalize="characters"
        autoCorrect={false}
        className="mb-6"
      />
      {error ? <Text className="text-danger text-sm mb-4">{error}</Text> : null}
      <Button
        testID="cta-conectar"
        className="px-4 py-3"
        onPress={handlePair}
        isLoading={loading}
        isDisabled={loading}
      >
        Conectar
      </Button>
    </Container>
  );
}
