/**
 * Tests for assets/js/carousel.js (the sliding service cards and their dots).
 * All pure functions are tested directly with real numbers and edge cases,
 * including negative inputs, out-of-bounds inputs, and invalid types.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  nearestIndex,
  scrollTargetFor,
  normalizeLoopIndex,
  closestLoopedTarget,
  computeCenterOffset,
} from "../assets/js/carousel.js";

/* ----------------------------- nearestIndex ------------------------------ */

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

/* ---------------------------- scrollTargetFor ----------------------------- */

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

/* -------------------------- normalizeLoopIndex ---------------------------- */

test("normalizeLoopIndex wraps non-negative indices correctly within range", () => {
  assert.equal(normalizeLoopIndex(0, 7), 0);
  assert.equal(normalizeLoopIndex(3, 7), 3);
  assert.equal(normalizeLoopIndex(6, 7), 6);
  assert.equal(normalizeLoopIndex(7, 7), 0);
  assert.equal(normalizeLoopIndex(14, 7), 0);
  assert.equal(normalizeLoopIndex(15, 7), 1);
});

test("normalizeLoopIndex wraps negative indices correctly backwards", () => {
  assert.equal(normalizeLoopIndex(-1, 7), 6);
  assert.equal(normalizeLoopIndex(-7, 7), 0);
  assert.equal(normalizeLoopIndex(-8, 7), 6);
  assert.equal(normalizeLoopIndex(-15, 7), 6);
  assert.equal(normalizeLoopIndex(-14, 7), 0);
});

test("normalizeLoopIndex handles large integers without overflow", () => {
  assert.equal(normalizeLoopIndex(1000000, 7), 1);
  assert.equal(normalizeLoopIndex(-1000000, 7), 6);
});

test("normalizeLoopIndex rejects non-integer indices and invalid totals", () => {
  for (const badIndex of [1.5, -2.3, "0", null, undefined, NaN, Infinity]) {
    assert.throws(() => normalizeLoopIndex(badIndex, 7), TypeError);
  }
  for (const badTotal of [0, -1, -7, 2.5, "7", null, undefined]) {
    assert.throws(() => normalizeLoopIndex(0, badTotal), Error);
  }
});

/* -------------------------- closestLoopedTarget --------------------------- */

test("closestLoopedTarget picks the closest instance of a target dot", () => {
  // 7 cards, 3 sets (indices 0..20). Originals are at 7..13.
  // When at index 8 (service 02), clicking dot 2 (service 03) should pick index 9 (distance 1)
  assert.equal(closestLoopedTarget(8, 2, 7, 3), 9);

  // When at index 13 (service 07 in middle set), clicking dot 0 (service 01):
  // Candidate in set 2 is 14 (distance 1), much closer than candidate in set 1 (7, distance 6)
  assert.equal(closestLoopedTarget(13, 0, 7, 3), 14);

  // When at index 7 (service 01 in middle set), clicking dot 6 (service 07):
  // Candidate in set 0 is 6 (distance 1), much closer than candidate in set 1 (13, distance 6)
  assert.equal(closestLoopedTarget(7, 6, 7, 3), 6);
});

test("closestLoopedTarget handles ties by choosing the earlier candidate", () => {
  // If currentIndex is 10.5 (midpoint between 7 and 14), candidates 7 and 14 are equidistant
  // But integer currentIndex: at 10, candidate 7 (diff 3) is closer than candidate 14 (diff 4)
  assert.equal(closestLoopedTarget(10, 0, 7, 3), 7);
});

test("closestLoopedTarget rejects invalid or out-of-range inputs", () => {
  assert.throws(() => closestLoopedTarget("7", 0, 7, 3), TypeError);
  assert.throws(() => closestLoopedTarget(7, "0", 7, 3), TypeError);
  assert.throws(() => closestLoopedTarget(7, -1, 7, 3), RangeError);
  assert.throws(() => closestLoopedTarget(7, 7, 7, 3), RangeError);
  assert.throws(() => closestLoopedTarget(7, 0, 0, 3), RangeError);
  assert.throws(() => closestLoopedTarget(7, 0, 7, 0), RangeError);
});

/* -------------------------- computeCenterOffset --------------------------- */

test("computeCenterOffset returns 0 when card and track centers match", () => {
  const cardRect = { left: 400, width: 200 }; // center = 500
  const trackRect = { left: 0, width: 1000 }; // center = 500
  assert.equal(computeCenterOffset(cardRect, trackRect), 0);
});

test("computeCenterOffset calculates positive offset for card to the right", () => {
  const cardRect = { left: 550, width: 200 }; // center = 650
  const trackRect = { left: 0, width: 1000 }; // center = 500
  assert.equal(computeCenterOffset(cardRect, trackRect), 150);
});

test("computeCenterOffset calculates negative offset for card to the left", () => {
  const cardRect = { left: 250, width: 200 }; // center = 350
  const trackRect = { left: 0, width: 1000 }; // center = 500
  assert.equal(computeCenterOffset(cardRect, trackRect), -150);
});

test("computeCenterOffset rejects invalid inputs", () => {
  for (const bad of [null, undefined, 5, "rect"]) {
    assert.throws(() => computeCenterOffset(bad, { left: 0, width: 100 }), TypeError);
    assert.throws(() => computeCenterOffset({ left: 0, width: 100 }, bad), TypeError);
  }
  assert.throws(() => computeCenterOffset({ left: 0, width: -10 }, { left: 0, width: 100 }), RangeError);
  assert.throws(() => computeCenterOffset({ left: 0, width: 100 }, { left: 0, width: -50 }), RangeError);
  assert.throws(() => computeCenterOffset({ left: NaN, width: 100 }, { left: 0, width: 100 }), TypeError);
});
