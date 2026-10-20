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

function createCalendarDate(year: number, month: number, day: number): Date | null {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : null;
}

export type DateOnlyParts = {
  year: number;
  month: number;
  day: number;
};

function isValidCalendarDate({ year, month, day }: DateOnlyParts): boolean {
  if (month < 1 || month > 12 || day < 1) return false;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  return day <= daysInMonth;
}

/**
 * Reads a civil date without interpreting it as an instant in time.
 *
 * Birth dates are calendar values, not timestamps. In particular, the date
 * prefix of an accidental ISO timestamp must win over the device timezone.
 */
export function parseDateOnlyParts(value: string | null | undefined): DateOnlyParts | null {
  if (value == null) return null;
  const trimmed = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?=$|T|\s)/.exec(trimmed);
  if (iso) {
    const parts = { year: Number(iso[1]), month: Number(iso[2]), day: Number(iso[3]) };
    return isValidCalendarDate(parts) ? parts : null;
  }

  const brazilian = /^(\d{1,2})[\\/.\-](\d{1,2})[\\/.\-](\d{4})$/.exec(trimmed);
  if (brazilian) {
    const parts = { year: Number(brazilian[3]), month: Number(brazilian[2]), day: Number(brazilian[1]) };
    return isValidCalendarDate(parts) ? parts : null;
  }

  return null;
}

export function normalizeDateOnly(value: string | null | undefined): string | null {
  const parts = parseDateOnlyParts(value);
  if (!parts) return null;
  return `${parts.year.toString().padStart(4, "0")}-${parts.month.toString().padStart(2, "0")}-${parts.day.toString().padStart(2, "0")}`;
}

/** Formats a date-only value without applying timezone conversion. */
export function formatDateOnlyBR(value: string | null | undefined): string {
  const parts = parseDateOnlyParts(value);
  if (!parts) return "—";
  return `${parts.day} de ${MONTHS[parts.month - 1]} de ${parts.year}`;
}

/** Parses date-only values without relying on the platform's locale parser. */
export function parseDateValue(value: string | Date): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const trimmed = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) return createCalendarDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const brazilian = /^(\d{1,2})[\\/.\-](\d{1,2})[\\/.\-](\d{4})$/.exec(trimmed);
  if (brazilian) {
    return createCalendarDate(Number(brazilian[3]), Number(brazilian[2]), Number(brazilian[1]));
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Formata data no padrão brasileiro: "22 de fevereiro de 2026" */
export function formatDateBR(value: string | Date | null | undefined): string {
  if (value == null) return "—";
  const d = parseDateValue(value);
  if (!d) return "—";
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
  const d = parseDateValue(value);
  if (!d) return "—";
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
  const d = parseDateValue(value);
  if (!d) return "—";
  const w = WEEKDAY_SHORT[d.getDay()];
  const day = d.getDate();
  const month = MONTH_SHORT[d.getMonth()];
  return `${w} ${day} ${month}`;
}
