const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

let liveDomainRedirectOrigin = "";

export function isVercelHostname(hostname?: string | null): boolean {
  if (!hostname) return false;
  const clean = hostname.toLowerCase().split(":")[0].trim();
  return clean === "vercel.app" || clean.endsWith(".vercel.app");
}

export function normalizeDomainOrigin(rawInput?: string | null): string | null {
  if (!rawInput || typeof rawInput !== "string") return null;
  let trimmed = rawInput.trim();
  if (!trimmed || trimmed === "MY_APP_URL") return null;
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.toLowerCase();
    if (
      (parsed.protocol === "https:" || parsed.protocol === "http:") &&
      host.includes(".") &&
      !LOCAL_HOSTS.has(host)
    ) {
      return parsed.origin;
    }
  } catch {
    // ignore invalid URL
  }
  return null;
}

export function setLiveDomainRedirectOrigin(origin: string | null): void {
  const normalized = normalizeDomainOrigin(origin);
  liveDomainRedirectOrigin = normalized && !isVercelHostname(new URL(normalized).hostname) ? normalized : "";
}

export function getEnvPublicOrigin(): string {
  try {
    const raw = (import.meta as any)?.env?.VITE_PUBLIC_SITE_URL as string | undefined;
    const normalized = normalizeDomainOrigin(raw);
    if (normalized && !isVercelHostname(new URL(normalized).hostname)) {
      return normalized;
    }
  } catch {
    // Ignore invalid VITE_PUBLIC_SITE_URL
  }
  return "";
}

export function getConfiguredPublicOrigin(): string {
  if (liveDomainRedirectOrigin) return liveDomainRedirectOrigin;
  return getEnvPublicOrigin();
}

export function isUsingConfiguredCustomOrigin(): boolean {
  return Boolean(getConfiguredPublicOrigin());
}

/**
 * Returns the canonical public origin (custom domain if configured, else live origin).
 */
export function getPublicOrigin(): string {
  const configured = getConfiguredPublicOrigin();
  if (configured) return configured;
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "";
}

/**
 * Returns a clean human-readable label for UI surfaces so *.vercel.app is never displayed.
 */
export function getPublicDisplayDomain(): string {
  const configured = getConfiguredPublicOrigin();
  if (configured) {
    try {
      return new URL(configured).hostname.replace(/^www\./i, "");
    } catch {
      return configured;
    }
  }
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (isVercelHostname(host)) {
      return "SiratStream · Accès Officiel";
    }
    return window.location.origin;
  }
  return "SiratStream";
}

export function shouldRedirectClientToOrigin(targetOrigin: string): boolean {
  if (typeof window === "undefined") return false;
  const normalized = normalizeDomainOrigin(targetOrigin);
  if (!normalized) return false;
  try {
    const targetUrl = new URL(normalized);
    const targetHost = targetUrl.hostname.toLowerCase();
    const currentHost = window.location.hostname.toLowerCase();
    if (!currentHost || LOCAL_HOSTS.has(currentHost)) return false;
    if (currentHost === targetHost) return false;
    // Keep AI Studio embedded dev preview safe when not navigated top-level
    if (currentHost.endsWith(".run.app") && window.self !== window.top) return false;
    return true;
  } catch {
    return false;
  }
}

export async function checkDomainReachable(targetOrigin: string, timeoutMs = 3500): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const normalized = normalizeDomainOrigin(targetOrigin);
  if (!normalized) return false;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    await fetch(`${normalized}/manifest.webmanifest?_rd=${Date.now()}`, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    });
    return true;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timer);
  }
}

export async function redirectAllUsersToDomain(targetOrigin: string): Promise<boolean> {
  if (!shouldRedirectClientToOrigin(targetOrigin)) return false;
  const normalized = normalizeDomainOrigin(targetOrigin);
  if (!normalized) return false;
  const reachable = await checkDomainReachable(normalized);
  if (!reachable) return false;
  const destination = `${normalized}${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.location.replace(destination);
  return true;
}
