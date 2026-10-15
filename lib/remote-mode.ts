// lib/remote-mode.ts
//
// Host-based "remote read-only" policy.
//
// The shop terminal (LAN: IP address or a local hostname) has full read/write
// access. The same app, when reached through the public hostname (e.g.
// diplmasiltd.net via the Cloudflare tunnel), is view-only.
//
// This module is imported by both the edge middleware (server) and client
// components, so it must stay free of Node-only APIs. The host list uses the
// NEXT_PUBLIC_ prefix so it is also available in the browser bundle.

const DEFAULT_REMOTE_HOSTS = "diplmasiltd.net,www.diplmasiltd.net";

export function getRemoteHosts(): string[] {
  const raw = process.env.NEXT_PUBLIC_REMOTE_HOSTS ?? DEFAULT_REMOTE_HOSTS;
  return raw
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
}

/** Lowercase a host and drop any :port suffix. */
export function normalizeHost(host?: string | null): string {
  if (!host) return "";
  return host.trim().toLowerCase().replace(/:\d+$/, "");
}

/**
 * True when the request host is one of the configured public hostnames
 * (subdomains included).
 */
export function isRemoteHost(host?: string | null): boolean {
  const h = normalizeHost(host);
  if (!h) return false;
  return getRemoteHosts().some((remote) => h === remote || h.endsWith(`.${remote}`));
}

/**
 * Read-only mode for a given host. Also honours the legacy READ_ONLY=true env
 * (used by the old online/Vercel mirror) so either switch can force it.
 */
export function isReadOnly(host?: string | null): boolean {
  return process.env.READ_ONLY === "true" || isRemoteHost(host);
}
