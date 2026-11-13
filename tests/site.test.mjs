/**
 * Tests for the real website files at the top level of this repository.
 * Part 1 tests the helper functions on small sample pages (including bad pages).
 * Part 2 checks the actual pages: structure, accessibility basics, links,
 * "zero dependency" rule, and consistency between files. The site has a Thai
 * and an English copy of every page (/th/ and /en/), so most checks run on both.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  stripComments,
  parseAttributes,
  findAllTags,
  findTags,
  firstElementText,
  collectIds,
  findDuplicates,
  headingLevels,
  headingsAreOrdered,
  isExternalRef,
  resolveLocalRef,
} from "../scripts/html-scan.mjs";
import { TOPICS } from "../assets/js/contact-logic.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = ROOT;
// Project tooling at the root, which is not part of the published website.
const NOT_SITE = /^(scripts|tests|backup|node_modules|\.git|\.claude)([\\/]|$)|^(README\.md|NoREADME\.md|LICENSE|package\.json|\.gitignore)$/;
const CANONICAL_HOST = "https://www.leesc.in";

/* ------------------------- Part 1: helper functions ------------------------ */

test("stripComments removes comments, including multi-line ones", () => {
  assert.equal(stripComments("a<!-- x\ny -->b"), "ab");
  assert.throws(() => stripComments(null), TypeError);
});

test("parseAttributes handles quotes, bare values, boolean attributes and '>' in values", () => {
  assert.deepEqual(parseAttributes(' href="a b" class=\'x\' id=plain hidden data-x="a>b" '), {
    href: "a b",
    class: "x",
    id: "plain",
    hidden: "",
    "data-x": "a>b",
  });
});

test("findAllTags ignores tags inside comments and keeps '>' inside quoted values", () => {
  const tags = findAllTags('<!-- <img src="no.png"> --><a title="1 > 0" href="x.html">t</a>');
  assert.equal(tags.length, 1);
  assert.equal(tags[0].attrs.title, "1 > 0");
});

test("findTags returns only the requested tag, case-insensitively", () => {
  const html = '<IMG src="a.png" alt=""><p><img src="b.png">';
  assert.equal(findTags(html, "img").length, 2);
  assert.equal(findTags(html, "p").length, 1);
});

test("firstElementText strips tags and collapses spaces; null when missing", () => {
  assert.equal(firstElementText("<title>  Hello \n <b>World</b> </title>", "title"), "Hello World");
  assert.equal(firstElementText("<p>x</p>", "title"), null);
});

test("collectIds and findDuplicates detect repeated ids", () => {
  const ids = collectIds('<div id="a"></div><p id="b"></p><span id="a"></span>');
  assert.deepEqual(ids, ["a", "b", "a"]);
  assert.deepEqual(findDuplicates(ids), ["a"]);
  assert.deepEqual(findDuplicates(["x", "y"]), []);
});

test("headingLevels and headingsAreOrdered detect skipped levels", () => {
  assert.deepEqual(headingLevels("<h1>a</h1><h2>b</h2><h3>c</h3><h2>d</h2>"), [1, 2, 3, 2]);
  assert.equal(headingsAreOrdered([1, 2, 3, 2, 3]), true);
  assert.equal(headingsAreOrdered([1, 3]), false);
  assert.equal(headingsAreOrdered([2]), false);
  assert.equal(headingsAreOrdered([]), true);
});

test("isExternalRef separates outside links from local ones", () => {
  for (const ref of ["https://a.com", "http://a.com", "mailto:a@b.co", "tel:+66", "//cdn.example.com/x.js", "data:text/plain,hi"]) {
    assert.equal(isExternalRef(ref), true, ref);
  }
  for (const ref of ["index.html", "/assets/x.css", "#top", "../a.html", "./b"]) {
    assert.equal(isExternalRef(ref), false, ref);
  }
});

test("resolveLocalRef resolves relative, root-relative, fragment and directory links", () => {
  assert.deepEqual(resolveLocalRef("index.html", "privacy.html"), { file: "privacy.html", fragment: "" });
  assert.deepEqual(resolveLocalRef("index.html", "#contact"), { file: "index.html", fragment: "contact" });
  assert.deepEqual(resolveLocalRef("privacy.html", "index.html#services"), { file: "index.html", fragment: "services" });
  assert.deepEqual(resolveLocalRef("404.html", "/assets/css/styles.css"), { file: "assets/css/styles.css", fragment: "" });
  assert.deepEqual(resolveLocalRef("404.html", "/"), { file: "index.html", fragment: "" });
  assert.deepEqual(resolveLocalRef("a/b.html", "../c.html"), { file: "c.html", fragment: "" });
});

