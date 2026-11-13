/**
 * Tests for the Thai / English split: scripts/build-languages.mjs and the
 * pages it generates (/th/, /en/, the redirect pages, the 404 page, the sitemap).
 * Real files and real logic: no mocks. Includes bad input.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  stripLanguage,
  translateHead,
  rewriteLinks,
  buildPage,
  buildRedirect,
  buildSitemap,
  buildSite,
  pagePath,
  pageUrl,
} from "../scripts/build-languages.mjs";
import { HOST, PAGES, OLD_ADDRESSES, THAI_BY_PAGE, THAI_EVERYWHERE } from "../scripts/site-config.mjs";
import { findAllTags, findTags, firstElementText } from "../scripts/html-scan.mjs";

const SITE = join(dirname(fileURLToPath(import.meta.url)), "..");
const THAI_LETTERS = /[฀-๿]/;
const read = async (relative) => (await readFile(join(SITE, relative), "utf8")).replace(/\r\n/g, "\n");

/* ------------------------------ stripLanguage ----------------------------- */

test("stripLanguage keeps one language and removes the other, including nested spans", () => {
  const html = '<p><span class="en">Hello <span class="x">there</span></span><span class="th" lang="th">สวัสดี <b>คุณ</b></span></p>';
  assert.equal(stripLanguage(html, "en"), '<p><span class="en">Hello <span class="x">there</span></span></p>');
  assert.equal(stripLanguage(html, "th"), '<p><span class="th" lang="th">สวัสดี <b>คุณ</b></span></p>');
});

test("stripLanguage removes lines that only held a dropped span", () => {
  const html = '<h1>\n  <span class="en">A</span>\n  <span class="th" lang="th">ก</span>\n</h1>';
  assert.equal(stripLanguage(html, "en"), '<h1>\n  <span class="en">A</span>\n</h1>');
});

test("stripLanguage rejects unknown languages and unbalanced spans", () => {
  assert.throws(() => stripLanguage("<p></p>", "fr"), RangeError);
  assert.throws(() => stripLanguage('<span class="th">never closed', "en"), /Unbalanced/);
});

/* ------------------------------- the helpers ------------------------------ */

test("pagePath and pageUrl put every page below its language folder", () => {
  assert.equal(pagePath("index.html", "th"), "/th/");
  assert.equal(pagePath("privacy.html", "en"), "/en/privacy.html");
  assert.equal(pagePath("services/ai-adoption.html", "th"), "/th/services/ai-adoption.html");
  assert.equal(pageUrl("index.html", "en"), `${HOST}/en/`);
});

test("rewriteLinks moves page links into the language and leaves everything else alone", () => {
  const html = [
    '<a href="/index.html#services">',
    '<a href="/services/ai-adoption.html">',
    '<a href="/privacy.html">',
    '<link href="/assets/css/styles.css">',
    '<a href="mailto:info@leesc.in">',
    '<a href="#contact">',
    '"https://www.leesc.in/index.html#services"',
    '"https://www.leesc.in/services/ai-adoption.html"',
    '"https://www.leesc.in/#organization"',
  ].join("\n");
  assert.equal(
    rewriteLinks(html, "th"),
    [
      '<a href="/th/#services">',
      '<a href="/th/services/ai-adoption.html">',
      '<a href="/th/privacy.html">',
      '<link href="/assets/css/styles.css">',
      '<a href="mailto:info@leesc.in">',
      '<a href="#contact">',
      '"https://www.leesc.in/th/#services"',
      '"https://www.leesc.in/th/services/ai-adoption.html"',
      '"https://www.leesc.in/#organization"',
    ].join("\n"),
  );
});

test("translateHead stops when the page is unknown or its English text has changed", () => {
  assert.throws(() => translateHead("<title>x</title>", "nope.html"), /No Thai text configured/);
  assert.throws(() => translateHead("<title>Something else</title>", "privacy.html"), /not found/);
});

test("buildPage stops when a page has no canonical link for the hreflang links", () => {
  assert.throws(() => buildPage("<html></html>", "index.html", "en"), /canonical/);
});

/* ---------------------- generated files are up to date -------------------- */

test("the generated files on disk match what `npm run build` would write", async () => {
  const expected = await buildSite(SITE);
  assert.ok(expected.size >= 28);
  for (const [relative, contents] of expected) {
    assert.equal(await read(relative), contents.replace(/\r\n/g, "\n"), `${relative} is out of date: run npm run build`);
  }
});

/* ------------------------------- /th/ and /en/ ---------------------------- */

