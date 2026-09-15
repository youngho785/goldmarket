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
