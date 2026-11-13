/**
 * site-config.mjs
 *
 * The list of pages that build-languages.mjs turns into /th/ and /en/ pages,
 * and the Thai text for the places that are not visible page text (titles,
 * descriptions, share tags, screen-reader labels, structured data).
 *
 * Visible text is already written twice in each file in src/ (class="en" and
 * class="th"), so it is not repeated here.
 */

export const HOST = "https://www.leesc.in";
export const LANGUAGES = Object.freeze(["th", "en"]);

/**
 * Pages that exist in both languages. `file` is the address below /th/ and /en/.
 * `lastmod` goes into sitemap.xml: change it when a page's content changes.
 */
export const PAGES = Object.freeze([
  { file: "index.html", lastmod: "2026-11-13" },
  { file: "privacy.html", lastmod: "2026-11-13" },
  { file: "services/digital-transformation.html", lastmod: "2026-11-13" },
  { file: "services/solution-consulting.html", lastmod: "2026-11-13" },
  { file: "services/it-operations-governance.html", lastmod: "2026-11-13" },
  { file: "services/ai-adoption.html", lastmod: "2026-11-13" },
  { file: "services/cyber-security.html", lastmod: "2026-11-13" },
  { file: "services/project-management.html", lastmod: "2026-11-13" },
  { file: "services/thailand-market-entry.html", lastmod: "2026-11-13" },
]);

/** Old addresses that now redirect to /th/... (everything except the home page). */
export const OLD_ADDRESSES = Object.freeze(PAGES.filter((page) => page.file !== "index.html").map((page) => page.file));

const COMPANY = "ลี โซลูชันส์ แอนด์ คอนซัลติ้ง";

/**
 * English text (exactly as it appears in a quoted attribute, in a JSON-LD
 * string, or in <title>) -> Thai text. The build fails if an entry is no
 * longer found, so this list cannot silently go out of date.
 */
export const THAI_EVERYWHERE = Object.freeze({
  "Lee Solutions and Consulting Co., Ltd.": `บริษัท ${COMPANY} จำกัด`,
  "Lee Solutions and Consulting: clear, safe technology for Thai businesses": `${COMPANY}: เทคโนโลยีที่ชัดเจนและปลอดภัยสำหรับธุรกิจไทย`,
  Home: "หน้าแรก",
  Services: "บริการ",
  Main: "เมนูหลัก",
  "The 90-day plan": "แผน 90 วัน",
  "Chat with us on LINE": "แชตกับเราทาง LINE",
  Breadcrumb: "เส้นทางนำทาง",
  Qualifications: "คุณวุฒิ",
  "Tools and languages we work with": "เครื่องมือและภาษาที่เราใช้งาน",
  "Previous service": "บริการก่อนหน้า",
  "Next service": "บริการถัดไป",
  "Footer: what we do": "ส่วนท้าย: สิ่งที่เราทำ",
  "Footer: company": "ส่วนท้าย: บริษัท",
  "Footer: help": "ส่วนท้าย: ความช่วยเหลือ",
  "Footer: services": "ส่วนท้าย: บริการ",
});

const SUFFIX_EN = "Lee Solutions and Consulting";

