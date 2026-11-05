/**
 * carousel.js
 *
 * Makes the service cards on the home page a sideways-sliding strip with a row
 * of dot buttons underneath (one dot per card).
 *
 * The sliding itself is plain CSS (scroll snapping), so swiping on a phone,
 * the arrow keys and the mouse wheel all work. This file only adds the dots:
 * it shows which card is in the middle, and moves to a card when its dot is pressed.
 *
 * Without JavaScript the dots stay hidden and the strip can still be scrolled.
 *
 * Responsibility split:
 *  - nearestIndex and scrollTargetFor are pure functions (unit tested).
 *  - initCarousel reads the page and wires events together.
 */

/**
 * Finds which position is closest to a target. Used to decide which card is
 * in the middle of the strip. On a tie, the lower index wins.
 * @param {number[]} positions Centre of each card, measured from the strip's left edge.
 * @param {number} target The point to compare against (the strip's visible centre).
 * @returns {number} Index of the closest position.
 * @throws {TypeError} when `positions` is not a non-empty array of finite numbers,
 *   or `target` is not a finite number.
 */
export function nearestIndex(positions, target) {
  if (!Array.isArray(positions) || positions.length === 0) {
    throw new TypeError("positions must be a non-empty array.");
  }
  if (!positions.every(Number.isFinite)) {
    throw new TypeError("every position must be a finite number.");
  }
  if (!Number.isFinite(target)) {
    throw new TypeError("target must be a finite number.");
  }

  let best = 0;
  let bestDistance = Math.abs(positions[0] - target);
  for (let i = 1; i < positions.length; i += 1) {
    const distance = Math.abs(positions[i] - target);
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * Works out how far to scroll the strip so one card sits in the middle.
 * @param {number} cardLeft Left edge of the card, from the strip's left edge.
 * @param {number} cardWidth Width of the card (0 or more).
 * @param {number} viewWidth Visible width of the strip (0 or more).
 * @returns {number} The scroll position (never below 0).
 * @throws {TypeError} when a value is not a finite number.
 * @throws {RangeError} when a width is negative.
 */
export function scrollTargetFor(cardLeft, cardWidth, viewWidth) {
  for (const value of [cardLeft, cardWidth, viewWidth]) {
    if (!Number.isFinite(value)) {
      throw new TypeError("cardLeft, cardWidth and viewWidth must be finite numbers.");
    }
  }
  if (cardWidth < 0 || viewWidth < 0) {
    throw new RangeError("cardWidth and viewWidth must not be negative.");
  }
  return Math.max(0, cardLeft - (viewWidth - cardWidth) / 2);
}

/**
 * Connects the strip and its dots.
 * @param {HTMLElement} root The carousel wrapper (gets the "is-ready" class).
 * @param {HTMLElement} track The scrolling strip that holds the cards.
 * @param {HTMLElement} dotsGroup The element that holds one dot button per card.
 * @throws {Error} when the number of cards and dots differ, so the mistake is seen at start-up.
 */
export function initCarousel(root, track, dotsGroup) {
  const cards = Array.from(track.querySelectorAll(":scope > .card"));
  const dots = Array.from(dotsGroup.querySelectorAll(".carousel-dot"));
  if (cards.length === 0 || cards.length !== dots.length) {
    throw new Error(`The carousel has ${cards.length} cards but ${dots.length} dots; they must match.`);
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let waiting = false;

  const showActive = () => {
    waiting = false;
    const centres = cards.map((card) => card.offsetLeft + card.offsetWidth / 2);
    const active = nearestIndex(centres, track.scrollLeft + track.clientWidth / 2);
    dots.forEach((dot, index) => {
      if (index === active) dot.setAttribute("aria-current", "true");
      else dot.removeAttribute("aria-current");
    });
  };

  // Scrolling fires many events; update at most once per screen refresh.
  const scheduleUpdate = () => {
    if (waiting) return;
    waiting = true;
    window.requestAnimationFrame(showActive);
  };

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      const card = cards[index];
      track.scrollTo({
        left: scrollTargetFor(card.offsetLeft, card.offsetWidth, track.clientWidth),
        behavior: reducedMotion.matches ? "auto" : "smooth",
      });
    });
  });

  track.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);

  root.classList.add("is-ready");
  dotsGroup.hidden = false;
  showActive();
}
