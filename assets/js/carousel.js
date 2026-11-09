/**
 * carousel.js
 *
 * Makes the service cards on the home page an interactive, smoothly sliding strip
 * with infinite looping, direct touch/mouse drag, previous and next controls,
 * and dot buttons underneath (one dot per service area).
 *
 * How it works:
 *  - Cards slide smoothly with native Cascading Style Sheets (CSS) scroll snapping
 *    and JavaScript assisted controls.
 *  - Infinite looping: Card sets are placed before and after the real cards so sliding
 *    past the last card smoothly moves to the first card, and sliding before the first
 *    card moves to the last card.
 *  - Active card and dot detection: The card closest to the visible horizontal center
 *    of the track is detected using real screen coordinates (getBoundingClientRect).
 *    The dot corresponding to the card number shown in the middle is highlighted,
 *    and the centered card receives an elevated active style.
 *  - Without JavaScript, the track remains a standard scrollable row and navigation
 *    buttons stay hidden, ensuring full accessibility.
 *
 * Responsibility split:
 *  - nearestIndex, scrollTargetFor, normalizeLoopIndex, closestLoopedTarget, and
 *    computeCenterOffset are pure functions (rigorously unit tested).
 *  - initCarousel reads the Document Object Model (DOM) elements and connects user events.
 */

/**
 * Finds which position is closest to a target. Used to decide which card is
 * in the middle of the strip. On a tie, the lower index wins.
 *
 * @param {number[]} positions Center of each card, measured in pixels.
 * @param {number} target The point to compare against (for example, the visible track center).
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

  let bestIndex = 0;
  let bestDistance = Math.abs(positions[0] - target);
  for (let i = 1; i < positions.length; i += 1) {
    const distance = Math.abs(positions[i] - target);
    if (distance < bestDistance) {
      bestIndex = i;
      bestDistance = distance;
    }
  }
  return bestIndex;
}

/**
 * Works out how far to scroll the strip so one card sits in the middle.
 *
 * @param {number} cardLeft Left edge of the card, measured from the strip's left edge.
 * @param {number} cardWidth Width of the card in pixels (0 or more).
 * @param {number} viewWidth Visible width of the strip in pixels (0 or more).
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
 * Wraps any whole number into the range of 0 to (total - 1), safely supporting
 * negative numbers, zero, and positive numbers for looping.
 *
 * @param {number} index Any whole number integer (can be negative or positive).
 * @param {number} total Total number of items (must be a positive integer).
 * @returns {number} A non-negative integer between 0 and total - 1.
 * @throws {TypeError} when index is not an integer.
 * @throws {RangeError} when total is not an integer greater than zero.
 */
export function normalizeLoopIndex(index, total) {
  if (!Number.isInteger(index)) {
    throw new TypeError("index must be an integer.");
  }
  if (!Number.isInteger(total) || total <= 0) {
    throw new RangeError("total must be a positive integer.");
  }
  return ((index % total) + total) % total;
}

/**
 * Finds which card in the multi-set looped strip is closest to the currently
 * active card index when a dot button is pressed. This makes sliding take the
 * shortest and smoothest path instead of jumping across the whole strip.
 *
 * @param {number} currentIndex Currently active card index in the looped strip.
 * @param {number} targetDot Index of the target dot (0 to totalCards - 1).
 * @param {number} totalCards Number of unique service cards (for example 7).
 * @param {number} [numSets=3] Number of repeated sets (default is 3: before clones, originals, after clones).
 * @returns {number} The closest card index in the looped strip.
 * @throws {TypeError} when inputs are not integers.
 * @throws {RangeError} when parameters are outside their valid ranges.
 */