/** Per page: [English, Thai] pairs for the title, the description and the service name. */
export const THAI_BY_PAGE = Object.freeze({
  "index.html": [
    [`${SUFFIX_EN} | Clear, Safe Technology`, `${COMPANY} | เทคโนโลยีชัดเจนและปลอดภัย`],
    [
      "Digital transformation, AI adoption, cyber security, project management and Thailand market entry: seven services for Thai and international companies.",
      "การเปลี่ยนผ่านดิจิทัล การนำ AI มาใช้ ความมั่นคงปลอดภัยไซเบอร์ การบริหารโครงการ และการเข้าสู่ตลาดไทย: เจ็ดบริการสำหรับบริษัทไทยและต่างประเทศ",
    ],
    [
      "Seven service areas: digital transformation, solution consulting, IT operation and governance, AI adoption, cyber security, project management and Thailand market entry.",
      "เจ็ดด้านบริการ: การเปลี่ยนผ่านดิจิทัล การให้คำปรึกษาด้านโซลูชัน การดำเนินงานไอทีและธรรมาภิบาล การนำ AI มาใช้ ความมั่นคงปลอดภัยไซเบอร์ การบริหารโครงการ และการเข้าสู่ตลาดไทย",
    ],
  ],
  "privacy.html": [
    [`Privacy notice | ${SUFFIX_EN}`, `ประกาศความเป็นส่วนตัว | ${COMPANY}`],
    [
      "How Lee Solutions and Consulting Co., Ltd. handles personal data collected through this website, in plain language.",
      `${"บริษัท " + COMPANY + " จำกัด"} จัดการข้อมูลส่วนบุคคลที่เก็บผ่านเว็บไซต์นี้อย่างไร อธิบายด้วยภาษาที่เข้าใจง่าย`,
    ],
  ],
  "services/digital-transformation.html": [
    [`Digital Transformation | ${SUFFIX_EN}`, `การเปลี่ยนผ่านดิจิทัล | ${COMPANY}`],
    ["Digital Transformation", "การเปลี่ยนผ่านดิจิทัล"],
    [
      "Digital strategy, process redesign, accounting systems, automation with UiPath or open-source tools, and connected reporting, delivered in small, affordable steps for Thai companies.",
      "กลยุทธ์ดิจิทัล การออกแบบกระบวนการใหม่ ระบบบัญชี ระบบอัตโนมัติด้วย UiPath หรือเครื่องมือโอเพนซอร์ส และรายงานที่เชื่อมต่อกัน ทำทีละขั้นเล็ก ๆ ที่จ่ายไหวสำหรับบริษัทไทย",
    ],
  ],
  "services/solution-consulting.html": [
    [`Solution Consulting | ${SUFFIX_EN}`, `การให้คำปรึกษาด้านโซลูชัน | ${COMPANY}`],
    ["Solution Consulting", "การให้คำปรึกษาด้านโซลูชัน"],
    [
      "Independent advice on requirements, solution design, software selection, contract review and project oversight, so you invest in technology with confidence.",
      "คำแนะนำที่เป็นอิสระเรื่องความต้องการ การออกแบบโซลูชัน การเลือกซอฟต์แวร์ การทบทวนสัญญา และการกำกับโครงการ เพื่อให้คุณลงทุนด้านเทคโนโลยีได้อย่างมั่นใจ",
    ],
  ],
  "services/it-operations-governance.html": [
    [`IT Operation and Governance | ${SUFFIX_EN}`, `การดำเนินงานไอทีและธรรมาภิบาล | ${COMPANY}`],
    ["IT Operation and Governance", "การดำเนินงานไอทีและธรรมาภิบาล"],
    [
      "Safe, clear IT operations and board-level governance: IT rules, service processes, cyber security, Thai regulatory readiness and a fixed-price Health Check.",
      "การดำเนินงานไอทีที่ปลอดภัยและชัดเจน พร้อมธรรมาภิบาลระดับคณะกรรมการ: กฎด้านไอที กระบวนการให้บริการ ความมั่นคงไซเบอร์ ความพร้อมตามกฎหมายไทย และการตรวจสุขภาพเทคโนโลยีราคาคงที่",
    ],
  ],
  "services/ai-adoption.html": [
    [`AI Adoption | ${SUFFIX_EN}`, `การนำ AI มาใช้ | ${COMPANY}`],
    ["AI Adoption", "การนำ AI มาใช้"],
    [
      "Practical AI adoption for Thai businesses: readiness checks, use-case selection, AI builds with the ADLC method, quality checks, policy and team training.",
      "การนำ AI มาใช้จริงสำหรับธุรกิจไทย: ตรวจความพร้อม เลือกกรณีใช้งาน สร้าง AI ด้วยวิธี ADLC ตรวจคุณภาพ กำหนดนโยบาย และอบรมทีมงาน",
    ],
  ],
  "services/cyber-security.html": [
    [`Cyber Security | ${SUFFIX_EN}`, `ความมั่นคงปลอดภัยไซเบอร์ | ${COMPANY}`],
    ["Cyber Security", "ความมั่นคงปลอดภัยไซเบอร์"],
    [
      "Security assessments, access control, monitoring, incident response and staff training for Thai companies, delivered in clear, practical steps.",
      "การประเมินความปลอดภัย การควบคุมการเข้าถึง การเฝ้าระวัง การรับมือเหตุการณ์ และการอบรมพนักงานสำหรับบริษัทไทย ทำเป็นขั้นตอนที่ชัดเจนและนำไปใช้ได้จริง",
    ],
  ],
  "services/project-management.html": [
    [`Project Management | ${SUFFIX_EN}`, `การบริหารโครงการ | ${COMPANY}`],
    ["Project Management", "การบริหารโครงการ"],
    [
      "Project planning, scope and budget control, risk management and go-live support, so technology projects finish on time and within budget.",
      "การวางแผนโครงการ การคุมขอบเขตและงบประมาณ การบริหารความเสี่ยง และการดูแลช่วงขึ้นระบบจริง เพื่อให้โครงการเทคโนโลยีเสร็จตรงเวลาและไม่เกินงบ",
    ],
  ],
  "services/thailand-market-entry.html": [
    [`Thailand Market Entry | ${SUFFIX_EN}`, `การเข้าสู่ตลาดไทย | ${COMPANY}`],
    ["Thailand Market Entry", "การเข้าสู่ตลาดไทย"],
    [
      "Market entry planning for international companies in Thailand: channel and partner strategy, partner search and management, launch support and a clear first-year plan.",
      "การวางแผนเข้าสู่ตลาดไทยสำหรับบริษัทต่างประเทศ: กลยุทธ์ช่องทางและพันธมิตร การค้นหาและบริหารพันธมิตร การสนับสนุนการเปิดตัว และแผนปีแรกที่ชัดเจน",
    ],
  ],
});
