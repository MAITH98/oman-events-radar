// Search matching shared by the suggestions and the calendar filter.
import { test } from "node:test";
import assert from "node:assert/strict";
import { matchRank, normalizeForSearch } from "../app/shared/search.ts";

test("normalisation ignores case, accents and Arabic letter variants", () => {
  assert.equal(normalizeForSearch("  Café  MUSCAT "), "cafe muscat");
  assert.equal(normalizeForSearch("أُمسية إبداع آمنة"), normalizeForSearch("امسيه ابداع امنه"));
  assert.equal(normalizeForSearch("مستشفى"), normalizeForSearch("مستشفي"));
  assert.equal(normalizeForSearch("عمـــان"), "عمان"); // tatweel removed
});

test("ranking: starts-with < word-start < contains < keyword-only; every word must match", () => {
  assert.equal(matchRank("Oman Health Exhibition", "oman"), 0);
  assert.equal(matchRank("Oman Health Exhibition", "health"), 1);
  assert.equal(matchRank("Oman Health Exhibition", "ealth"), 2);
  assert.equal(matchRank("COMEX 2027", "ocec", "Oman Convention & Exhibition Centre (OCEC)"), 3);
  assert.equal(matchRank("Oman Health Exhibition", "health oman"), 2);
  assert.equal(matchRank("Oman Health Exhibition", "health dubai"), null);
  assert.equal(matchRank("Oman Health Exhibition", "   "), null);
});
