import { createTakeoutClient, TakeoutApiError } from "@/lib/takeout-api";

export function parsePairingUrl(
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

export function getPairingErrorMessage(error: unknown): string {
  if (error instanceof TakeoutApiError) {
    try {
      const parsed = JSON.parse(error.body) as { error?: string };
      if (parsed.error) return parsed.error;
    } catch {
      // ignore invalid json body
    }
    return `Erro ${error.status}`;
  }

  if (error instanceof Error) return error.message;

  return "Falha ao conectar.";
}

export async function pairDevice(
  baseUrl: string,
  pairingToken: string,
  deviceId: string,
): Promise<{ accessToken: string }> {
  const normalizedBaseUrl = baseUrl.trim().replace(/\/$/, "");
  const client = createTakeoutClient({
    baseUrl: normalizedBaseUrl,
    getAccessToken: async () => null,
  });

  const result = await client.pair(deviceId, pairingToken.trim());
  if (!result?.access_token) {
    throw new Error("Resposta inválida do servidor.");
  }

  return { accessToken: result.access_token };
}
