/**
 * language.js
 *
 * Pure rules for the English / Thai switch. No page access, so it can be
 * tested directly with Node.js. Page wiring lives in main.js.
 */

/** Languages the site offers. The first one is the default. */
export const LANGUAGES = Object.freeze(["en", "th"]);

/** Used when nothing valid has been chosen (first visit, or a bad saved value). */
export const DEFAULT_LANGUAGE = "th";

/**
 * Returns a supported language code, or the default when the value is not one.
 * @param {unknown} value
 * @returns {"en" | "th"}
 */
export function chooseLanguage(value) {
  return LANGUAGES.includes(value) ? value : DEFAULT_LANGUAGE;
}

/**
 * Returns the other language, for the switch button.
 * @param {"en" | "th"} language
 * @returns {"en" | "th"}
 */
export function nextLanguage(language) {
  if (!LANGUAGES.includes(language)) {
    throw new TypeError(`Unknown language: ${String(language)}`);
  }
  return language === "en" ? "th" : "en";
}

/** Key used to remember the visitor's language choice in their own browser. */
export const LANGUAGE_STORAGE_KEY = "site-language";

/**
 * Picks the language for a visitor who opens the site's address (/) or an
 * address that no longer exists (404). A saved choice wins. Otherwise the
 * first supported language in the browser's preference list wins. When the
 * browser asks for neither Thai nor English, English is used.
 * @param {unknown} saved The value saved from an earlier visit, if any.
 * @param {unknown} browserLanguages `navigator.languages`, for example ["fr-FR", "th"].
 * @returns {"en" | "th"}
 */
export function detectLanguage(saved, browserLanguages) {
  if (LANGUAGES.includes(saved)) return saved;
  if (Array.isArray(browserLanguages)) {
    for (const tag of browserLanguages) {
      if (typeof tag !== "string") continue;
      const primary = tag.toLowerCase().split("-")[0];
      if (LANGUAGES.includes(primary)) return primary;
    }
  }
  return "en";
}
