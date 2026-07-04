export type ParticipantAlertCode =
  | "duplicate_cpf"
  | "duplicate_name_cpf"
  | "duplicate_name_different_cpf"
  | "missing_cpf_and_birth_date"
  | "invalid_cpf";

export type ParticipantAlert = {
  code: ParticipantAlertCode;
  message: string;
};

export type LegacyParticipantAlertSubject = {
  id: string;
  name: string | null;
  cpf: string | null;
  birthDate?: string | null;
  bibNumber?: number | null;
};

type AlertMap = Record<string, ParticipantAlert[]>;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeName(value: string | null | undefined): string {
  if (!value) return "";
  return normalizeWhitespace(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeCpf(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/\D/g, "");
}

function hasBirthDate(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function isValidCpfDigits(cpfDigits: string): boolean {
  if (!/^\d{11}$/.test(cpfDigits)) return false;
  if (/^(\d)\1{10}$/.test(cpfDigits)) return false;

  const digits = cpfDigits.split("").map(Number);
  const calcDigit = (sliceLength: number) => {
    const sum = digits
      .slice(0, sliceLength)
      .reduce((acc, digit, index) => acc + digit * (sliceLength + 1 - index), 0);
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  return calcDigit(9) === digits[9] && calcDigit(10) === digits[10];
}

function compareParticipants<T extends LegacyParticipantAlertSubject>(a: T, b: T): number {
  const aBib = a.bibNumber ?? Number.POSITIVE_INFINITY;
  const bBib = b.bibNumber ?? Number.POSITIVE_INFINITY;
  if (aBib !== bBib) return aBib - bBib;
  return a.id.localeCompare(b.id, "pt-BR");
}

function participantReference<T extends LegacyParticipantAlertSubject>(participant: T): string {
  if (participant.bibNumber != null) {
    return `#${participant.bibNumber}`;
  }
  return participant.name?.trim() || participant.id;
}

function relatedParticipantsMessage<T extends LegacyParticipantAlertSubject>(
  prefix: string,
  participant: T,
  related: T[]
): string {
  const others = related
    .filter((item) => item.id !== participant.id)
    .sort(compareParticipants)
    .map(participantReference);

  if (others.length === 0) {
    return prefix;
  }

  return `${prefix} Também aparece no(s) número(s): ${others.join(", ")}.`;
}

function addAlert(
  alertMap: AlertMap,
  participantId: string,
  code: ParticipantAlertCode,
  message: string
): void {
  const current = alertMap[participantId] ?? [];
  current.push({ code, message });
  alertMap[participantId] = current;
}

export function buildLegacyParticipantAlertMap<T extends LegacyParticipantAlertSubject>(
  participants: T[]
): AlertMap {
  const alertMap: AlertMap = {};
  const participantsByCpf = new Map<string, T[]>();
  const participantsByNameAndCpf = new Map<string, T[]>();
  const participantsByName = new Map<string, T[]>();

  for (const participant of participants) {
    const cpfDigits = normalizeCpf(participant.cpf);
    const normalizedName = normalizeName(participant.name);

    if (cpfDigits) {
      const cpfGroup = participantsByCpf.get(cpfDigits) ?? [];
      cpfGroup.push(participant);
      participantsByCpf.set(cpfDigits, cpfGroup);
    }

    if (normalizedName && cpfDigits) {
      const nameAndCpfKey = `${normalizedName}::${cpfDigits}`;
      const nameAndCpfGroup = participantsByNameAndCpf.get(nameAndCpfKey) ?? [];
      nameAndCpfGroup.push(participant);
      participantsByNameAndCpf.set(nameAndCpfKey, nameAndCpfGroup);
    }

    if (normalizedName) {
      const nameGroup = participantsByName.get(normalizedName) ?? [];
      nameGroup.push(participant);
      participantsByName.set(normalizedName, nameGroup);
    }

    if (!cpfDigits && !hasBirthDate(participant.birthDate)) {
      addAlert(
        alertMap,
        participant.id,
        "missing_cpf_and_birth_date",
        "Sem CPF e data de nascimento."
      );
    }

    if (cpfDigits && !isValidCpfDigits(cpfDigits)) {
      addAlert(alertMap, participant.id, "invalid_cpf", "CPF inválido.");
    }
  }

  for (const related of participantsByCpf.values()) {
    if (related.length < 2) continue;
    for (const participant of related) {
      addAlert(
        alertMap,
        participant.id,
        "duplicate_cpf",
        relatedParticipantsMessage("Mesmo CPF em duas inscrições.", participant, related)
      );
    }
  }

  for (const related of participantsByNameAndCpf.values()) {
    if (related.length < 2) continue;
    for (const participant of related) {
      addAlert(
        alertMap,
        participant.id,
        "duplicate_name_cpf",
        relatedParticipantsMessage("Nome e CPF duplicados.", participant, related)
      );
    }
  }

  for (const related of participantsByName.values()) {
    const distinctCpfs = Array.from(
      new Set(related.map((participant) => normalizeCpf(participant.cpf)).filter(Boolean))
    );
    if (distinctCpfs.length < 2) continue;

    for (const participant of related) {
      if (!normalizeCpf(participant.cpf)) continue;
      addAlert(
        alertMap,
        participant.id,
        "duplicate_name_different_cpf",
        relatedParticipantsMessage("Mesmo nome com CPF diferente.", participant, related)
      );
    }
  }

  return alertMap;
}
