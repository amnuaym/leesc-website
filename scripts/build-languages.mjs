/**
 * build-languages.mjs
 *
 * Run with:  npm run build
 *
 * Reads the bilingual pages in src/ (each text written twice, class="en" and
 * class="th") and writes the published pages:
 *   /th/...  Thai pages          /en/...  English pages
 *   /404.html                    one page for every missing address
 *   /privacy.html, /services/*   old addresses: small pages that redirect to /th/...
 *   /sitemap.xml                 every language page, with hreflang links
 * The site's root page (/index.html) is written by hand and is not touched.
 *
 * Only Node.js built-in modules are used. The generated files are committed,
 * so GitHub Pages needs no build step. Edit src/, then run `npm run build`.
 * Pure functions are exported so the tests can use them.
 */
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseAttributes } from "./html-scan.mjs";
import { HOST, PAGES, OLD_ADDRESSES, THAI_EVERYWHERE, THAI_BY_PAGE } from "./site-config.mjs";

const SITE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..");
const OTHER = { th: "en", en: "th" };

/* ----------------------------- small helpers ----------------------------- */

/** Address of a page in one language, for example "/th/services/ai-adoption.html" ("/th/" for the home page). */
export function pagePath(file, language) {
  return `/${language}/${file === "index.html" ? "" : file}`;
}