/* --------------------------- Part 2: the real site ------------------------- */

const LANGUAGES = ["th", "en"];
const SERVICE_FILES = [
  "services/digital-transformation.html",
  "services/solution-consulting.html",
  "services/it-operations-governance.html",
  "services/ai-adoption.html",
  "services/cyber-security.html",
  "services/project-management.html",
  "services/thailand-market-entry.html",
];
/** The pages that exist once per language, named as in src/. */
const BASE_FILES = ["index.html", "privacy.html", ...SERVICE_FILES];
/** "th/index.html", "en/index.html", "th/privacy.html", ... */
const LANGUAGE_PAGES = LANGUAGES.flatMap((language) => BASE_FILES.map((file) => `${language}/${file}`));
const SERVICE_PAGES = LANGUAGES.flatMap((language) => SERVICE_FILES.map((file) => `${language}/${file}`));
/** Old addresses that now only redirect to the Thai page. */
const REDIRECT_PAGES = BASE_FILES.filter((file) => file !== "index.html");
/** The site's root page: a language chooser. */
const ROOT_PAGE = "index.html";
const HOME_PAGES = LANGUAGES.map((language) => `${language}/index.html`);
const PAGES = [ROOT_PAGE, "404.html", ...LANGUAGE_PAGES, ...REDIRECT_PAGES];
/** Address of a language page on the canonical host: "th/index.html" -> ".../th/". */
const addressOf = (page) => `${CANONICAL_HOST}/${page.replace(/index\.html$/, "")}`;
const PLACEHOLDER = /\{\{[A-Z][A-Z0-9_]*\}\}/;

async function readPage(name) {
  return readFile(join(SITE, name), "utf8");
}

