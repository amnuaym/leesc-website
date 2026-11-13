/**
 * analytics.js
 *
 * Cookie banner and Google Analytics 4, wired to the rules in
 * analytics-logic.js. Google's script is added from here, and only after the
 * visitor allows the Analytics category, so the HTML pages never contain an external script.
 *
 * Counted events (only after acceptance): page views, email clicks, LINE
 * clicks, "Book a free talk" button clicks, and a "contact form" event when a valid
 * message is handed to the visitor's email program.
 * No form content is ever sent.
 */
import {
  GA_MEASUREMENT_ID,
  CONSENT_STORAGE_KEY,
  acceptAll,
  declineAll,
  makeConsent,
  parseConsent,
  serializeConsent,
  decideAnalytics,
  classifyLink,
} from "./analytics-logic.js";

function readSavedConsent() {
  try {
    return parseConsent(window.localStorage.getItem(CONSENT_STORAGE_KEY));
  } catch {
    return null; // storage blocked: treat as "no choice yet"
  }
}

function saveConsent(consent) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, serializeConsent(consent));
  } catch {
    // Storage blocked: the choice applies to this page view only.
  }
}

/** Adds Google's script and starts counting. Called only after acceptance. */
function loadAnalytics() {
  if (document.querySelector("script[data-ga]") !== null) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, { anonymize_ip: true });

  const script = document.createElement("script");
  script.async = true;
  script.dataset.ga = "true";
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
  document.head.append(script);

  document.addEventListener("click", (event) => {
    const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
    if (link === null) return;
    const name = classifyLink(link.getAttribute("href"));
    if (name !== null) window.gtag("event", name, { page_path: location.pathname });
  });
  const form = document.getElementById("contact-form");
  if (form !== null) {
    form.addEventListener("contact:mail-opened", () => window.gtag("event", "contact_form", { page_path: location.pathname }));
  }
}

/** Removes the Google cookies we may have set, when the visitor declines later. */
function clearAnalyticsCookies() {
  const host = location.hostname;
  for (const part of document.cookie.split(";")) {
    const name = part.split("=")[0].trim();
    if (name === "_ga" || name.startsWith("_ga_")) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${host.replace(/^www\./, "")}`;
    }
  }
}

/** One bilingual text. */
const t = (en, th) => `<span class="en">${en}</span><span class="th" lang="th">${th}</span>`;

/** One row of the Customize panel. */
function buildRow(id, title, text, { locked = false } = {}) {
  return (
    `<label class="cookie-row"><input type="checkbox" data-category="${id}"${locked ? " checked disabled" : ""}>` +
    `<span><strong>${title}</strong><br><span class="cookie-desc">${text}</span></span></label>`
  );
}

function buildBanner() {
  // Each language has its own privacy page; the 404 page sets its language before this runs.
  const privacy = `/${document.documentElement.lang === "th" ? "th" : "en"}/privacy.html`;
  const banner = document.createElement("div");
  banner.className = "cookie-banner";
  banner.setAttribute("role", "region");
  banner.setAttribute("aria-label", "Cookies");
  banner.innerHTML =
    "<p>" +
    t(
      `We use cookies to understand how our site is used. You can accept all, decline all, or choose by category. The site works the same either way. <a href="${privacy}">Privacy notice</a>`,
      `เราใช้คุกกี้เพื่อทำความเข้าใจการใช้งานเว็บไซต์ คุณเลือกยอมรับทั้งหมด ปฏิเสธทั้งหมด หรือเลือกตามหมวดหมู่ได้ และเว็บไซต์ใช้งานได้เหมือนเดิมไม่ว่าจะเลือกอย่างไร <a href="${privacy}">ประกาศความเป็นส่วนตัว</a>`,
    ) +
    "</p>" +
    '<div class="cookie-panel" hidden>' +
    buildRow("necessary", t("Necessary", "จำเป็น"), t("Always on. Remembers your language and your cookie choice in your browser. Not used for tracking.", "เปิดตลอด จดจำภาษาและตัวเลือกคุกกี้ของคุณในเบราว์เซอร์ ไม่ใช้เพื่อติดตาม"), { locked: true }) +
    buildRow("analytics", t("Analytics", "วิเคราะห์"), t("Google Analytics counts visits, pages viewed and clicks on our contact links.", "Google Analytics นับจำนวนผู้เข้าชม หน้าที่เปิดดู และการคลิกลิงก์ติดต่อของเรา")) +
    buildRow("marketing", t("Marketing", "การตลาด"), t("We do not use any marketing or advertising tools at the moment. This is here for the future.", "ขณะนี้เราไม่ได้ใช้เครื่องมือการตลาดหรือโฆษณา หมวดนี้เตรียมไว้สำหรับอนาคต")) +
    '<div class="cookie-actions"><button type="button" class="btn" data-action="save">' + t("Save my choices", "บันทึกตัวเลือกของฉัน") + "</button></div>" +
    "</div>" +
    '<div class="cookie-actions cookie-main-actions">' +
    '<button type="button" class="btn" data-action="accept-all">' + t("Accept all", "ยอมรับทั้งหมด") + "</button>" +
    '<button type="button" class="btn btn-outline" data-action="decline-all">' + t("Decline all", "ปฏิเสธทั้งหมด") + "</button>" +
    '<button type="button" class="btn btn-outline" data-action="customize" aria-expanded="false">' + t("Customize", "ปรับแต่ง") + "</button>" +
    "</div>";
  return banner;
}

/** Applies a choice: remember it, close the banner, start or stop analytics. */
function applyConsent(banner, consent) {
  saveConsent(consent);
  banner.remove();
  if (consent.analytics) loadAnalytics();
  else clearAnalyticsCookies();
}

function showBanner() {
  if (document.querySelector(".cookie-banner") !== null) return;
  const banner = buildBanner();
  const panel = banner.querySelector(".cookie-panel");
  const mainActions = banner.querySelector(".cookie-main-actions");

  // When the visitor reopens the banner, show their current choice. A new visitor sees everything unticked.
  const current = readSavedConsent() ?? declineAll();
  for (const box of banner.querySelectorAll("input[data-category]")) {
    if (!box.disabled) box.checked = current[box.dataset.category] === true;
  }

  banner.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest("button[data-action]") : null;
    if (button === null) return;
    const action = button.dataset.action;
    if (action === "accept-all") applyConsent(banner, acceptAll());
    else if (action === "decline-all") applyConsent(banner, declineAll());
    else if (action === "customize") {
      panel.hidden = false;
      mainActions.hidden = true; // the panel has its own Save button
      panel.querySelector("input:not([disabled])").focus();
    } else if (action === "save") {
      const choices = {};
      for (const box of banner.querySelectorAll("input[data-category]:not([disabled])")) {
        choices[box.dataset.category] = box.checked;
      }
      applyConsent(banner, makeConsent(choices));
    }
  });
  document.body.append(banner);
}

export function initAnalytics() {
  const action = decideAnalytics(GA_MEASUREMENT_ID, readSavedConsent());
  if (action === "load") loadAnalytics();
  if (action === "ask") showBanner();

  // Any element marked data-cookie-settings (the privacy page has one) reopens the choice.
  // Hidden when analytics is not configured, because there is nothing to choose.
  for (const control of document.querySelectorAll("[data-cookie-settings]")) {
    if (action === "off") {
      control.hidden = true;
      continue;
    }
    control.addEventListener("click", showBanner);
  }
}
