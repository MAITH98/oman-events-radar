// Negative tests: stored preferences and calendar month parameters.
// Run with: npm test   (Node's built-in runner; Node ≥ 22.18 loads the .ts modules directly)
import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePrefs } from "../app/shared/preferences.ts";
import { readMonth } from "../app/features/events/calendar.ts";

test("stored preferences: only known values are used, anything else falls back to the defaults", () => {
  assert.deepEqual(parsePrefs("ar.light"), { lang: "ar", theme: "light" });
  for (const bad of ["", null, undefined, "fr.blue", "<script>.dark", "ar", "..."]) {
    const p = parsePrefs(bad);
    assert.ok(["en", "ar"].includes(p.lang) && ["dark", "light"].includes(p.theme), String(bad));
  }
  assert.deepEqual(parsePrefs("xx.light"), { lang: "en", theme: "light" });
});

test("readMonth accepts 1900–2199 and falls back to today otherwise", () => {
  const m = (v) => readMonth(new URLSearchParams(v === undefined ? "" : `month=${v}`), "2026-10-26");
  assert.equal(m("2026-11"), "2026-11");
  for (const bad of ["0050-01", "1899-12", "2200-01", "2026-13", "2026-1", "abc", undefined]) assert.equal(m(bad), "2026-10", String(bad));
});

