/**
 * Tests for the English / Thai rules in language.js (the saved choice and the
 * browser-language detection used by the root page and the 404 page).
 * The generated /th/ and /en/ pages are tested in language-split.test.mjs.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { chooseLanguage, nextLanguage, detectLanguage, LANGUAGES, DEFAULT_LANGUAGE, LANGUAGE_STORAGE_KEY } from "../assets/js/language.js";

/* ------------------------------ language.js ------------------------------ */

test("chooseLanguage keeps supported codes and falls back to the default otherwise", () => {
  assert.deepEqual([...LANGUAGES], ["en", "th"]);
  assert.equal(DEFAULT_LANGUAGE, "th", "Thai is the default on first visit");
  assert.equal(chooseLanguage("th"), "th");
  assert.equal(chooseLanguage("en"), "en");
  for (const bad of [null, undefined, "", "fr", "TH", 5, {}]) {
    assert.equal(chooseLanguage(bad), DEFAULT_LANGUAGE, String(bad));
  }
});

test("nextLanguage switches between English and Thai", () => {
  assert.equal(nextLanguage("en"), "th");
  assert.equal(nextLanguage("th"), "en");
});

test("nextLanguage rejects unknown languages", () => {
  for (const bad of ["fr", "", null, undefined]) {
    assert.throws(() => nextLanguage(bad), TypeError, String(bad));
  }
});

test("detectLanguage: a saved choice wins over the browser's language list", () => {
  assert.equal(detectLanguage("en", ["th-TH", "th"]), "en");
  assert.equal(detectLanguage("th", ["en-US"]), "th");
});

test("detectLanguage: without a saved choice the first supported browser language wins", () => {
  assert.equal(detectLanguage(null, ["th-TH", "en-US"]), "th");
  assert.equal(detectLanguage(null, ["th"]), "th");
  assert.equal(detectLanguage(null, ["en-GB", "th"]), "en");
  assert.equal(detectLanguage(null, ["fr-FR", "TH-th"]), "th", "skips unsupported languages, ignores case");
});

test("detectLanguage: anything unusable falls back to English", () => {
  for (const saved of [null, undefined, "", "fr", "TH", 5]) {
    assert.equal(detectLanguage(saved, []), "en", `saved ${String(saved)}`);
  }
  for (const browser of [undefined, null, "th", {}, [], ["fr-FR", "de"], [null, 5, ""]]) {
    assert.equal(detectLanguage(null, browser), "en", JSON.stringify(browser));
  }
});

test("the saved-choice key is unchanged, so choices saved before the split still work", () => {
  assert.equal(LANGUAGE_STORAGE_KEY, "site-language");
});
