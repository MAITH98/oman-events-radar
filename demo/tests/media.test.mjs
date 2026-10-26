// Server-side fetching of preview images is an SSRF boundary: these are the refusals that must hold.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkPublicUrl, isBlockedAddress } from "../app/features/media/publicFetch.server.ts";
import { extractPreviewImage } from "../app/features/media/extractPreview.ts";

test("private, loopback, link-local, metadata and mapped addresses are blocked", () => {
  for (const a of ["127.0.0.1", "10.1.2.3", "172.16.0.9", "192.168.1.1", "169.254.169.254", "100.64.0.1", "0.0.0.0",
    "::1", "::", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1", "not-an-ip"]) {
    assert.equal(isBlockedAddress(a), true, a);
  }
  for (const a of ["8.8.8.8", "151.101.1.69", "2606:4700::6810:84e5"]) assert.equal(isBlockedAddress(a), false, a);
});

test("IPv6 forms that carry an IPv4 address inside are blocked (IPv4-compatible, 6to4, NAT64, discard, site-local)", () => {
  for (const a of ["::7f00:1", "::ffff:a9fe:a9fe", "2002:a9fe:a9fe::", "64:ff9b::a9fe:a9fe", "64:ff9b:1::a9fe:a9fe", "100::1", "fec0::1"]) {
    assert.equal(isBlockedAddress(a), true, a);
  }
});

test("byteCache shares one load per key and forgets failures", async () => {
  const { byteCache } = await import("../app/features/media/byteCache.server.ts");
  const cache = byteCache();
  let loads = 0;
  const load = async () => (loads++, { body: new Uint8Array(3) });
  await Promise.all([cache("a", load), cache("a", load)]);
  await cache("a", load);
  assert.equal(loads, 1);
  let fails = 0;
  await cache("b", async () => (fails++, null));
  assert.equal(await cache("b", async () => (fails++, null)), null);
  assert.equal(fails, 1); // a failure is kept for a minute (no hammering), then retried
});

test("checkPublicUrl refuses unsafe URLs and hosts that resolve inward", async () => {
  const dns = (map) => async (host) => map[host] ?? ["93.184.216.34"];
  const resolve = dns({ "inside.example": ["10.0.0.5"], "mixed.example": ["93.184.216.34", "127.0.0.1"] });
  for (const bad of ["file:///etc/passwd", "ftp://example.com/a", "javascript:alert(1)", "http://user:pw@example.com/",
    "http://example.com:8080/", "http://localhost/", "http://127.0.0.1/", "http://[::1]/", "http://169.254.169.254/latest/",
    "http://inside.example/", "http://mixed.example/", "http://printer.local/", "not a url"]) {
    assert.equal(await checkPublicUrl(bad, resolve), null, bad);
  }
  assert.equal((await checkPublicUrl("https://www.example.com/img.jpg", resolve))?.hostname, "www.example.com");
});

test("extractPreviewImage reads og/twitter/image_src, resolves relative URLs, refuses non-http", () => {
  const page = "https://site.example/events/1";
  assert.equal(extractPreviewImage('<meta property="og:image" content="https://cdn.example/a.jpg">', page), "https://cdn.example/a.jpg");
  assert.equal(extractPreviewImage("<meta content='/img/b.png' property='og:image'>", page), "https://site.example/img/b.png");
  assert.equal(extractPreviewImage('<meta name="twitter:image" content="c.webp?x=1&amp;y=2">', page), "https://site.example/events/c.webp?x=1&y=2");
  assert.equal(extractPreviewImage('<link rel="image_src" href="//cdn.example/d.jpg">', page), "https://cdn.example/d.jpg");
  assert.equal(extractPreviewImage('<meta property="og:image" content="javascript:alert(1)">', page), null);
  assert.equal(extractPreviewImage('<meta property="og:image" content="data:image/png;base64,AAAA">', page), null);
  assert.equal(extractPreviewImage("<title>no image</title>", page), null);
});