/** Full web address of a page in one language. */
export function pageUrl(file, language) {
  return `${HOST}${pagePath(file, language)}`;
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Replaces every occurrence of `from`, and returns how many were replaced. */
function replaceAllCounted(text, from, to) {
  const parts = text.split(from);
  return { text: parts.join(to), count: parts.length - 1 };
}

/* ------------------------ step 1: keep one language ----------------------- */

const SPAN = /<span\b([^>]*)>|<\/span>/g;

/**
 * Removes every <span class="th"> (or class="en") together with its content,
 * including nested spans, and leaves the other language's spans untouched.
 * @param {string} html
 * @param {"en" | "th"} keep The language to keep.
 * @returns {string}
 */
export function stripLanguage(html, keep) {
  const drop = OTHER[keep];
  if (drop === undefined) throw new RangeError(`Unknown language: ${keep}`);

  let out = "";
  let last = 0;
  let depth = 0; // above 0 while inside a span that is being dropped
  for (const match of html.matchAll(SPAN)) {
    const closing = match[0] === "</span>";
    if (depth > 0) {
      depth += closing ? -1 : 1;
      if (depth === 0) last = match.index + match[0].length;
      continue;
    }
    if (!closing && parseAttributes(match[1]).class === drop) {
      out += html.slice(last, match.index);
      depth = 1;
    }
  }
  if (depth !== 0) throw new Error("Unbalanced <span> in a page: a dropped span was never closed.");
  out += html.slice(last);
  // Dropping a span on its own line leaves a blank, indented line: remove those.
  return out.replace(/^[ \t]+\r?\n/gm, "");
}

/* --------------------- step 2: Thai text for the head --------------------- */

/**
 * Replaces English head text with Thai text: <title>, quoted attribute values
 * (content="...", aria-label="...") and quoted JSON-LD strings.
 * Every entry must be found, or the build stops, so a changed English text
 * cannot silently leave a Thai page with English metadata.
 * @param {string} html
 * @param {string} file Page file name, as in site-config.mjs.
 * @returns {{html: string, usedGlobal: Set<string>}}
 */
export function translateHead(html, file) {
  const pairs = THAI_BY_PAGE[file];
  if (pairs === undefined) throw new Error(`No Thai text configured for ${file} in scripts/site-config.mjs.`);

  let result = html;
  for (const [english, thai] of pairs) {
    const asTitle = replaceAllCounted(result, `<title>${english}</title>`, `<title>${thai}</title>`);
    const asQuoted = replaceAllCounted(asTitle.text, `"${english}"`, `"${thai}"`);
    if (asTitle.count + asQuoted.count === 0) {
      throw new Error(`${file}: the English text was not found, so its Thai text cannot be used:\n  ${english}`);
    }
    result = asQuoted.text;
  }

  const usedGlobal = new Set();
  for (const [english, thai] of Object.entries(THAI_EVERYWHERE)) {
    const replaced = replaceAllCounted(result, `"${english}"`, `"${thai}"`);
    if (replaced.count > 0) usedGlobal.add(english);
    result = replaced.text;
  }
  return { html: result, usedGlobal };
}

/* ------------------------- step 3: language details ----------------------- */

/** Option labels in the contact form: data-th holds the Thai label. */
function fixOptions(html, language) {
  return html.replace(/<option value="([^"]*)" data-th="([^"]*)">([^<]*)<\/option>/g, (_all, value, thai, english) =>
    `<option value="${value}">${language === "th" ? thai : english}</option>`,
  );
}

/** Marks the page language in <html> and in the Open Graph locale tags. */
function setLanguageMarks(html, language) {
  const locale = { th: "th_TH", en: "en_US" };
  let result = html.replace(/<html lang="[^"]*" data-lang="[^"]*">/, `<html lang="${language}" data-lang="${language}">`);
  result = result.replace(/<meta property="og:locale" content="[^"]*">/, `<meta property="og:locale" content="${locale[language]}">`);
  result = result.replace(/<meta property="og:locale:alternate" content="[^"]*">/, `<meta property="og:locale:alternate" content="${locale[OTHER[language]]}">`);
  return result;
}

/** Turns the TH / EN buttons into plain links to the same page in the other language. */
function buildSwitch(html, file, language) {
  const switchPattern = /<div class="lang-switch" id="lang-switch"[\s\S]*?<\/div>/;
  if (!switchPattern.test(html)) return html;
  const current = (code) => (code === language ? ' aria-current="true"' : "");
  const markup = [
    '<div class="lang-switch" id="lang-switch" role="group" aria-label="ภาษา / Language">',
    `              <a href="${pagePath(file, "th")}" hreflang="th" lang="th" data-lang-choice="th"${current("th")}>ไทย</a>`,
    `              <a href="${pagePath(file, "en")}" hreflang="en" lang="en" data-lang-choice="en"${current("en")}>EN</a>`,
    "            </div>",
  ].join("\n");
  return html.replace(switchPattern, markup);
}

/** Rewrites links that point at another page of the site so they stay inside the language. */
export function rewriteLinks(html, language) {
  const names = PAGES.map((page) => escapeRegExp(page.file)).join("|");
  // Root-relative links in href="..." (for example /services/ai-adoption.html#top, /index.html#contact).
  let result = html.replace(new RegExp(`(href=")/(${names})((?:#[^"]*)?")`, "g"), (_all, start, file, end) => `${start}${pagePath(file, language)}${end}`);
  // Full web addresses (canonical, og:url, structured data).
  result = result.replace(new RegExp(`${escapeRegExp(HOST)}/(${names})(#[\\w-]+)?`, "g"), (_all, file, fragment = "") => `${pageUrl(file, language)}${fragment}`);
  return result;
}

/** Adds hreflang links after the canonical link: Thai, English and x-default. */
function addAlternates(html, file) {
  const canonical = /<link rel="canonical" href="[^"]*">/;
  if (!canonical.test(html)) throw new Error(`${file}: no canonical link to place the hreflang links after.`);
  // x-default: the home page's is the language-choosing root; inner pages fall back to English.
  const fallback = file === "index.html" ? `${HOST}/` : pageUrl(file, "en");
  const lines = [
    `<link rel="alternate" hreflang="th" href="${pageUrl(file, "th")}">`,
    `<link rel="alternate" hreflang="en" href="${pageUrl(file, "en")}">`,
    `<link rel="alternate" hreflang="x-default" href="${fallback}">`,
  ];
  return html.replace(canonical, (tag) => `${tag}\n  ${lines.join("\n  ")}`);
}

/**
 * Builds one language page from its bilingual source.
 * @param {string} source Contents of the file in src/.
 * @param {string} file Page file name, as in site-config.mjs.
 * @param {"th" | "en"} language
 * @returns {{html: string, usedGlobal: Set<string>}}
 */
export function buildPage(source, file, language) {
  let html = source.replace(/\r\n/g, "\n");
  html = stripLanguage(html, language);
  let usedGlobal = new Set();
  if (language === "th") ({ html, usedGlobal } = translateHead(html, file));
  html = fixOptions(html, language);
  html = setLanguageMarks(html, language);
  html = rewriteLinks(html, language);
  html = addAlternates(html, file);
  html = buildSwitch(html, file, language);
  if (new RegExp(`class="${OTHER[language]}"`).test(html)) {
    throw new Error(`${file}: text in the other language is still present after building (${language}).`);
  }
  return { html, usedGlobal };
}

