const WIX_EVENTS_HOST = /(^|\.)wixevents\.com$/i;

export type WixQrIdentifiers = {
  ticketNumber: string;
  orderNumber: string | null;
};

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("en-US");
}

function decodeSegment(value: string): string | null {
  try {
    const decoded = decodeURIComponent(value).trim();
    return decoded || null;
  } catch {
    return null;
  }
}

/** Extracts Wix identifiers locally; it never calls the Wix API. */
export function extractWixQrIdentifiers(rawValue: string): WixQrIdentifiers | null {
  const raw = rawValue.trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  if (!/^https?:$/i.test(url.protocol) || !WIX_EVENTS_HOST.test(url.hostname)) {
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const checkInIndex = segments.findIndex((segment) => normalize(segment) === "check-in");
  if (checkInIndex < 0) return null;
  const ticketPath = segments[checkInIndex + 1];
  if (!ticketPath) return null;

  const [ticketSegment] = ticketPath.split(",", 1);
  if (!ticketSegment) return null;
  const ticketNumber = decodeSegment(ticketSegment);
  if (!ticketNumber) return null;

  const orderParam = ["orderNumber", "order_number", "order"]
    .map((key) => url.searchParams.get(key))
    .find((value): value is string => Boolean(value?.trim()));

  return {
    ticketNumber,
    orderNumber: orderParam
      ? decodeSegment(orderParam)
      : ticketNumber.length > 2
        ? ticketNumber.slice(0, -2)
        : null,
  };
}

/** Returns values in preferred matching order: ticket, then order fallback. */
export function getQrLookupValues(rawValue: string): string[] {
  const raw = rawValue.trim();
  const identifiers = extractWixQrIdentifiers(raw);
  const values = identifiers
    ? [identifiers.ticketNumber, identifiers.orderNumber]
    : [raw];
  return [
    ...new Set(
      values
        .filter((value): value is string => Boolean(value?.trim()))
        .map(normalize),
    ),
  ];
}

export function qrValueMatches(
  rawValue: string,
  participantValues: Array<string | number | null | undefined>,
): boolean {
  const lookupValues = getQrLookupValues(rawValue);
  return participantValues
    .filter((value): value is string | number => value != null)
    .some((value) => lookupValues.includes(normalize(String(value))));
}
