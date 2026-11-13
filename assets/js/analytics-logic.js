/**
 * analytics-logic.js
 *
 * Pure rules for the cookie choice and Google Analytics. No page access, so
 * it can be tested directly with Node.js. Page wiring lives in analytics.js.
 *
 * Privacy rule: an optional category may load ONLY after the visitor allowed it.
 * No saved choice, a bad saved value, or an empty Measurement ID all mean
 * "do not load". Nothing is pre-ticked.
 */

/** Paste the Google Analytics 4 Measurement ID here (looks like G-AB12CD34EF). Empty = analytics is off. */
export const GA_MEASUREMENT_ID = "G-72SGPZZ711";

/** Key used to remember the visitor's choice in their own browser. */
export const CONSENT_STORAGE_KEY = "leesc-cookie-consent";

/**
 * Cookie categories. "necessary" is always on and cannot be switched off.
 * To add a future category (for example a marketing tool), add it here, add its
 * texts in analytics.js and the privacy notice, and load its tool only when
 * consent[id] is true.
 */
export const CATEGORIES = Object.freeze(["necessary", "analytics", "marketing"]);

/** The optional categories a visitor can choose. Everything starts OFF. */
export const OPTIONAL_CATEGORIES = Object.freeze(["analytics", "marketing"]);

/**
 * Builds a consent record. Anything not clearly true is false.
 * @param {Partial<Record<"analytics" | "marketing", unknown>>} [choices]
 * @returns {{analytics: boolean, marketing: boolean}}
 */
export function makeConsent(choices = {}) {
  const consent = {};
  for (const id of OPTIONAL_CATEGORIES) consent[id] = choices[id] === true;
  return consent;
}

/** "Accept all" and "Decline all". */
export const acceptAll = () => makeConsent({ analytics: true, marketing: true });
export const declineAll = () => makeConsent();

/**
 * Turns the saved text back into a consent record, or null when nothing valid
 * was saved. Also understands the two older saved values ("accepted" meant
 * analytics only; "declined" meant none).
 * @param {unknown} raw
 * @returns {{analytics: boolean, marketing: boolean} | null}
 */
export function parseConsent(raw) {
  if (raw === "accepted") return makeConsent({ analytics: true });
  if (raw === "declined") return declineAll();
  if (typeof raw !== "string") return null;
  try {
    const data = JSON.parse(raw);
    if (data === null || typeof data !== "object" || data.v !== 1) return null;
    return makeConsent(data);
  } catch {
    return null;
  }
}

/**
 * @param {{analytics: boolean, marketing: boolean}} consent
 * @returns {string} text to store in the browser
 */
export function serializeConsent(consent) {
  return JSON.stringify({ v: 1, ...makeConsent(consent) });
}

/**
 * True when the value looks like a GA4 Measurement ID.
 * @param {unknown} id
 * @returns {boolean}
 */
export function isValidMeasurementId(id) {
  return typeof id === "string" && /^G-[A-Z0-9]{6,12}$/.test(id);
}

/**
 * Decides what the page should do.
 *  - "off":    analytics is not configured; show nothing, load nothing.
 *  - "ask":    configured, no choice yet; show the banner, load nothing.
 *  - "load":   the visitor allowed analytics; load it.
 *  - "silent": the visitor chose, analytics not allowed; load nothing, do not ask again.
 * @param {string} measurementId
 * @param {{analytics: boolean} | null} consent
 * @returns {"off" | "ask" | "load" | "silent"}
 */
export function decideAnalytics(measurementId, consent) {
  if (!isValidMeasurementId(measurementId)) return "off";
  if (consent === null || consent === undefined) return "ask";
  return consent.analytics === true ? "load" : "silent";
}

/**
 * Names of the sales-relevant clicks we count, chosen from the link address.
 * Returns null for any other link, so ordinary clicks are never reported.
 * @param {string} href
 * @returns {"email_click" | "line_click" | "contact_cta_click" | null}
 */
export function classifyLink(href) {
  if (typeof href !== "string") return null;
  if (/^mailto:/i.test(href)) return "email_click";
  if (/^https:\/\/line\.me\//i.test(href)) return "line_click";
  if (/(^|\/|\.html)#contact$/i.test(href)) return "contact_cta_click";
  return null;
}
