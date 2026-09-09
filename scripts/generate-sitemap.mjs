import fs from "node:fs";
import path from "node:path";

const outDir = path.resolve(process.env.SITEMAP_OUT_DIR || "public");
const baseUrl = "https://koreagoldmarket.com";

function escapeXml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function cdata(value) {
  return String(value ?? "").replaceAll("]]>", "]]]]><![CDATA[>");
}

async function generate() {
  const staticUrls = [
    { loc: `${baseUrl}/`, changefreq: "weekly", priority: 1.0 },
    { loc: `${baseUrl}/gold-price`, changefreq: "daily", priority: 1.0 },
    { loc: `${baseUrl}/gold-exchange`, changefreq: "weekly", priority: 1.0 },
    { loc: `${baseUrl}/my-gold`, changefreq: "weekly", priority: 0.9 },
    { loc: `${baseUrl}/gold-to-gold`, changefreq: "monthly", priority: 0.9 },
    { loc: `${baseUrl}/goldbar-fee`, changefreq: "monthly", priority: 0.8 },
    { loc: `${baseUrl}/stores`, changefreq: "monthly", priority: 0.8 },
    { loc: `${baseUrl}/reviews`, changefreq: "weekly", priority: 0.6 },
    { loc: `${baseUrl}/terms`, changefreq: "yearly", priority: 0.3 },
    { loc: `${baseUrl}/privacy`, changefreq: "yearly", priority: 0.3 },
  ];

  const sitemap =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    staticUrls
      .map((url) =>
        [
          "  <url>",
          `    <loc>${escapeXml(url.loc)}</loc>`,
          `    <changefreq>${url.changefreq}</changefreq>`,
          `    <priority>${url.priority}</priority>`,
          url.lastmod ? `    <lastmod>${url.lastmod}</lastmod>` : null,
          "  </url>",
        ].filter(Boolean).join("\n")
      )
      .join("\n") +
    `\n</urlset>`;

  const rssEntries = [
    {
      title: "오늘의 한국골드마켓 금시세",
      path: "/gold-price",
      description: "순금·18K·14K 금시세와 전일 대비 변화를 확인합니다.",
    },
    {
      title: "내 금 예상 중량과 골드바 조합 계산",
      path: "/gold-exchange",
      description: "여러 금 제품을 합산해 예상 순금 중량과 가능한 골드바 조합을 확인합니다.",
    },
    {
      title: "MY GOLD · 내금고",
      path: "/my-gold",
      description: "내가 가진 금을 기록하고 오늘 가치, 변화, 예상 순금량을 관리합니다.",
    },
    {
      title: "GOLD TO GOLD",
      path: "/gold-to-gold",
      description: "보유 금의 순금 가치를 999.9 골드바로 이어가는 한국골드마켓의 금교환 방식을 확인합니다.",
    },
    {
      title: "골드바 제작 공임 안내",
      path: "/goldbar-fee",
      description: "규격별 골드바 제작 공임과 계산 기준을 확인합니다.",
    },
    {
      title: "부산 범천동 원일귀금속 매장 안내",
      path: "/stores",
      description: "골드바 교환 매장의 주소, 영업시간과 연락처를 확인합니다.",
    },
  ];

  const rssItems = rssEntries.map((entry) => {
    return [
      "    <item>",
      `      <title><![CDATA[${cdata(entry.title)}]]></title>`,
      `      <link>${escapeXml(`${baseUrl}${entry.path}`)}</link>`,
      `      <description><![CDATA[${cdata(entry.description)}]]></description>`,
      "    </item>",
    ].join("\n");
  }).join("\n");

  const rss =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0">\n<channel>\n` +
    `<title>한국골드마켓 — 금의 가치를 이어가다</title>\n` +
    `<link>${baseUrl}</link>\n` +
    `<description>오늘 금시세, MY GOLD 기록·관리, GOLD TO GOLD와 부산 매장 이용 안내입니다.</description>\n` +
    `<language>ko</language>\n` +
    `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n` +
    rssItems +
    `\n</channel>\n</rss>`;

  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "sitemap.xml"), sitemap, "utf8");
  fs.writeFileSync(path.join(outDir, "rss.xml"), rss, "utf8");
  console.log("한국골드마켓 sitemap.xml / rss.xml 생성 완료");
}

generate().catch((error) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
