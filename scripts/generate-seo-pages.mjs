import fs from "node:fs";
import path from "node:path";
import {
  DEFAULT_OG_IMAGE,
  INDEXABLE_PATHS,
  SITE_NAME,
  buildRouteSchema,
  buildSiteSchema,
  getSeoForPath,
} from "../src/config/seo.js";
import { getGoldGuide } from "../src/data/goldGuides.js";

const distDir = path.resolve(process.env.SEO_DIST_DIR || "dist");
const indexPath = path.join(distDir, "index.html");

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function replaceTitle(html, title) {
  return html.replace(
    /<title>[\s\S]*?<\/title>/i,
    `<title>${escapeHtml(title)}</title>`
  );
}

function replaceMeta(html, attribute, key, content) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(
    `<meta\\s+([^>]*?${attribute}=["']${escapedKey}["'][^>]*?)>`,
    "i"
  );

  return html.replace(pattern, (tag) => {
    const escapedContent = escapeHtml(content);
    if (/\bcontent=["'][\s\S]*?["']/i.test(tag)) {
      return tag.replace(
        /\bcontent=["'][\s\S]*?["']/i,
        `content="${escapedContent}"`
      );
    }
    return tag.replace(/\s*\/?>(\s*)$/, ` content="${escapedContent}" />$1`);
  });
}

function replaceLink(html, rel, href, hreflang = null) {
  const pattern = hreflang
    ? /<link\s+[^>]*rel=["']alternate["'][^>]*hreflang=["']ko-KR["'][^>]*>/i
    : /<link\s+[^>]*rel=["']canonical["'][^>]*>/i;

  const tag = hreflang
    ? `<link rel="${rel}" hreflang="${hreflang}" href="${escapeHtml(href)}" />`
    : `<link rel="${rel}" href="${escapeHtml(href)}" />`;

  return html.replace(pattern, tag);
}

function setBaseSchema(html) {
  const schema = buildSiteSchema();
  const script = `<script id="kgm-site-schema" type="application/ld+json">\n${JSON.stringify(
    schema,
    null,
    2
  )}\n    </script>`;

  return html.replace(
    /<script id=["']kgm-site-schema["'] type=["']application\/ld\+json["']>[\s\S]*?<\/script>/i,
    script
  );
}

function setRouteSchema(html, schema) {
  const withoutOldRouteSchema = html.replace(
    /\s*<script id=["']kgm-route-schema["'] type=["']application\/ld\+json["']>[\s\S]*?<\/script>/i,
    ""
  );

  if (!schema) return withoutOldRouteSchema;

  const script = `\n    <script id="kgm-route-schema" type="application/ld+json">\n${JSON.stringify(
    schema,
    null,
    2
  )}\n    </script>\n`;

  return withoutOldRouteSchema.replace(/\s*<\/head>/i, `${script}  </head>`);
}


function staticBodyForRoute(pathname) {
  const seo = getSeoForPath(pathname);
  const guideMatch = String(pathname).match(/^\/guide\/([^/]+)$/);
  const guide = guideMatch ? getGoldGuide(guideMatch[1]) : null;

  const routeCopy = {
    "/": {
      heading: "내 금, 오늘 얼마일까요?",
      lead: "14K·18K·순금의 종류와 중량을 확인하고 MY GOLD에 기록하면 오늘 가치와 이후의 변화를 계속 확인할 수 있습니다.",
      links: [["/gold-value", "내 금 계산하기"], ["/my-gold", "MY GOLD 보기"], ["/gold-price", "오늘 금시세"]],
    },
    "/gold-price": {
      heading: "오늘 순금·18K·14K 금시세",
      lead: "한국골드마켓은 공개 금시세를 바탕으로 오늘 가격과 전일 대비 흐름을 보여주며, 보유 금의 중량을 입력하면 현재 참고가치까지 이어서 확인할 수 있습니다.",
      links: [["/gold-value", "내 금 가치 계산"], ["/my-gold", "MY GOLD에 기록"]],
    },
    "/gold-value": {
      heading: "14K·18K·순금 오늘 가치 계산",
      lead: "금 종류와 중량을 입력하면 현재 공개 시세 기준 참고가치와 예상 순금량을 확인할 수 있습니다. 계산 후 MY GOLD에 기록하면 다음 방문에도 가치를 이어서 볼 수 있습니다.",
      links: [["/my-gold", "MY GOLD 시작"], ["/gold-price", "오늘 금시세"]],
    },
    "/my-gold": {
      heading: "MY GOLD · 내가 가진 금을 기록하는 공간",
      lead: "MY GOLD는 금을 맡기거나 예치하는 서비스가 아닙니다. 내가 실제로 가진 14K·18K·순금의 종류와 중량을 기록해 오늘 참고가치와 변화를 확인하는 개인 금 기록 공간입니다.",
      links: [["/gold-value", "내 금 먼저 계산"], ["/gold-to-gold", "GOLD TO GOLD 알아보기"]],
    },
    "/gold-to-gold": {
      heading: "보유 금의 가치를 999.9 GOLD로 이어가기",
      lead: "사용하지 않는 14K·18K·순금의 예상 순금량을 확인하고, 부산 원일귀금속에서 실제 순도·중량과 공임을 확인한 뒤 동의하면 999.9 골드바로 교환할 수 있습니다.",
      links: [["/gold-exchange", "예상 교환량 계산"], ["/stores", "부산 방문안내"]],
    },
    "/gold-exchange": {
      heading: "금교환 예상 순금량·골드바 조합 계산",
      lead: "여러 금 제품을 합산해 예상 순금량과 가능한 999.9 골드바 조합을 먼저 확인합니다. 온라인 결과는 예상값이며 실제 교환은 매장 실측 후 확정합니다.",
      links: [["/gold-to-gold", "교환 방식 보기"], ["/stores", "부산 방문안내"]],
    },
    "/stores": {
      heading: "부산 한국골드마켓 방문안내",
      lead: "한국골드마켓의 실제 실측·확인·GOLD TO GOLD 교환은 현재 부산 범천동 원일귀금속에서 직접 운영합니다. 온라인 계산은 예상값이며 현장에서 순도·중량·비용을 함께 확인합니다.",
      links: [["/gold-exchange", "방문 전 예상 계산"], ["/reviews", "교환 후기"]],
    },
    "/guide": {
      heading: "금 무게·순도·가치 확인 가이드",
      lead: "금 1돈과 g 환산, 14K·18K 각인, 돌반지와 오래된 주얼리의 가치 확인처럼 실제 보유 금을 이해할 때 자주 묻는 내용을 정리했습니다.",
      links: [["/gold-value", "내 금 계산"], ["/gold-price", "오늘 금시세"]],
    },
  };

  const copy = guide
    ? {
        heading: guide.title,
        lead: `${guide.directAnswer || guide.summary} ${guide.summary || ""}`.trim(),
        links: Array.isArray(guide.actions)
          ? guide.actions.slice(0, 3).map((action) => [action.to, action.label])
          : [["/gold-value", "내 금 계산"]],
      }
    : routeCopy[pathname] || {
        heading: seo.ogTitle || seo.title,
        lead: seo.description,
        links: [["/", "한국골드마켓 홈"]],
      };

  const links = copy.links
    .map(([href, label]) => `<a href="${escapeHtml(href)}" style="display:inline-block;margin:6px 8px 0 0;padding:9px 12px;border:1px solid #c8ad72;border-radius:10px;color:#0d2034;text-decoration:none;font-weight:700">${escapeHtml(label)}</a>`)
    .join("");

  return `<main data-kgm-static-seo="true" style="max-width:920px;margin:0 auto;padding:32px 20px 48px;font-family:Arial,'Malgun Gothic',sans-serif;color:#1f2937;line-height:1.7">
    <article>
      <p style="margin:0 0 8px;color:#876b2b;font-size:13px;font-weight:800;letter-spacing:.08em">KOREA GOLD MARKET</p>
      <h1 style="margin:0;color:#0d2034;font-size:clamp(28px,5vw,44px);line-height:1.2">${escapeHtml(copy.heading)}</h1>
      <p style="margin:16px 0 0;max-width:760px;font-size:16px">${escapeHtml(copy.lead)}</p>
      <nav aria-label="관련 서비스" style="margin-top:18px">${links}</nav>
      <p style="margin:24px 0 0;color:#6b7280;font-size:13px">온라인 금액과 교환량은 참고용 예상값이며, 실제 GOLD TO GOLD 교환은 부산 원일귀금속에서 실물 순도·중량·비용을 확인하고 고객 동의 후 확정합니다.</p>
    </article>
  </main>`;
}

function setStaticBody(html, pathname) {
  const body = staticBodyForRoute(pathname);
  return html.replace(/<div id=["']root["']>\s*<\/div>/i, `<div id="root">${body}</div>`);
}

function renderRouteHtml(template, pathname) {
  const seo = getSeoForPath(pathname);
  let html = setBaseSchema(template);

  html = replaceTitle(html, seo.title);
  html = replaceMeta(html, "name", "description", seo.description);
  html = replaceMeta(html, "name", "robots", seo.robots);
  html = replaceLink(html, "canonical", seo.canonical);
  html = replaceLink(html, "alternate", seo.canonical, "ko-KR");

  html = replaceMeta(html, "property", "og:type", "website");
  html = replaceMeta(html, "property", "og:locale", "ko_KR");
  html = replaceMeta(html, "property", "og:site_name", SITE_NAME);
  html = replaceMeta(html, "property", "og:title", seo.ogTitle || seo.title);
  html = replaceMeta(
    html,
    "property",
    "og:description",
    seo.ogDescription || seo.description
  );
  html = replaceMeta(html, "property", "og:url", seo.canonical);
  html = replaceMeta(html, "property", "og:image", DEFAULT_OG_IMAGE);
  html = replaceMeta(html, "property", "og:image:width", "1200");
  html = replaceMeta(html, "property", "og:image:height", "630");
  html = replaceMeta(
    html,
    "property",
    "og:image:alt",
    seo.imageAlt || SITE_NAME
  );

  html = replaceMeta(html, "name", "twitter:card", "summary_large_image");
  html = replaceMeta(html, "name", "twitter:title", seo.ogTitle || seo.title);
  html = replaceMeta(
    html,
    "name",
    "twitter:description",
    seo.ogDescription || seo.description
  );
  html = replaceMeta(html, "name", "twitter:image", DEFAULT_OG_IMAGE);
  html = setStaticBody(html, pathname);

  return setRouteSchema(html, buildRouteSchema(pathname));
}

function assertRouteHtml(html, pathname) {
  const seo = getSeoForPath(pathname);
  const requiredFragments = [
    `<title>${escapeHtml(seo.title)}</title>`,
    `rel="canonical" href="${escapeHtml(seo.canonical)}"`,
    `property="og:url" content="${escapeHtml(seo.canonical)}"`,
    `name="robots" content="${escapeHtml(seo.robots)}"`,
    'id="kgm-site-schema"',
    'id="kgm-route-schema"',
    'data-kgm-static-seo="true"',
  ];

  const missing = requiredFragments.filter((fragment) => !html.includes(fragment));
  if (missing.length > 0) {
    throw new Error(
      `SEO HTML validation failed for ${pathname}: ${missing.join(", ")}`
    );
  }
}

function outputPathForRoute(pathname) {
  if (pathname === "/") return indexPath;
  return path.join(distDir, `${pathname.replace(/^\//, "")}.html`);
}

function generate() {
  if (!fs.existsSync(indexPath)) {
    throw new Error(`Vite output not found: ${indexPath}`);
  }

  const template = fs.readFileSync(indexPath, "utf8");

  for (const pathname of INDEXABLE_PATHS) {
    const outputPath = outputPathForRoute(pathname);
    const html = renderRouteHtml(template, pathname);
    assertRouteHtml(html, pathname);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, html, "utf8");
    console.log(`SEO HTML  ${pathname} -> ${path.relative(process.cwd(), outputPath)}`);
  }

  console.log(`한국골드마켓 SEO HTML ${INDEXABLE_PATHS.length}개 생성 완료`);
}

generate();
