/**
 * analytics-logic.js
 *
 * Pure rules for the cookie choice and Google Analytics. No page access, so
 * it can be tested directly with Node.js. Page wiring lives in analytics.js.
 *
 * Privacy rule: analytics may load ONLY after the visitor has accepted.
 * No saved choice, a declined choice, a bad saved value, or an empty
 * Measurement ID all mean "do not load".
 */

/** Paste the Google Analytics 4 Measurement ID here (looks like G-AB12CD34EF). Empty = analytics is off. */
export const GA_MEASUREMENT_ID = "G-72SGPZZ711";

/** Key used to remember the visitor's choice in their own browser. */
export const CONSENT_STORAGE_KEY = "leesc-cookie-consent";

/** The only two valid saved choices. */
export const CONSENT_CHOICES = Object.freeze(["accepted", "declined"]);

/**
 * True when the value looks like a GA4 Measurement ID.
 * @param {unknown} id
 * @returns {boolean}
 */
export function isValidMeasurementId(id) {
  return typeof id === "string" && /^G-[A-Z0-9]{6,12}$/.test(id);
}

/**
 * Returns a valid saved choice, or null when nothing valid was saved.
 * @param {unknown} value
 * @returns {"accepted" | "declined" | null}
 */
export function readConsent(value) {
  return CONSENT_CHOICES.includes(value) ? value : null;
}

/**
 * Decides what the page should do.
 *  - "off":    analytics is not configured; show nothing, load nothing.
 *  - "ask":    configured, no choice yet; show the banner, load nothing.
 *  - "load":   the visitor accepted; load analytics.
 *  - "silent": the visitor declined; load nothing, do not ask again.
 * @param {string} measurementId
 * @param {unknown} savedChoice
 * @returns {"off" | "ask" | "load" | "silent"}
 */
export function decideAnalytics(measurementId, savedChoice) {
  if (!isValidMeasurementId(measurementId)) return "off";
  const choice = readConsent(savedChoice);
  if (choice === "accepted") return "load";
  if (choice === "declined") return "silent";
  return "ask";
}

/**
 * Names of the sales-relevant clicks we count, chosen from the link address.
 * Returns null for any other link, so ordinary clicks are never reported.
 * @param {string} href
 * @returns {"email_click" | "line_click" | null}
 */
export function classifyLink(href) {
  if (typeof href !== "string") return null;
  if (/^mailto:/i.test(href)) return "email_click";
  if (/^https:\/\/line\.me\//i.test(href)) return "line_click";
  return null;
}