export function closestLoopedTarget(currentIndex, targetDot, totalCards, numSets = 3) {
  if (!Number.isInteger(currentIndex)) {
    throw new TypeError("currentIndex must be an integer.");
  }
  if (!Number.isInteger(targetDot)) {
    throw new TypeError("targetDot must be an integer.");
  }
  if (!Number.isInteger(totalCards) || totalCards <= 0) {
    throw new RangeError("totalCards must be a positive integer.");
  }
  if (!Number.isInteger(numSets) || numSets <= 0) {
    throw new RangeError("numSets must be a positive integer.");
  }
  if (targetDot < 0 || targetDot >= totalCards) {
    throw new RangeError(`targetDot must be between 0 and ${totalCards - 1}.`);
  }

  let bestCandidate = targetDot;
  let minDifference = Infinity;

  for (let s = 0; s < numSets; s += 1) {
    const candidate = targetDot + s * totalCards;
    const difference = Math.abs(candidate - currentIndex);
    if (difference < minDifference) {
      minDifference = difference;
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}

/**
 * Computes how many pixels a card center deviates from the track center.
 * A positive result means the card is to the right of the center.
 * A negative result means the card is to the left of the center.
 *
 * @param {{ left: number, width: number }} cardRect Bounding rectangle of the card.
 * @param {{ left: number, width: number }} trackRect Bounding rectangle of the track.
 * @returns {number} Distance in pixels from track center to card center.
 * @throws {TypeError} when rectangles are missing or contain non-finite numbers.
 * @throws {RangeError} when widths are negative.
 */
export function computeCenterOffset(cardRect, trackRect) {
  if (!cardRect || !trackRect) {
    throw new TypeError("cardRect and trackRect must be objects with left and width.");
  }
  const { left: cardLeft, width: cardWidth } = cardRect;
  const { left: trackLeft, width: trackWidth } = trackRect;
  for (const value of [cardLeft, cardWidth, trackLeft, trackWidth]) {
    if (!Number.isFinite(value)) {
      throw new TypeError("left and width must be finite numbers.");
    }
  }
  if (cardWidth < 0 || trackWidth < 0) {
    throw new RangeError("width must not be negative.");
  }

  const cardCenter = cardLeft + cardWidth / 2;
  const trackCenter = trackLeft + trackWidth / 2;
  return cardCenter - trackCenter;
}

/**
 * Connects the scrolling strip, navigation arrows, dot buttons, keyboard,
 * and mouse dragging with seamless looping and middle-card dot synchronization.
 *
 * @param {HTMLElement} root The carousel wrapper element.
 * @param {HTMLElement} track The scrolling container holding the cards.
 * @param {HTMLElement} dotsGroup The element containing one dot button per card.
 * @throws {Error} when cards and dots counts do not match.
 */
export function initCarousel(root, track, dotsGroup) {
  const originalCards = Array.from(track.querySelectorAll(":scope > .card"));
  const dots = Array.from(dotsGroup.querySelectorAll(".carousel-dot"));
  const totalCards = originalCards.length;

  if (totalCards === 0 || totalCards !== dots.length) {
    throw new Error(`The carousel has ${totalCards} cards but ${dots.length} dots; they must match.`);
  }

  // Tag original cards with their zero-based service index
  originalCards.forEach((card, index) => {
    card.dataset.cardIndex = String(index);
  });

  // Create prefix clones (before original cards) for seamless backward looping
  const prefixClones = originalCards.map((card) => {
    const clone = card.cloneNode(true);
    clone.classList.add("carousel-clone");
    clone.setAttribute("aria-hidden", "true");
    clone.querySelectorAll("a, button, input").forEach((element) => {
      element.setAttribute("tabindex", "-1");
    });
    return clone;
  });

  // Create suffix clones (after original cards) for seamless forward looping
  const suffixClones = originalCards.map((card) => {
    const clone = card.cloneNode(true);
    clone.classList.add("carousel-clone");
    clone.setAttribute("aria-hidden", "true");
    clone.querySelectorAll("a, button, input").forEach((element) => {
      element.setAttribute("tabindex", "-1");
    });
    return clone;
  });

  // Prepend prefix clones and append suffix clones into the scrolling track
  prefixClones.forEach((clone) => track.insertBefore(clone, originalCards[0]));
  suffixClones.forEach((clone) => track.appendChild(clone));

  // The track now contains 3 full sets: [Prefix Clones (0..N-1)], [Originals (N..2N-1)], [Suffix Clones (2N..3N-1)]
  const allCards = Array.from(track.querySelectorAll(":scope > .card"));
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // Calculates the physical pixel distance of one full cycle of cards
  const getCycleWidth = () => {
    if (allCards.length < totalCards * 2) return 0;
    return allCards[totalCards].offsetLeft - allCards[0].offsetLeft;
  };

  let isProgrammaticScroll = false;
  let scrollSettledTimer = null;

  /**
   * Silently resets the scroll position to the matching card in the middle
   * set (the original cards) whenever the user reaches the outer cloned sets.
   */
  const checkSilentRecenter = () => {
    const cycleWidth = getCycleWidth();
    if (cycleWidth <= 0) return;

    const trackRect = track.getBoundingClientRect();
    const trackCenter = trackRect.left + trackRect.width / 2;
    const cardCenters = allCards.map((card) => {
      const rect = card.getBoundingClientRect();
      return rect.left + rect.width / 2;
    });

    const activeIndex = nearestIndex(cardCenters, trackCenter);

    // If the active card is in the prefix clones (index < totalCards), shift forward to the middle set
    if (activeIndex < totalCards) {
      const previousBehavior = track.style.scrollBehavior;
      track.style.scrollBehavior = "auto";
      track.scrollLeft += cycleWidth;
      track.style.scrollBehavior = previousBehavior;
      updateActiveVisuals();
    }
    // If the active card is in the suffix clones (index >= 2 * totalCards), shift backward to the middle set
    else if (activeIndex >= totalCards * 2) {
      const previousBehavior = track.style.scrollBehavior;
      track.style.scrollBehavior = "auto";
      track.scrollLeft -= cycleWidth;
      track.style.scrollBehavior = previousBehavior;
      updateActiveVisuals();
    }
  };

  /**
   * Smoothly slides to any card in the strip by index.
   */
  const scrollToCard = (cardIndex, behavior = "smooth") => {
    // Clamp to valid range inside allCards
    const targetIndex = Math.max(0, Math.min(allCards.length - 1, cardIndex));
    const targetCard = allCards[targetIndex];
    if (!targetCard) return;

    isProgrammaticScroll = true;
    const targetLeft = scrollTargetFor(targetCard.offsetLeft, targetCard.offsetWidth, track.clientWidth);
    const scrollMode = reducedMotion.matches ? "auto" : behavior;

    track.scrollTo({
      left: targetLeft,
      behavior: scrollMode,
    });

    if (scrollSettledTimer !== null) {
      clearTimeout(scrollSettledTimer);
    }

    const duration = scrollMode === "smooth" ? 400 : 50;
    scrollSettledTimer = setTimeout(() => {
      isProgrammaticScroll = false;
      checkSilentRecenter();
    }, duration);
  };

  let updateScheduled = false;

  /**
   * Finds the card whose center is closest to the visible track center,
   * highlights its corresponding dot, and applies the active style to the card.
   */
  const updateActiveVisuals = () => {
    updateScheduled = false;
    const trackRect = track.getBoundingClientRect();
    const trackCenter = trackRect.left + trackRect.width / 2;

    const cardCenters = allCards.map((card) => {
      const rect = card.getBoundingClientRect();
      return rect.left + rect.width / 2;
    });

    const activeInAll = nearestIndex(cardCenters, trackCenter);
    const activeCard = allCards[activeInAll];
    const activeServiceIndex = activeCard ? parseInt(activeCard.dataset.cardIndex, 10) : 0;

    // Highlight the dot corresponding to the card currently in the middle
    dots.forEach((dot, index) => {
      if (index === activeServiceIndex) {
        dot.setAttribute("aria-current", "true");
      } else {
        dot.removeAttribute("aria-current");
      }
    });

    // Highlight the active card in the center and un-highlight the others
    allCards.forEach((card, index) => {
      if (index === activeInAll) {
        card.classList.add("is-active");
      } else {
        card.classList.remove("is-active");
      }
    });
  };

  const scheduleUpdate = () => {
    if (updateScheduled) return;
    updateScheduled = true;
    window.requestAnimationFrame(updateActiveVisuals);

    if (!isProgrammaticScroll) {
      if (scrollSettledTimer !== null) clearTimeout(scrollSettledTimer);
      scrollSettledTimer = setTimeout(checkSilentRecenter, 150);
    }
  };

  // Dot button click: slide smoothly to the closest matching card
  dots.forEach((dot, dotIndex) => {
    dot.addEventListener("click", () => {
      const trackRect = track.getBoundingClientRect();
      const trackCenter = trackRect.left + trackRect.width / 2;
      const cardCenters = allCards.map((card) => {
        const rect = card.getBoundingClientRect();
        return rect.left + rect.width / 2;
      });
      const currentActive = nearestIndex(cardCenters, trackCenter);
      const targetCardIndex = closestLoopedTarget(currentActive, dotIndex, totalCards, 3);
      scrollToCard(targetCardIndex, "smooth");
    });
  });

  // Previous and Next buttons (navigation arrows)
  const prevButton = root.querySelector("#service-prev");
  const nextButton = root.querySelector("#service-next");
  const navBar = root.querySelector("#service-nav-bar");

  const getCurrentActiveIndex = () => {
    const trackRect = track.getBoundingClientRect();
    const trackCenter = trackRect.left + trackRect.width / 2;
    const cardCenters = allCards.map((card) => {
      const rect = card.getBoundingClientRect();
      return rect.left + rect.width / 2;
    });
    return nearestIndex(cardCenters, trackCenter);
  };

  if (prevButton) {
    prevButton.addEventListener("click", () => {
      const active = getCurrentActiveIndex();
      scrollToCard(active - 1, "smooth");
    });
  }

  if (nextButton) {
    nextButton.addEventListener("click", () => {
      const active = getCurrentActiveIndex();
      scrollToCard(active + 1, "smooth");
    });
  }

  // Keyboard controls: ArrowLeft moves to previous card, ArrowRight moves to next card
  track.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      const active = getCurrentActiveIndex();
      scrollToCard(active - 1, "smooth");
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      const active = getCurrentActiveIndex();
      scrollToCard(active + 1, "smooth");
    }
  });

  // Mouse drag-to-scroll support for desktop
  let isPointerDragging = false;
  let dragStartX = 0;
  let dragStartScrollLeft = 0;
  let dragMoved = false;

  track.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return; // Only respond to primary left mouse button
    isPointerDragging = true;
    dragMoved = false;
    dragStartX = event.pageX;
    dragStartScrollLeft = track.scrollLeft;
    track.classList.add("is-dragging");
  });

  window.addEventListener("mousemove", (event) => {
    if (!isPointerDragging) return;
    const deltaX = event.pageX - dragStartX;
    if (Math.abs(deltaX) > 4) {
      dragMoved = true;
    }
    track.scrollLeft = dragStartScrollLeft - deltaX;
  });

  const stopPointerDrag = () => {
    if (!isPointerDragging) return;
    isPointerDragging = false;
    track.classList.remove("is-dragging");

    if (dragMoved) {
      // Snap smoothly to the nearest card on release
      const active = getCurrentActiveIndex();
      scrollToCard(active, "smooth");
    }
  };

  window.addEventListener("mouseup", stopPointerDrag);

  // Prevent link click if the user was dragging the card
  track.addEventListener(
    "click",
    (event) => {
      if (dragMoved) {
        event.preventDefault();
        event.stopPropagation();
        dragMoved = false;
      }
    },
    true,
  );

  // Clicking an inactive card peeking in from the side brings it smoothly to the center
  allCards.forEach((card, index) => {
    card.addEventListener("click", () => {
      if (!card.classList.contains("is-active") && !dragMoved) {
        scrollToCard(index, "smooth");
      }
    });
  });

  track.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);

  // Reveal JavaScript-enabled controls
  root.classList.add("is-ready");
  dotsGroup.hidden = false;
  if (navBar) navBar.hidden = false;
  if (prevButton) prevButton.hidden = false;
  if (nextButton) nextButton.hidden = false;

  // Initialize track scroll position to the first original card (index totalCards)
  const initialCard = allCards[totalCards];
  if (initialCard) {
    track.scrollLeft = scrollTargetFor(initialCard.offsetLeft, initialCard.offsetWidth, track.clientWidth);
  }

  updateActiveVisuals();
}