/* ------------------------ redirect pages and sitemap ---------------------- */

/**
 * A small page left at an old address. People and search engines are sent to
 * the Thai page (the old default); visitors who earlier chose English by the
 * TH / EN switch are sent to the English page by redirect.js.
 * @param {string} file Old address without the leading slash, for example "privacy.html".
 */
export function buildRedirect(file) {
  const th = pagePath(file, "th");
  const en = pagePath(file, "en");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>This page has moved | Lee Solutions and Consulting</title>
  <meta http-equiv="refresh" content="0; url=${th}">
  <link rel="canonical" href="${HOST}${th}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/css/styles.css">
</head>
<body>
  <main id="main" class="container page">
    <h1>This page has moved / หน้านี้ย้ายแล้ว</h1>
    <p><a href="${th}" lang="th">ไปที่หน้าภาษาไทย</a></p>
    <p><a href="${en}" lang="en">Go to the English page</a></p>
  </main>
  <script type="module" src="/assets/js/redirect.js" data-redirect="saved" data-th="${th}" data-en="${en}"></script>
</body>
</html>
`;
}

/** sitemap.xml: the root page and every language page, each with its hreflang links. */
export function buildSitemap() {
  const lastmods = new Map(PAGES.map((page) => [page.file, page.lastmod]));
  const newest = [...lastmods.values()].sort().at(-1);
  const alternates = (file) =>
    [
      `    <xhtml:link rel="alternate" hreflang="th" href="${pageUrl(file, "th")}"/>`,
      `    <xhtml:link rel="alternate" hreflang="en" href="${pageUrl(file, "en")}"/>`,
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${file === "index.html" ? `${HOST}/` : pageUrl(file, "en")}"/>`,
    ].join("\n");

  const entries = [
    [
      "  <url>",
      `    <loc>${HOST}/</loc>`,
      `    <lastmod>${newest}</lastmod>`,
      alternates("index.html"),
      "  </url>",
    ].join("\n"),
  ];
  for (const { file, lastmod } of PAGES) {
    for (const language of ["th", "en"]) {
      entries.push(["  <url>", `    <loc>${pageUrl(file, language)}</loc>`, `    <lastmod>${lastmod}</lastmod>`, alternates(file), "  </url>"].join("\n"));
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join("\n")}
</urlset>
`;
}

/* ------------------------------ the whole site ---------------------------- */

/**
 * Builds every generated file in memory.
 * @param {string} [siteDir] Folder that holds src/.
 * @returns {Promise<Map<string, string>>} Relative path (with "/") -> file contents.
 */
export async function buildSite(siteDir = SITE_DIR) {
  const files = new Map();
  const usedGlobal = new Set();

  for (const { file } of PAGES) {
    const source = await readFile(join(siteDir, "src", file), "utf8");
    for (const language of ["th", "en"]) {
      const built = buildPage(source, file, language);
      files.set(`${language}${pagePath(file, language).slice(3)}`.replace(/\/$/, "/index.html"), built.html);
      for (const key of built.usedGlobal) usedGlobal.add(key);
    }
  }

  const unused = Object.keys(THAI_EVERYWHERE).filter((key) => !usedGlobal.has(key));
  if (unused.length > 0) throw new Error(`These entries of THAI_EVERYWHERE match no page: ${unused.join(" | ")}`);

  // One 404 page for every address: it chooses its own language in the browser.
  files.set("404.html", (await readFile(join(siteDir, "src", "404.html"), "utf8")).replace(/\r\n/g, "\n"));
  for (const file of OLD_ADDRESSES) files.set(file, buildRedirect(file));
  files.set("sitemap.xml", buildSitemap());
  return files;
}

async function main() {
  const files = await buildSite();
  await rm(join(SITE_DIR, "th"), { recursive: true, force: true });
  await rm(join(SITE_DIR, "en"), { recursive: true, force: true });
  for (const [relative, contents] of files) {
    const target = join(SITE_DIR, relative);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, contents, "utf8");
  }
  console.log(`Built ${files.size} files from src/.`);
}

// Run only when started from the command line, not when the tests import this file.
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await main();
}
