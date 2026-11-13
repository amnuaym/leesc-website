/**
 * redirect.js
 *
 * Used by the site's root page (/) and by the old page addresses that moved
 * into /th/ and /en/. It sends the visitor to the right language:
 *  - the root page (data-redirect="detect") uses the saved choice, then the
 *    browser's language list;
 *  - an old address (data-redirect="saved") uses only the saved choice, and
 *    otherwise stays, because its own meta refresh already points to Thai.
 * Targets come from the data-th and data-en attributes of the script tag.
 * Without JavaScript nothing happens here: the page's plain links still work.
 */
import { chooseLanguage, detectLanguage, LANGUAGES, LANGUAGE_STORAGE_KEY } from "./language.js";

function readSaved() {
  try {
    return localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    return null; // storage blocked
  }
}

const script = document.querySelector("script[data-redirect]");
if (script !== null) {
  const saved = readSaved();
  const mode = script.dataset.redirect;
  let language = null;
  if (mode === "detect") language = detectLanguage(saved, navigator.languages);
  else if (mode === "saved" && LANGUAGES.includes(saved)) language = chooseLanguage(saved);

  const target = language === null ? undefined : script.dataset[language];
  if (typeof target === "string" && target.startsWith("/")) {
    // Keep a #fragment (for example /#contact) so deep links still land in the right place.
    location.replace(target + location.search + location.hash);
  }
}
