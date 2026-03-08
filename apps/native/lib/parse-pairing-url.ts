/**
 * Parse pairing URL from QR code. Tolerates token in query (?token=) or fragment (#token=)
 * and normalizes whitespace/newlines.
 */
export function parsePairingUrl(
  urlString: string,
): { baseUrl: string; token: string } | null {
  const normalized = urlString.replace(/\s+/g, " ").trim();
  if (!normalized) return null;
  try {
    const u = new URL(normalized);
    let token = u.searchParams.get("token");
    if (!token && u.hash) {
      const hashParams = new URLSearchParams(u.hash.replace(/^#/, ""));
      token = hashParams.get("token");
    }
    if (!token || !token.trim()) return null;
    const baseUrl = `${u.protocol}//${u.host}`;
    return { baseUrl, token: token.trim() };
  } catch {
    return null;
  }
}
