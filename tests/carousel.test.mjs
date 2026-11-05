/**
 * Tests for assets/js/carousel.js (the sliding service cards and their dots).
 * The two pure functions are tested directly with real numbers, including
 * extreme and invalid input. The page wiring is checked in site.test.mjs
 * (markup) and by opening the real page in a browser.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { nearestIndex, scrollTargetFor } from "../assets/js/carousel.js";

test("nearestIndex picks the card whose centre is closest to the target", () => {
  const centres = [200, 620, 1040, 1460];
  assert.equal(nearestIndex(centres, 200), 0);
  assert.equal(nearestIndex(centres, 700), 1);
  assert.equal(nearestIndex(centres, 1300), 3);
});

test("nearestIndex handles a single card and targets far outside the strip", () => {
  assert.equal(nearestIndex([50], 9999), 0);
  assert.equal(nearestIndex([100, 200, 300], -1e9), 0);
  assert.equal(nearestIndex([100, 200, 300], 1e9), 2);
});

test("nearestIndex returns the lower index on an exact tie", () => {
  assert.equal(nearestIndex([100, 200], 150), 0);
});

test("nearestIndex works with decimals and negative positions", () => {
  assert.equal(nearestIndex([-30.5, 0.25, 40.75], 0), 1);
});

test("nearestIndex rejects empty or non-array positions", () => {
  for (const bad of [[], null, undefined, "abc", 5, {}]) {
    assert.throws(() => nearestIndex(bad, 0), TypeError, String(bad));
  }
});

test("nearestIndex rejects positions or targets that are not finite numbers", () => {
  for (const bad of [NaN, Infinity, -Infinity, "1", null, undefined]) {
    assert.throws(() => nearestIndex([1, bad, 3], 0), TypeError, `position ${String(bad)}`);
    assert.throws(() => nearestIndex([1, 2, 3], bad), TypeError, `target ${String(bad)}`);
  }
});

test("scrollTargetFor centres a card in the view", () => {
  // Card 400 wide starting at 1000, in a view 1000 wide: left edge must sit 300 before the card.
  assert.equal(scrollTargetFor(1000, 400, 1000), 700);
  assert.equal(scrollTargetFor(500, 500, 500), 500);
});

test("scrollTargetFor never returns a negative scroll position", () => {
  assert.equal(scrollTargetFor(0, 300, 1000), 0);
  assert.equal(scrollTargetFor(50, 100, 5000), 0);
});

test("scrollTargetFor accepts zero widths", () => {
  assert.equal(scrollTargetFor(120, 0, 0), 120);
});

test("scrollTargetFor rejects values that are not finite numbers", () => {
  for (const bad of [NaN, Infinity, "5", null, undefined]) {
    assert.throws(() => scrollTargetFor(bad, 1, 1), TypeError);
    assert.throws(() => scrollTargetFor(1, bad, 1), TypeError);
    assert.throws(() => scrollTargetFor(1, 1, bad), TypeError);
  }
});

test("scrollTargetFor rejects negative widths", () => {
  assert.throws(() => scrollTargetFor(10, -1, 100), RangeError);
  assert.throws(() => scrollTargetFor(10, 100, -1), RangeError);
});
