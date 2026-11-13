/**
 * analytics.js
 *
 * Cookie banner and Google Analytics 4, wired to the rules in
 * analytics-logic.js. Google's script is added from here, and only after the
 * visitor accepts, so the HTML pages never contain an external script.
 *
 * Counted events (only after acceptance): page views, email clicks, LINE
 * clicks, and a "contact form" event when the message form is used.
 * No form content is ever sent.
 */
import {
  GA_MEASUREMENT_ID,
  CONSENT_STORAGE_KEY,
  decideAnalytics,
  classifyLink,
} from "./analytics-logic.js";

function readSavedChoice() {
  try {
    return window.localStorage.getItem(CONSENT_STORAGE_KEY);
  } catch {
    return null; // storage blocked: treat as "no choice yet"
  }
}

function saveChoice(choice) {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
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
    form.addEventListener("submit", () => window.gtag("event", "contact_form", { page_path: location.pathname }));
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

function buildBanner() {
  const banner = document.createElement("div");
  banner.className = "cookie-banner";
  banner.setAttribute("role", "region");
  banner.setAttribute("aria-label", "Cookies");
  banner.innerHTML =
    '<p><span class="en">We would like to use analytics cookies to count visits to our pages. This helps us see which services interest visitors. It is your choice, and the site works the same either way. <a href="/privacy.html">Privacy notice</a></span>' +
    '<span class="th" lang="th">เราต้องการใช้คุกกี้วิเคราะห์เพื่อนับจำนวนผู้เข้าชมหน้าเว็บ เพื่อดูว่าบริการใดได้รับความสนใจ คุณเลือกได้ และเว็บไซต์ใช้งานได้เหมือนเดิมไม่ว่าจะเลือกอย่างไร <a href="/privacy.html">ประกาศความเป็นส่วนตัว</a></span></p>' +
    '<div class="cookie-actions">' +
    '<button type="button" class="btn" data-consent="accepted"><span class="en">Accept</span><span class="th" lang="th">ยอมรับ</span></button>' +
    '<button type="button" class="btn btn-outline" data-consent="declined"><span class="en">Decline</span><span class="th" lang="th">ปฏิเสธ</span></button>' +
    "</div>";
  return banner;
}

function showBanner() {
  if (document.querySelector(".cookie-banner") !== null) return;
  const banner = buildBanner();
  banner.addEventListener("click", (event) => {
    const button = event.target instanceof Element ? event.target.closest("button[data-consent]") : null;
    if (button === null) return;
    const choice = button.dataset.consent;
    saveChoice(choice);
    banner.remove();
    if (choice === "accepted") loadAnalytics();
    else clearAnalyticsCookies();
  });
  document.body.append(banner);
}

export function initAnalytics() {
  const action = decideAnalytics(GA_MEASUREMENT_ID, readSavedChoice());
  if (action === "load") loadAnalytics();
  if (action === "ask") showBanner();

  // Any element marked data-cookie-settings (the privacy page has one) reopens the choice.
  // Hidden when analytics is not configured, because there is nothing to choose.
  for (const control of document.querySelectorAll("[data-cookie-settings]")) {
    if (action === "off") {
      control.hidden = true;
      continue;
    }
    control.addEventListener("click", () => {
      try {
        window.localStorage.removeItem(CONSENT_STORAGE_KEY);
      } catch {
        // Nothing saved to remove.
      }
      showBanner();
    });
  }
}
