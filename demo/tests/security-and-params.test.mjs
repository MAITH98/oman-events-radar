// Negative tests for the audit fixes (L1 open redirect, L2 cross-site posts, L3 calendar years).
// Run with: npm test   (Node's built-in runner; Node ≥ 22.18 loads the .ts modules directly)
import { test } from "node:test";
import assert from "node:assert/strict";
import { isCrossSitePost, safeReturnPath } from "../app/shared/preferences.ts";
import { readMonth } from "../app/features/events/calendar.ts";

test("safeReturnPath keeps same-site paths", () => {
  assert.equal(safeReturnPath("/calendar?month=2026-11#agenda"), "/calendar?month=2026-11#agenda");
  assert.equal(safeReturnPath("/"), "/");
});

test("safeReturnPath refuses anything that would leave the site", () => {
  for (const bad of ["//evil.example", "/\t/evil.example", "/\n/evil.example", "/\r/evil.example", "/\\evil.example",
    "\\\\evil.example", "https://evil.example", "javascript:alert(1)", "evil.example", "", null, 42]) {
    assert.equal(safeReturnPath(bad), "/", JSON.stringify(bad));
  }
});

test("isCrossSitePost refuses other sites and allows this one", () => {
  const h = (o) => new Headers(o);
  assert.equal(isCrossSitePost(h({ "Sec-Fetch-Site": "cross-site" })), true);
  assert.equal(isCrossSitePost(h({ "Sec-Fetch-Site": "same-origin" })), false);
  assert.equal(isCrossSitePost(h({ Origin: "https://attacker.example", Host: "radar.example" })), true);
  assert.equal(isCrossSitePost(h({ Origin: "null", Host: "radar.example" })), true);
  assert.equal(isCrossSitePost(h({ Origin: "https://radar.example", Host: "radar.example" })), false);
  assert.equal(isCrossSitePost(h({})), false);
});

test("readMonth accepts 1900–2199 and falls back to today otherwise", () => {
  const m = (v) => readMonth(new URLSearchParams(v === undefined ? "" : `month=${v}`), "2026-10-26");
  assert.equal(m("2026-11"), "2026-11");
  for (const bad of ["0050-01", "1899-12", "2200-01", "2026-13", "2026-1", "abc", undefined]) assert.equal(m(bad), "2026-10", String(bad));
});

// Regression (theme/language switch showed the old page): preference-dependent pages must never be reusable
// without asking the server, and must vary by the cookie.
import { PAGE_HEADERS } from "../app/shared/http.ts";
test("page headers never allow stale or shared copies of preference-dependent pages", () => {
  assert.match(PAGE_HEADERS["Cache-Control"], /\bno-cache\b|\bno-store\b/);
  assert.doesNotMatch(PAGE_HEADERS["Cache-Control"], /\bpublic\b|max-age=[1-9]|stale-while-revalidate/);
  assert.match(PAGE_HEADERS.Vary, /\bCookie\b/);
});
