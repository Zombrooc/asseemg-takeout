const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

/** Formata data no padrão brasileiro: "22 de fevereiro de 2026" */
export function formatDateBR(value: string | Date | null | undefined): string {
  if (value == null) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const day = d.getDate();
  const month = MONTHS[d.getMonth()];
  const year = d.getFullYear();
  return `${day} de ${month} de ${year}`;
}

/** Formata data e hora no padrão brasileiro: "22 de fevereiro de 2026, 14:30" */
export function formatDateTimeBR(
  value: string | Date | null | undefined,
): string {
  if (value == null) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const datePart = formatDateBR(d);
  const time = d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${datePart}, ${time}`;
}

const WEEKDAY_SHORT = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];
const MONTH_SHORT = [
  "jan.",
  "fev.",
  "mar.",
  "abr.",
  "mai.",
  "jun.",
  "jul.",
  "ago.",
  "set.",
  "out.",
  "nov.",
  "dez.",
];

/** Formata data em estilo curto: "sáb., 15 mar." */
export function formatDateShort(
  value: string | Date | null | undefined,
): string {
  if (value == null) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  const w = WEEKDAY_SHORT[d.getDay()];
  const day = d.getDate();
  const month = MONTH_SHORT[d.getMonth()];
  return `${w} ${day} ${month}`;
}
