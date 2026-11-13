/**
 * Tests for assets/js/analytics-logic.js
 * Run with:  npm test
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  GA_MEASUREMENT_ID,
  isValidMeasurementId,
  readConsent,
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

test("readConsent accepts only the two saved choices", () => {
  assert.equal(readConsent("accepted"), "accepted");
  assert.equal(readConsent("declined"), "declined");
  for (const bad of [null, undefined, "", "yes", "ACCEPTED", 1]) assert.equal(readConsent(bad), null);
});

test("decideAnalytics: nothing loads without a valid ID or without acceptance", () => {
  const id = "G-AB12CD34EF";
  assert.equal(decideAnalytics("", "accepted"), "off");
  assert.equal(decideAnalytics("bad", "accepted"), "off");
  assert.equal(decideAnalytics(id, null), "ask");
  assert.equal(decideAnalytics(id, "garbage"), "ask");
  assert.equal(decideAnalytics(id, "declined"), "silent");
  assert.equal(decideAnalytics(id, "accepted"), "load");
});

test("classifyLink names only email and LINE clicks", () => {
  assert.equal(classifyLink("mailto:info@leesc.in"), "email_click");
  assert.equal(classifyLink("MAILTO:info@leesc.in"), "email_click");
  assert.equal(classifyLink("https://line.me/R/ti/p/@jey9134y"), "line_click");
  for (const other of ["/privacy.html", "https://example.com", "https://evil.com/line.me/", "", null, undefined]) {
    assert.equal(classifyLink(other), null, String(other));
  }
});
