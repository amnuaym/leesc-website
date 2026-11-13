/**
 * Tests for assets/js/analytics-logic.js
 * Run with:  npm test
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  GA_MEASUREMENT_ID,
  CATEGORIES,
  OPTIONAL_CATEGORIES,
  isValidMeasurementId,
  makeConsent,
  acceptAll,
  declineAll,
  parseConsent,
  serializeConsent,
  decideAnalytics,
  classifyLink,
} from "../assets/js/analytics-logic.js";

test("analytics ships off or with a valid ID, never a malformed one", () => {
  assert.ok(GA_MEASUREMENT_ID === "" || isValidMeasurementId(GA_MEASUREMENT_ID));
});

test("isValidMeasurementId accepts GA4 IDs and rejects everything else", () => {
  assert.equal(isValidMeasurementId("G-AB12CD34EF"), true);
  for (const bad of ["", "g-ab12cd34ef", "UA-12345-1", "G-", "G-12", " G-AB12CD34EF", null, undefined, 42]) {
    assert.equal(isValidMeasurementId(bad), false, String(bad));
  }
});

test("necessary is always listed and never optional", () => {
  assert.ok(CATEGORIES.includes("necessary"));
  assert.equal(OPTIONAL_CATEGORIES.includes("necessary"), false);
});

test("nothing is on unless clearly true", () => {
  assert.deepEqual(makeConsent(), { analytics: false, marketing: false });
  assert.deepEqual(makeConsent({ analytics: "yes", marketing: 1 }), { analytics: false, marketing: false });
  assert.deepEqual(makeConsent({ analytics: true }), { analytics: true, marketing: false });
  assert.deepEqual(acceptAll(), { analytics: true, marketing: true });
  assert.deepEqual(declineAll(), { analytics: false, marketing: false });
});

test("a saved choice survives a round trip", () => {
  for (const consent of [acceptAll(), declineAll(), makeConsent({ marketing: true })]) {
    assert.deepEqual(parseConsent(serializeConsent(consent)), consent);
  }
});

test("older saved values still work, and bad values mean no choice", () => {
  assert.deepEqual(parseConsent("accepted"), { analytics: true, marketing: false });
  assert.deepEqual(parseConsent("declined"), { analytics: false, marketing: false });
  for (const bad of [null, undefined, "", "yes", "{bad", "null", '{"v":2,"analytics":true}', '{"analytics":true}', 7]) {
    assert.equal(parseConsent(bad), null, String(bad));
  }
});

test("decideAnalytics: nothing loads without a valid ID or without permission", () => {
  const id = "G-AB12CD34EF";
  assert.equal(decideAnalytics("", acceptAll()), "off");
  assert.equal(decideAnalytics("bad", acceptAll()), "off");
  assert.equal(decideAnalytics(id, null), "ask");
  assert.equal(decideAnalytics(id, declineAll()), "silent");
  assert.equal(decideAnalytics(id, makeConsent({ marketing: true })), "silent");
  assert.equal(decideAnalytics(id, makeConsent({ analytics: true })), "load");
  assert.equal(decideAnalytics(id, acceptAll()), "load");
});

test("classifyLink names only email, LINE and contact-button clicks", () => {
  assert.equal(classifyLink("mailto:info@leesc.in"), "email_click");
  assert.equal(classifyLink("MAILTO:info@leesc.in"), "email_click");
  assert.equal(classifyLink("https://line.me/R/ti/p/@jey9134y"), "line_click");
  for (const cta of ["#contact", "../index.html#contact", "/index.html#contact"]) {
    assert.equal(classifyLink(cta), "contact_cta_click", cta);
  }
  for (const other of ["/privacy.html", "https://example.com", "https://evil.com/line.me/", "#contacts", "#services", "", null, undefined]) {
    assert.equal(classifyLink(other), null, String(other));
  }
});