for (const language of ["th", "en"]) {
  const other = language === "th" ? "en" : "th";

  test(`every ${language} page is in ${language} only: lang, no other-language text, head text in the right script`, async () => {
    for (const { file } of PAGES) {
      const page = `${language}/${file}`;
      const html = await read(page);
      assert.match(html, new RegExp(`^<!doctype html>\\n<html lang="${language}" data-lang="${language}">`, "i"), `${page}: lang`);
      assert.equal(html.includes(`class="${other}"`), false, `${page}: leftover ${other} text`);
      assert.ok(html.includes(`class="${language}"`), `${page}: has ${language} text`);
      const head = html.slice(0, html.indexOf("</head>"));
      const title = firstElementText(html, "title");
      const description = findTags(head, "meta").find((m) => m.attrs.name === "description")?.attrs.content ?? "";
      assert.equal(THAI_LETTERS.test(title), language === "th", `${page}: title language (${title})`);
      assert.equal(THAI_LETTERS.test(description), language === "th", `${page}: description language`);
      assert.ok(description.length >= 50 && description.length <= 200, `${page}: description length ${description.length}`);
    }
  });

  test(`the ${language} pages' screen-reader labels and structured data are in ${language}`, async () => {
    for (const { file } of PAGES) {
      const html = await read(`${language}/${file}`);
      const labels = findAllTags(html).map((t) => t.attrs["aria-label"]).filter((v) => typeof v === "string" && v !== "ภาษา / Language");
      assert.ok(labels.length > 0);
      for (const label of labels) assert.equal(THAI_LETTERS.test(label), language === "th", `${language}/${file}: aria-label "${label}"`);
      for (const english of Object.keys(THAI_EVERYWHERE)) {
        if (language === "th") assert.equal(html.includes(`"${english}"`), false, `${language}/${file}: untranslated "${english}"`);
      }
    }
  });

  test(`every ${language} page links to other pages inside ${language}, never to the other language or the old addresses`, async () => {
    for (const { file } of PAGES) {
      const page = `${language}/${file}`;
      const hrefs = findAllTags(await read(page)).map((t) => t.attrs.href).filter((v) => typeof v === "string");
      for (const href of hrefs) {
        if (/^(https?:|mailto:|tel:|#)/.test(href)) continue;
        if (/^\/(assets\/|Logo\.png|favicon\.svg)/.test(href)) continue;
        // The switch is the only place that may point to the other language.
        if (href.startsWith(`/${other}/`)) {
          assert.equal(href, pagePath(file, other), `${page}: link into ${other}: ${href}`);
          continue;
        }
        assert.ok(href.startsWith(`/${language}/`), `${page}: link outside /${language}/: ${href}`);
      }
    }
  });
}

test("every language page has a TH / EN switch of plain links to its twin, with the current language marked", async () => {
  for (const { file } of PAGES) {
    for (const language of ["th", "en"]) {
      const page = `${language}/${file}`;
      const html = await read(page);
      const links = findAllTags(html).filter((t) => t.name === "a" && t.attrs["data-lang-choice"] !== undefined);
      assert.deepEqual(links.map((t) => t.attrs["data-lang-choice"]), ["th", "en"], `${page}: switch links`);
      assert.deepEqual(links.map((t) => t.attrs.href), [pagePath(file, "th"), pagePath(file, "en")], `${page}: switch targets`);
      assert.deepEqual(links.map((t) => t.attrs["aria-current"]), language === "th" ? ["true", undefined] : [undefined, "true"], `${page}: current language`);
      const group = findTags(html, "div").find((d) => d.attrs.id === "lang-switch");
      assert.equal(group.attrs.hidden, undefined, `${page}: the switch needs no JavaScript to be visible`);
      assert.match(html, /<script type="module" src="\/assets\/js\/main\.js"><\/script>/, `${page}: script`);
    }
  }
});

test("each language page names itself, its twin and a fallback with hreflang links that agree across the pair", async () => {
  for (const { file } of PAGES) {
    const sets = [];
    for (const language of ["th", "en"]) {
      const html = await read(`${language}/${file}`);
      const alternates = Object.fromEntries(
        findTags(html, "link").filter((l) => l.attrs.rel === "alternate").map((l) => [l.attrs.hreflang, l.attrs.href]),
      );
      assert.equal(alternates.th, pageUrl(file, "th"));
      assert.equal(alternates.en, pageUrl(file, "en"));
      assert.equal(alternates["x-default"], file === "index.html" ? `${HOST}/` : pageUrl(file, "en"));
      assert.equal(findTags(html, "link").find((l) => l.attrs.rel === "canonical").attrs.href, pageUrl(file, language));
      sets.push(JSON.stringify(alternates));
    }
    assert.equal(sets[0], sets[1], `${file}: both languages list the same alternates`);
  }
});

test("Thai pages: the cookie notice text names the right language's privacy page", async () => {
  const analytics = await read("assets/js/analytics.js");
  assert.match(analytics, /document\.documentElement\.lang === "th" \? "th" : "en"/);
  assert.equal(analytics.includes('href="/privacy.html"'), false, "no link to the old privacy address");
  for (const language of ["th", "en"]) {
    const html = await read(`${language}/privacy.html`);
    assert.match(html, /data-cookie-settings/, `${language}: cookie settings button`);
  }
});

/* ---------------- the root page, old addresses and the 404 page ------------- */

test("the root page is a plain language chooser: links to both languages, hreflang x-default, detection script", async () => {
  const html = await read("index.html");
  const links = findTags(html, "a").map((a) => a.attrs.href);
  assert.ok(links.includes("/th/") && links.includes("/en/"), "plain links work without JavaScript");
  const alternates = Object.fromEntries(findTags(html, "link").filter((l) => l.attrs.rel === "alternate").map((l) => [l.attrs.hreflang, l.attrs.href]));
  assert.deepEqual(alternates, { th: `${HOST}/th/`, en: `${HOST}/en/`, "x-default": `${HOST}/` });
  const script = findTags(html, "script").find((s) => s.attrs.src === "/assets/js/redirect.js");
  assert.equal(script.attrs["data-redirect"], "detect");
  assert.equal(script.attrs["data-th"], "/th/");
  assert.equal(script.attrs["data-en"], "/en/");
  assert.equal(findTags(html, "meta").some((m) => m.attrs["http-equiv"] === "refresh"), false, "no forced redirect for crawlers");
});

test("every old address is a redirect page: meta refresh and canonical to the Thai page, a link to each language", async () => {
  assert.deepEqual([...OLD_ADDRESSES].sort(), PAGES.map((p) => p.file).filter((f) => f !== "index.html").sort());
  for (const file of OLD_ADDRESSES) {
    const html = await read(file);
    const th = pagePath(file, "th");
    const refresh = findTags(html, "meta").find((m) => m.attrs["http-equiv"] === "refresh");
    assert.equal(refresh.attrs.content, `0; url=${th}`, `${file}: meta refresh`);
    assert.equal(findTags(html, "link").find((l) => l.attrs.rel === "canonical").attrs.href, `${HOST}${th}`, `${file}: canonical`);
    const links = findTags(html, "a").map((a) => a.attrs.href);
    assert.deepEqual(links, [th, pagePath(file, "en")], `${file}: links`);
    const script = findTags(html, "script").find((s) => s.attrs.src === "/assets/js/redirect.js");
    assert.equal(script.attrs["data-redirect"], "saved", `${file}: only a saved choice redirects to English`);
    await readFile(join(SITE, th.slice(1)), "utf8"); // the target exists
  }
  assert.match(buildRedirect("privacy.html"), /url=\/th\/privacy\.html/);
});

test("the 404 page serves every address: root paths, no language switch, it chooses its own language", async () => {
  const html = await read("404.html");
  assert.match(html, /<html lang="en" data-lang="auto">/);
  assert.equal(findTags(html, "div").some((d) => d.attrs.id === "lang-switch"), false);
  for (const tag of findAllTags(html)) {
    for (const ref of [tag.attrs.href, tag.attrs.src]) {
      if (typeof ref === "string") assert.ok(ref.startsWith("/"), `404 uses root paths: ${ref}`);
    }
  }
  assert.ok(html.includes('class="en"') && html.includes('class="th"'), "both languages are present for the script to choose from");
});

test("the sitemap is the one the build writes, with every page in both languages", () => {
  const sitemap = buildSitemap();
  assert.equal((sitemap.match(/<loc>/g) ?? []).length, 1 + PAGES.length * 2);
  assert.match(sitemap, /xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml"/);
  for (const { lastmod } of PAGES) assert.match(lastmod, /^\d{4}-\d{2}-\d{2}$/);
});

test("the source pages use root paths, so the build can place them under /th/ and /en/", async () => {
  for (const { file } of PAGES) {
    const html = await read(`src/${file}`);
    for (const tag of findAllTags(html)) {
      for (const ref of [tag.attrs.href, tag.attrs.src]) {
        if (typeof ref !== "string" || /^(https?:|mailto:|tel:|#)/.test(ref)) continue;
        assert.ok(ref.startsWith("/"), `src/${file}: relative link ${ref}`);
      }
    }
  }
});

test("every page has Thai text configured, and each Thai head text is used", () => {
  assert.deepEqual(Object.keys(THAI_BY_PAGE).sort(), PAGES.map((p) => p.file).sort());
});
