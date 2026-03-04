import type { TakeoutRetirantePayload } from "@/lib/takeout-api-types";

type BuildRetiranteInput = {
  isProxyTakeout: boolean;
  retiranteNome: string;
  retiranteCpf?: string | null;
};

export function buildTakeoutRetirantePayload(
  input: BuildRetiranteInput
): TakeoutRetirantePayload | null {
  if (!input.isProxyTakeout) return null;

  const nome = input.retiranteNome.trim();
  if (!nome) return null;

  const cpf = (input.retiranteCpf ?? "").trim();
  if (!cpf) {
    return {
      retirada_por_terceiro: true,
      retirante_nome: nome,
    };
  }

  return {
    retirada_por_terceiro: true,
    retirante_nome: nome,
    retirante_cpf: cpf,
  };
}

export function buildTakeoutRetirantePayloadJson(
  input: BuildRetiranteInput
): string | undefined {
  const payload = buildTakeoutRetirantePayload(input);
  if (!payload) return undefined;
  return JSON.stringify(payload);
}

export function parseTakeoutRetirantePayload(
  payloadJson: string | null | undefined
): TakeoutRetirantePayload | null {
  if (!payloadJson) return null;

  try {
    const parsed = JSON.parse(payloadJson) as Partial<TakeoutRetirantePayload>;
    if (parsed.retirada_por_terceiro !== true) return null;
    if (typeof parsed.retirante_nome !== "string") return null;

    const nome = parsed.retirante_nome.trim();
    if (!nome) return null;

    const cpf =
      typeof parsed.retirante_cpf === "string"
        ? parsed.retirante_cpf.trim()
        : "";

    if (!cpf) {
      return {
        retirada_por_terceiro: true,
        retirante_nome: nome,
      };
    }

    return {
      retirada_por_terceiro: true,
      retirante_nome: nome,
      retirante_cpf: cpf,
    };
  } catch {
    return null;
  }
}

