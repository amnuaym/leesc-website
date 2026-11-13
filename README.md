# Lee Solutions and Consulting — website

Static website for https://www.leesc.in, published with GitHub Pages straight from the root of this repository. `index.html` is the home page.

- **No dependencies.** Plain HTML, CSS and JavaScript. The Thai and English pages are generated from `src/` by one small script (`npm run build`), and the generated files are committed, so GitHub Pages needs no build step. No frameworks, no external fonts. Google Analytics is built in but stays off until a Measurement ID is set in `assets/js/analytics-logic.js`; it loads only after a visitor accepts the cookie banner.
- **Node.js is only needed for the tests and the preflight check** (version 20 or newer, built-in modules only).
- **Two languages, two sets of pages:** `/th/` (Thai) and `/en/` (English). The site address `/` sends visitors to the right one by their saved choice or browser language. See "Language (Thai / English)" below.

## Folder layout

```
src/                        THE SOURCE: edit these. Each text is written twice (class="en" and class="th")
  index.html                home page
  privacy.html              privacy notice
  404.html                  "page not found" page
  services/                 one page per service area (seven pages, see "Adding a service")
scripts/build-languages.mjs generates the folders below from src/ (npm run build)
scripts/site-config.mjs     the page list, sitemap dates and the Thai head text (titles, descriptions, labels)
th/  en/                    GENERATED Thai and English pages. Do not edit by hand
index.html                  the site's root page: a hand-written language chooser (not generated)
404.html                    GENERATED copy of src/404.html (it picks its own language in the browser)
privacy.html, services/     GENERATED small redirect pages at the old addresses, pointing to /th/...
sitemap.xml                 GENERATED: every page in both languages, with hreflang links
Logo.png, favicon.svg       logo and browser-tab icon
CNAME                       tells GitHub Pages the custom domain: www.leesc.in
.nojekyll                   tells GitHub Pages to serve the files as they are
robots.txt                  search-engine rules (src/ is disallowed)
assets/css/styles.css       all styling; colour tokens are at the top
assets/js/main.js           wires the page up: contact form, hero box, steps, language switch, analytics
assets/js/contact-logic.js  contact form checks and the mailto link (unit tested)
assets/js/hero-logic.js     checks the email box at the top of the home page
assets/js/steps.js          the interactive "How we work" steps
assets/js/language.js       rules for the Thai / English choice and browser-language detection
assets/js/redirect.js       root page and old addresses: sends visitors to /th/ or /en/
assets/js/analytics-logic.js cookie-choice rules and the GA4 Measurement ID (unit tested)
assets/js/analytics.js      cookie banner and Google Analytics loader
scripts/                    helper scripts for preflight, the language build and the tests
tests/                      automated tests
backup/                     old copies kept on this computer (not published, ignored by git)
```

## Publishing on GitHub Pages

1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Set **Source** to **Deploy from a branch**, branch **main**, folder **/ (root)**.
4. Keep `CNAME` containing `www.leesc.in`, and point the DNS record for `www` to GitHub Pages.

GitHub Pages is case-sensitive, so file names in the code must match the files exactly (for example `Logo.png`, not `logo.png`).

Before every publish:

1. Run `npm run build` after any change in `src/` or `scripts/site-config.mjs`, and commit the generated files. A test fails if they are out of date.
2. Run `npm run preflight`. It lists any `{{PLACEHOLDER}}` still left and fails until none remain.
3. Run `npm test`. All tests must pass.

## Commands

| Command | What it does |
|---|---|
| `npm run build` | Writes `th/`, `en/`, `404.html`, the old-address redirect pages and `sitemap.xml` from `src/`. |
| `npm test` | Runs all automated tests (logic, colour contrast, links, structure, bilingual text). |
| `npm run preflight` | Lists unfinished `{{PLACEHOLDER}}` text in the website files. |
| `python -m http.server 8080` | Preview the site at http://localhost:8080. Run it from this folder. On macOS or Linux, use `python3`. |

The contact form needs a web server to work, so do not open the HTML files by double-clicking them.

## Language (Thai / English)