async function exists(relative) {
  try {
    await stat(join(SITE, relative));
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

test("every page has a doctype, language, charset, viewport and a sensible title", async () => {
  for (const page of PAGES) {
    const html = await readPage(page);
    assert.match(html.trimStart(), /^<!doctype html>/i, `${page}: doctype`);
    assert.match(findTags(html, "html")[0].attrs.lang, /^(en|th)$/, `${page}: lang`);
    assert.ok(findTags(html, "meta").some((m) => m.attrs.charset === "utf-8"), `${page}: charset`);
    assert.ok(findTags(html, "meta").some((m) => m.attrs.name === "viewport"), `${page}: viewport`);
    const title = firstElementText(html, "title");
    assert.ok(title && title.length >= 10 && title.length <= 70, `${page}: title length (${title})`);
  }
});

test("indexable pages have a description and a correct canonical link", async () => {
  const expected = {
    [ROOT_PAGE]: `${CANONICAL_HOST}/`,
    ...Object.fromEntries(LANGUAGE_PAGES.map((page) => [page, addressOf(page)])),
  };
  for (const [page, canonical] of Object.entries(expected)) {
    const html = await readPage(page);
    const description = findTags(html, "meta").find((m) => m.attrs.name === "description");
    assert.ok(description, `${page}: description`);
    assert.ok(description.attrs.content.length >= 50 && description.attrs.content.length <= 200, `${page}: description length`);
    const link = findTags(html, "link").find((l) => l.attrs.rel === "canonical");
    assert.equal(link?.attrs.href, canonical, `${page}: canonical`);
  }
});

test("the 404 page is not indexed", async () => {
  const html = await readPage("404.html");
  const robots = findTags(html, "meta").find((m) => m.attrs.name === "robots");
  assert.equal(robots?.attrs.content, "noindex");
});

test("every page has exactly one h1 and headings never skip a level", async () => {
  for (const page of PAGES) {
    const levels = headingLevels(await readPage(page));
    assert.equal(levels.filter((l) => l === 1).length, 1, `${page}: one h1`);
    assert.equal(headingsAreOrdered(levels), true, `${page}: heading order ${levels.join(",")}`);
  }
});

test("ids are unique on every page", async () => {
  for (const page of PAGES) {
    assert.deepEqual(findDuplicates(collectIds(await readPage(page))), [], page);
  }
});

test("every image has an alt attribute", async () => {
  for (const page of PAGES) {
    for (const img of findTags(await readPage(page), "img")) {
      assert.notEqual(img.attrs.alt, undefined, `${page}: <img src="${img.attrs.src}"> needs alt`);
    }
  }
});

test("every local link, script, stylesheet and fragment points to something that exists", async () => {
  const idsByFile = new Map();
  for (const page of PAGES) idsByFile.set(page, new Set(collectIds(await readPage(page))));

  for (const page of PAGES) {
    const html = await readPage(page);
    const refs = findAllTags(html)
      .flatMap((tag) => [tag.attrs.href, tag.attrs.src])
      .filter((ref) => typeof ref === "string" && ref !== "");

    for (const ref of refs) {
      if (isExternalRef(ref) || PLACEHOLDER.test(ref)) continue;
      const { file, fragment } = resolveLocalRef(page, ref);
      assert.equal(await exists(file), true, `${page}: "${ref}" -> missing file ${file}`);
      if (fragment !== "") {
        const ids = idsByFile.get(file);
        assert.ok(ids?.has(fragment), `${page}: "${ref}" -> no element with id "${fragment}" in ${file}`);
      }
    }
  }
});

test("zero-dependency rule: no external scripts, stylesheets or images", async () => {
  for (const page of PAGES) {
    const tags = findAllTags(await readPage(page));
    for (const tag of tags) {
      if (tag.name === "script" && tag.attrs.src !== undefined) {
        assert.equal(isExternalRef(tag.attrs.src), false, `${page}: external script ${tag.attrs.src}`);
      }
      if (tag.name === "link" && tag.attrs.rel === "stylesheet") {
        assert.equal(isExternalRef(tag.attrs.href), false, `${page}: external stylesheet ${tag.attrs.href}`);
      }
      if (tag.name === "img") {
        assert.equal(isExternalRef(tag.attrs.src ?? ""), false, `${page}: external image ${tag.attrs.src}`);
      }
    }
  }
  const css = await readFile(join(SITE, "assets/css/styles.css"), "utf8");
  assert.equal(/@import|url\(\s*["']?https?:/i.test(css), false, "stylesheet imports nothing external");
});

test("no insecure http:// links in any page", async () => {
  for (const page of PAGES) {
    for (const tag of findAllTags(await readPage(page))) {
      for (const value of [tag.attrs.href, tag.attrs.src]) {
        assert.equal(typeof value === "string" && value.startsWith("http://"), false, `${page}: ${value}`);
      }
    }
  }
});

test("every form control has a label, and error areas exist for each field", async () => {
  for (const page of HOME_PAGES) await checkFormControls(page);
});

async function checkFormControls(page) {
  const html = await readPage(page);
  const labelTargets = new Set(findTags(html, "label").map((l) => l.attrs.for));
  const controls = findAllTags(html).filter((t) => ["input", "select", "textarea"].includes(t.name));
  assert.ok(controls.length >= 5);
  for (const control of controls) {
    assert.ok(control.attrs.id, "control has an id");
    assert.ok(labelTargets.has(control.attrs.id), `control #${control.attrs.id} has a label`);
  }
  const ids = new Set(collectIds(html));
  for (const field of ["name", "company", "email", "topic", "message"]) {
    assert.ok(ids.has(`cf-${field}-error`), `error area for ${field}`);
  }
  assert.ok(ids.has("cf-status"), "status area");
}

test("the form's topic list matches TOPICS in contact-logic.js exactly, in both languages", async () => {
  for (const page of HOME_PAGES) {
    const html = await readPage(page);
    const select = html.match(/<select id="cf-topic"[\s\S]*?<\/select>/)?.[0];
    assert.ok(select, `${page}: topic select found`);
    const options = findTags(select, "option").map((o) => o.attrs.value).filter((v) => v !== "");
    assert.deepEqual(options, [...TOPICS], page);
    assert.equal(/data-th=/.test(select), false, `${page}: option labels are already in the page language`);
  }
  // Thai labels show on the Thai page and English labels on the English page.
  const thai = await readPage("th/index.html");
  const english = await readPage("en/index.html");
  assert.match(thai, /<option value="Cyber Security">ความมั่นคงปลอดภัยไซเบอร์<\/option>/);
  assert.match(english, /<option value="Cyber Security">Cyber Security<\/option>/);
});

test("the form recipient is a real address that also appears as a visible mailto link", async () => {
  for (const page of HOME_PAGES) {
    const html = await readPage(page);
    const form = findTags(html, "form").find((f) => f.attrs.id === "contact-form");
    assert.ok(form, `${page}: form found`);
    assert.match(form.attrs["data-recipient"], /^[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/);
    const mailtos = findTags(html, "a").map((a) => a.attrs.href).filter((h) => h?.startsWith("mailto:"));
    assert.ok(mailtos.includes(`mailto:${form.attrs["data-recipient"]}`), page);
  }
});

test("the form is hidden until JavaScript shows it, with a no-JavaScript message", async () => {
  for (const page of HOME_PAGES) {
    const html = await readPage(page);
    const form = findTags(html, "form").find((f) => f.attrs.id === "contact-form");
    assert.notEqual(form.attrs.hidden, undefined, page);
    assert.match(html, /<noscript>[\s\S]*info@leesc\.in[\s\S]*<\/noscript>/, page);
  }
});

test("structured data is valid JSON and matches the canonical address", async () => {
  for (const page of HOME_PAGES) {
    const html = await readPage(page);
    const block = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
    assert.ok(block, `${page}: JSON-LD block found`);
    const data = JSON.parse(block);
    assert.equal(data["@type"], "Organization");
    // The organisation is one entity for both languages, so it keeps the root address.
    assert.equal(data.url, `${CANONICAL_HOST}/`, page);
  }
});

test("CNAME contains exactly the www domain", async () => {
  const text = await readFile(join(SITE, "CNAME"), "utf8");
  assert.equal(text.trim(), "www.leesc.in");
  assert.equal(text.trim().split(/\s+/).length, 1);
});

test("sitemap lists the root and every language page, nothing else; robots points to the sitemap", async () => {
  const sitemap = await readFile(join(SITE, "sitemap.xml"), "utf8");
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual([...urls].sort(), [`${CANONICAL_HOST}/`, ...LANGUAGE_PAGES.map(addressOf)].sort());
  for (const alternate of sitemap.matchAll(/hreflang="[^"]+" href="([^"]+)"/g)) {
    assert.ok(urls.includes(alternate[1]), `hreflang target ${alternate[1]} is listed in the sitemap`);
  }
  for (const url of urls) {
    assert.ok(url.startsWith(`${CANONICAL_HOST}/`), url);
    const { file } = resolveLocalRef("index.html", url.slice(CANONICAL_HOST.length));
    assert.equal(await exists(file), true, `sitemap URL ${url} -> missing ${file}`);
  }
  const robots = await readFile(join(SITE, "robots.txt"), "utf8");
  assert.match(robots, new RegExp(`^Sitemap: ${CANONICAL_HOST.replace(/\./g, "\\.")}/sitemap\\.xml$`, "m"));
});

test("every JavaScript import in the site resolves to a real file", async () => {
  const main = await readFile(join(SITE, "assets/js/main.js"), "utf8");
  const imports = [...main.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
  assert.ok(imports.length >= 1);
  for (const spec of imports) {
    assert.ok(spec.startsWith("./"), `only local imports allowed: ${spec}`);
    assert.equal(await exists(join("assets/js", spec)), true, spec);
  }
});

test("the site folder contains no unexpected file types", async () => {
  const allowed = new Set([".html", ".css", ".js", ".svg", ".xml", ".txt", ".png", ".jpg", ".jpeg", ".webp", ".woff2", ""]);
  const entries = await readdir(SITE, { recursive: true });
  for (const entry of entries) {
    const info = await stat(join(SITE, entry));
    if (info.isDirectory() || NOT_SITE.test(entry)) continue;
    const base = entry.split(/[\\/]/).pop();
    // GitHub Pages marker file: tells Pages to serve the folder as-is, without Jekyll.
    if (base === ".nojekyll") continue;
    const ext = base.includes(".") ? base.slice(base.lastIndexOf(".")) : "";
    assert.ok(allowed.has(ext), `unexpected file type: ${entry}`);
    if (ext === "") assert.equal(base, "CNAME", `unexpected extensionless file: ${entry}`);
  }
});

/* ------------------------- Part 3: search and sharing ------------------------ */

const INDEXABLE_PAGES = LANGUAGE_PAGES;

/** Reads width and height from the header of a PNG file (the IHDR block). */
async function pngSize(relative) {
  const bytes = await readFile(join(SITE, relative));
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  assert.ok(bytes.length >= 24, `${relative}: too small to be a PNG`);
  signature.forEach((byte, i) => assert.equal(bytes[i], byte, `${relative}: not a PNG`));
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

/** Returns every parsed JSON-LD block of a page. Throws when one is not valid JSON. */
function jsonLdBlocks(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
}

test("the share image exists and has the recommended 1200 x 630 size", async () => {
  assert.deepEqual(await pngSize("assets/images/og-image.png"), { width: 1200, height: 630 });
});

test("pngSize rejects text that is not a PNG, and files that are too small", async () => {
  await assert.rejects(() => pngSize("robots.txt"), /too small|not a PNG/);
  await assert.rejects(() => pngSize("sitemap.xml"), /not a PNG/);
});

test("every indexable page has complete Open Graph and Twitter share tags", async () => {
  for (const page of INDEXABLE_PAGES) {
    const html = await readPage(page);
    const metas = findTags(html, "meta");
    const og = (name) => metas.find((m) => m.attrs.property === name)?.attrs.content;
    const tw = (name) => metas.find((m) => m.attrs.name === name)?.attrs.content;
    for (const name of ["og:title", "og:description", "og:url", "og:image", "og:image:alt", "og:site_name"]) {
      assert.ok(og(name), `${page}: ${name}`);
    }
    assert.equal(og("og:image"), `${CANONICAL_HOST}/assets/images/og-image.png`, `${page}: og:image`);
    assert.equal(og("og:image:width"), "1200", `${page}: og:image:width`);
    assert.equal(og("og:image:height"), "630", `${page}: og:image:height`);
    assert.equal(tw("twitter:card"), "summary_large_image", `${page}: twitter:card`);
    for (const name of ["twitter:title", "twitter:description", "twitter:image", "twitter:image:alt"]) {
      assert.ok(tw(name), `${page}: ${name}`);
    }
    const canonical = findTags(html, "link").find((l) => l.attrs.rel === "canonical").attrs.href;
    assert.equal(og("og:url"), canonical, `${page}: og:url matches canonical`);
    const thai = page.startsWith("th/");
    assert.equal(og("og:locale"), thai ? "th_TH" : "en_US", `${page}: og:locale`);
    assert.equal(og("og:locale:alternate"), thai ? "en_US" : "th_TH", `${page}: og:locale:alternate`);
  }
});

test("the 404 page has no share tags (it is not meant to be shared or indexed)", async () => {
  const html = await readPage("404.html");
  assert.equal(findTags(html, "meta").some((m) => m.attrs.property === "og:image"), false);
});

test("home page descriptions agree with the seven services shown on the page", async () => {
  const topics = {
    en: ["cyber security", "project management", "AI adoption", "digital transformation", "market entry"],
    th: ["ความมั่นคงปลอดภัยไซเบอร์", "การบริหารโครงการ", "การนำ AI มาใช้", "การเปลี่ยนผ่านดิจิทัล", "การเข้าสู่ตลาดไทย"],
  };
  for (const language of LANGUAGES) {
    const metas = findTags(await readPage(`${language}/index.html`), "meta");
    const description = metas.find((m) => m.attrs.name === "description").attrs.content;
    const ogDescription = metas.find((m) => m.attrs.property === "og:description").attrs.content;
    for (const text of [description, ogDescription]) {
      if (language === "en") assert.doesNotMatch(text, /\bfour\b/i);
      for (const topic of topics[language]) {
        assert.ok(text.toLowerCase().includes(topic.toLowerCase()), `${language}: "${topic}" missing from: ${text}`);
      }
    }
  }
});

test("organization data has logo, contact point and profile links that point to real files", async () => {
  const [org] = jsonLdBlocks(await readPage("en/index.html"));
  assert.equal(org["@type"], "Organization");
  assert.equal(org["@id"], `${CANONICAL_HOST}/#organization`);
  assert.equal(org.logo, `${CANONICAL_HOST}/Logo.png`);
  assert.equal(await exists("Logo.png"), true);
  assert.equal(org.contactPoint[0].email, "info@leesc.in");
  assert.ok(org.sameAs.length >= 1);
  for (const link of org.sameAs) assert.match(link, /^https:\/\//);
});

test("each service page has Service and Breadcrumb data that match its address and heading", async () => {
  for (const page of SERVICE_PAGES) {
    const html = await readPage(page);
    const blocks = jsonLdBlocks(html);
    assert.equal(blocks.length, 1, `${page}: one JSON-LD block`);
    const graph = blocks[0]["@graph"];
    const service = graph.find((item) => item["@type"] === "Service");
    const crumbs = graph.find((item) => item["@type"] === "BreadcrumbList");
    assert.ok(service && crumbs, `${page}: Service and BreadcrumbList`);
    const url = `${CANONICAL_HOST}/${page}`;
    const language = page.slice(0, 2);
    assert.equal(service.url, url, `${page}: service url`);
    assert.equal(service["@id"], `${url}#service`, `${page}: service id`);
    assert.equal(crumbs.itemListElement[0].item, `${CANONICAL_HOST}/${language}/`, `${page}: first breadcrumb`);
    assert.equal(crumbs.itemListElement[1].item, `${CANONICAL_HOST}/${language}/#services`, `${page}: second breadcrumb`);
    assert.equal(service.provider["@id"], `${CANONICAL_HOST}/#organization`);
    const title = firstElementText(html, "title");
    assert.ok(title.startsWith(service.name), `${page}: service name "${service.name}" vs title "${title}"`);
    assert.deepEqual(crumbs.itemListElement.map((c) => c.position), [1, 2, 3]);
    assert.equal(crumbs.itemListElement[2].item, url, `${page}: last breadcrumb`);
    assert.equal(crumbs.itemListElement[2].name, service.name);
  }
});

test("jsonLdBlocks throws on invalid JSON instead of hiding the problem", () => {
  assert.throws(() => jsonLdBlocks('<script type="application/ld+json">{bad</script>'), SyntaxError);
  assert.deepEqual(jsonLdBlocks("<p>none</p>"), []);
});

/* --------------------- Part 4: sliding service cards ----------------------- */

test("the home page service cards form a carousel with one named dot per card", async () => {
  for (const page of HOME_PAGES) await checkCarousel(page);
});

async function checkCarousel(page) {
  const html = await readPage(page);
  const tags = findAllTags(html);
  const track = tags.find((t) => t.attrs.id === "service-track");
  assert.ok(track, "track exists");
  assert.equal(track.attrs.tabindex, "0", "track can be reached with the keyboard");
  const carousel = tags.find((t) => t.attrs.id === "service-carousel");
  assert.equal(carousel.attrs.role, "region");
  assert.equal(carousel.attrs["aria-roledescription"], "carousel");

  const section = html.slice(html.indexOf('id="service-track"'), html.indexOf('id="health-check"'));
  const cards = (section.match(/<article class="card service-card"/g) ?? []).length;
  const dots = (section.match(/<button type="button" class="carousel-dot">/g) ?? []).length;
  assert.equal(cards, 7, "seven service cards");
  assert.equal(dots, cards, "one dot per card");

  const dotsGroup = tags.find((t) => t.attrs.id === "service-dots");
  assert.notEqual(dotsGroup.attrs.hidden, undefined, "dots stay hidden until JavaScript runs");
  assert.equal(dotsGroup.attrs.role, "group");
}

test("each carousel dot is named after its service, in the page language", async () => {
  for (const language of LANGUAGES) {
    const html = await readPage(`${language}/index.html`);
    const span = language === "th" ? '<span class="th" lang="th">' : '<span class="en">';
    const dotPattern = new RegExp(`<button type="button" class="carousel-dot"><span class="visually-hidden">${span}([^<]+)</span></span></button>`, "g");
    const headingPattern = new RegExp(`<h3 id="svc-[a-z]+">${span}([^<]+)</span></h3>`, "g");
    const dots = [...html.matchAll(dotPattern)].map((m) => m[1]);
    const headings = [...html.matchAll(headingPattern)].map((m) => m[1]);
    assert.equal(dots.length, 7, language);
    assert.deepEqual(dots, headings, language);
  }
});

test("main.js only starts the carousel when the home page markup is present", async () => {
  const main = await readFile(join(SITE, "assets/js/main.js"), "utf8");
  assert.match(main, /getElementById\("service-carousel"\) !== null/);
  assert.match(main, /import \{ initCarousel \} from "\.\/carousel\.js"/);
});
