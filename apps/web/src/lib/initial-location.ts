export type InitialLocation = {
  protocol: string;
  pathname: string;
  search: string;
  hash: string;
};

export function getNormalizedInitialPath(location: InitialLocation): string | null {
  const { protocol, pathname, search, hash } = location;

  if (protocol === "file:") {
    return `/${search}${hash}`;
  }

  if (pathname.endsWith("/index.html")) {
    const normalizedPath = pathname.slice(0, -"/index.html".length) || "/";
    return `${normalizedPath}${search}${hash}`;
  }

  return null;
}

export function normalizeInitialLocation(
  location: InitialLocation,
  replaceState: (data: unknown, unused: string, url?: string | URL | null) => void
): void {
  const normalizedPath = getNormalizedInitialPath(location);
  if (!normalizedPath) return;
  replaceState(null, "", normalizedPath);
}