- **Edit `src/`, never `th/` or `en/`.** In `src/` each visible text is written twice: `<span class="en">…</span><span class="th" lang="th">…</span>`. `npm run build` keeps one language per page, so `/th/…` has only Thai and `/en/…` only English. Links in `src/` are written as root paths such as `/index.html#contact` or `/services/ai-adoption.html`, and the build moves them into the language folder.
- **Head text that is not visible** (page titles, descriptions, share text, screen-reader labels, structured data) is English in `src/`. The Thai version lives in `scripts/site-config.mjs`. The build stops with a message if an English text changes and its Thai entry no longer matches, so change both together.
- **The TH | EN switch** is a plain link to the same page in the other language. Clicking it saves the choice in the visitor's browser (`site-language`) and keeps the `#section` being read.
- **The root address `/`** (`index.html`, hand-written) sends visitors to `/th/` or `/en/` with `assets/js/redirect.js`: saved choice first, then the browser's language list (Thai goes to `/th/`, anything else to `/en/`). Without JavaScript, and for search engines, it is a page with two plain links.
- **Old addresses** (`/privacy.html`, `/services/*.html`) are small pages that redirect to `/th/…` and say so to search engines (`canonical`). A visitor who earlier chose English is sent to `/en/…`.
- **Search engines:** every page lists its twin with `hreflang`; the sitemap does too. For the home page `x-default` is `/`; for other pages it is the English page.
- **404 page:** one page for every missing address. It shows Thai or English by the saved choice or browser language.
- **Cookie banner and privacy notice** follow the page language automatically.
- Contact form topics keep their English value; the dropdown label is Thai on the Thai page.
- Validation and status messages in the contact form are English only, on both language pages.

## Adding a service

A new service area needs changes in these places. Work in `src/`, then build.

1. Create `src/services/<name>.html`, copying an existing service page. Write both English and Thai text, and use root paths for links.
2. Add the page to `PAGES` (with a `lastmod` date) and its English and Thai title, service name and description to `THAI_BY_PAGE`, both in `scripts/site-config.mjs`.
3. Add a card for it in the `.cards` grid on `src/index.html`, and add a link to its page.
4. Add its link to the **Services** list in the footer of `src/index.html` and of every service page.
5. Update the "Service X of N" labels and the "All N service areas" links, so the count is right on every page.
6. Add the topic to `TOPICS` in `assets/js/contact-logic.js`, and add an `<option>` with the same value and a `data-th` Thai label in the `<select>` on `src/index.html`. A test fails if they differ.
7. Add the file to `SERVICE_FILES` in `tests/site.test.mjs`.
8. Run `npm run build`, then `npm test`. The sitemap is regenerated by the build.

## Changing things

- **Colours:** edit the `--color-…` lines at the top of `assets/css/styles.css` (light and dark blocks). Keep them as 6-digit hex colours. `npm test` checks that the text stays readable.
- **Logo:** replace `Logo.png` at the root, keeping the same name. Every page uses it in the header.
- **Wording:** change the English and Thai text in the same place in `src/`, then run `npm run build`. Keep the two languages in step.
- **Contact address:** change `data-recipient` on the form in `src/index.html`, the visible `mailto:` links, and the `email` in the structured data block, then run `npm run build`.

## How the contact form works

The website cannot send email by itself. The form checks the visitor's input, then opens the visitor's own email program with the message filled in. The visitor presses send there. If you later want messages delivered without the visitor's email program, you will need a form service or your own small server.

## Release notes

### Version 1.1.0 — 2026-11-09

- **Interactive flash cards:** Elevated styling and smooth scaling for the active card in the middle. The service number badge lights up with the accent color. Inactive side cards can be clicked directly to slide them to the center.
- **Infinite looping:** Cloned card sets before and after allow circular sliding past card 07 to card 01, and before card 01 to card 07. Silent scroll normalization resets position to the middle cycle without visual flicker.
- **Accurate dot alignment:** Dot indicators now strictly match the card shown in the middle of the screen using viewport coordinates (`getBoundingClientRect`).
- **Smooth sliding controls:** Added Previous and Next circular navigation buttons, keyboard arrow controls (Left Arrow and Right Arrow keys), and desktop mouse drag-to-scroll support. All 130 tests pass.
