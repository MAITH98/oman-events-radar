import { lookup as lookupCallback, type LookupAddress } from "node:dns";
import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { BlockList, isIP } from "node:net";

/*
 * Fetching pages and images from other sites on the server (SSRF boundary).
 * Every URL here ultimately comes from third-party content (an event page's og:image), so nothing is trusted:
 *   - http(s) only, default ports only, no credentials in the URL
 *   - the host must resolve only to public addresses (private, loopback, link-local, CGNAT, multicast … refused)
 *   - redirects are followed by hand (max 3) and every hop is checked again
 *   - the connection itself resolves through `guardedLookup`, so the socket only ever opens to an address that passed
 *     the same check (no gap between "checked" and "connected" for a rebinding DNS answer to slip through)
 *   - hard time and size limits, at most a few requests at once; the body is read into memory, never written anywhere
 */

const BLOCKED = new BlockList();
for (const [net, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24],
  ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) BLOCKED.addSubnet(net, prefix, "ipv4");
for (const [net, prefix] of [
  ["::", 128], ["::1", 128], ["fc00::", 7], ["fe80::", 10], ["fec0::", 10], ["ff00::", 8], ["2001:db8::", 32],
  // ranges that carry an IPv4 address inside (could lead back to a private IPv4 host): IPv4-compatible, NAT64, 6to4
  ["::", 96], ["64:ff9b::", 96], ["64:ff9b:1::", 48], ["2002::", 16], ["100::", 64],
] as const) BLOCKED.addSubnet(net, prefix, "ipv6");

/** True for any address a server must never be steered to (incl. IPv4-mapped IPv6 such as ::ffff:127.0.0.1). */
export function isBlockedAddress(address: string): boolean {
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (mapped) return BLOCKED.check(mapped[1], "ipv4");
  const family = isIP(address);
  if (family === 4) return BLOCKED.check(address, "ipv4");
  if (family === 6) return BLOCKED.check(address, "ipv6");
  return true;
}

export type Resolver = (host: string) => Promise<string[]>;
const dnsResolver: Resolver = async (host) => (await lookup(host, { all: true, verbatim: true })).map((a) => a.address);

/** The URL if it is safe to request from the server, else null. */
export async function checkPublicUrl(raw: string, resolve: Resolver = dnsResolver): Promise<URL | null> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  if (url.port && url.port !== "80" && url.port !== "443") return null;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return null;
  let addresses: string[];
  try {
    addresses = isIP(host) ? [host] : await resolve(host);
  } catch {
    return null;
  }
  if (!addresses.length || addresses.some(isBlockedAddress)) return null;
  return url;
}

const UA = "OmanEventsRadarDemo/1.0 (+link preview; https://github.com/MAITH98/oman-events-radar)";

/** dns.lookup for the actual connection: refuses (with an error) if any answer is a blocked address. */
function guardedLookup(hostname: string, options: { all?: boolean }, callback: (...args: unknown[]) => void) {
  lookupCallback(hostname, { all: true, verbatim: true }, (err, addresses: LookupAddress[]) => {
    if (err) return callback(err);
    if (!addresses.length || addresses.some((a) => isBlockedAddress(a.address))) return callback(new Error("blocked address"));
    if (options?.all) return callback(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
}

// at most a few outbound requests at once, whatever the incoming traffic
const MAX_PARALLEL = 6;
let running = 0;
const waiting: (() => void)[] = [];
async function slot<T>(work: () => Promise<T>): Promise<T> {
  if (running >= MAX_PARALLEL) await new Promise<void>((r) => waiting.push(r));
  running++;
  try {
    return await work();
  } finally {
    running--;
    waiting.shift()?.();
  }
}

function get(url: URL, signal: AbortSignal): Promise<http.IncomingMessage> {
  return new Promise((resolve, reject) => {
    const mod = url.protocol === "https:" ? https : http;
    const req = mod.request(url, {
      method: "GET",
      signal,
      lookup: guardedLookup as unknown as typeof lookupCallback,
      headers: { "User-Agent": UA, Accept: "text/html,image/*;q=0.9,*/*;q=0.5", "Accept-Encoding": "identity" },
    }, resolve);
    req.on("error", reject);
    req.end();
  });
}

export interface FetchedBody {
  url: URL;
  contentType: string;
  body: Uint8Array;
}

/**
 * GET a public URL with every hop checked. Returns null on any refusal, error, timeout or oversize body.
 * `accept` filters the response by content type before the body is read.
 */
export async function fetchPublic(
  raw: string,
  { maxBytes, timeoutMs, accept, resolve }: { maxBytes: number; timeoutMs: number; accept: (contentType: string) => boolean; resolve?: Resolver },
): Promise<FetchedBody | null> {
  return slot(async () => {
    const signal = AbortSignal.timeout(timeoutMs);
    let current = raw;
    for (let hop = 0; hop <= 3; hop++) {
      const url = await checkPublicUrl(current, resolve);
      if (!url) return null;
      let res: http.IncomingMessage;
      try {
        res = await get(url, signal);
      } catch {
        return null;
      }
      const status = res.statusCode ?? 0;
      if (status >= 300 && status < 400) {
        const next = res.headers.location;
        res.resume();
        if (!next) return null;
        current = new URL(next, url).href;
        continue;
      }
      const contentType = (res.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
      const declared = Number(res.headers["content-length"] ?? "0");
      if (status < 200 || status >= 300 || !accept(contentType) || declared > maxBytes) {
        res.destroy();
        return null;
      }
      // read with a hard cap, whatever Content-Length claimed
      const chunks: Buffer[] = [];
      let size = 0;
      try {
        for await (const chunk of res as AsyncIterable<Buffer>) {
          size += chunk.byteLength;
          if (size > maxBytes) {
            res.destroy();
            return null;
          }
          chunks.push(chunk);
        }
      } catch {
        return null;
      }
      return { url, contentType, body: new Uint8Array(Buffer.concat(chunks, size)) };
    }
    return null; // too many redirects
  });
}
