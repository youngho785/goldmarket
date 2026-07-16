import fs from "fs";
import path from "path";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Firebase Admin 초기화
initializeApp({
  credential: applicationDefault(),
});
const db = getFirestore();

// 배포 경로 (public/ 폴더에 저장)
const outDir = path.resolve("public");

async function generate() {
  const now = new Date().toISOString();
  const baseUrl = "https://koreagoldmarket.com";

  // Firestore에서 상품 불러오기
  const productsSnap = await db.collection("products").get();

  // 기본 URL들
  const staticUrls = [
    { loc: `${baseUrl}/`, changefreq: "daily", priority: 1.0 },
    { loc: `${baseUrl}/products`, changefreq: "daily", priority: 0.9 },
    { loc: `${baseUrl}/about`, changefreq: "monthly", priority: 0.6 },
    { loc: `${baseUrl}/contact`, changefreq: "yearly", priority: 0.5 },
  ];

  // 상품 URL들
  const productUrls = productsSnap.docs.map((doc) => {
    const data = doc.data();
    return {
      loc: `${baseUrl}/products/${doc.id}`,
      changefreq: "weekly",
      priority: 0.8,
      lastmod: data.updatedAt ? new Date(data.updatedAt.toDate()).toISOString() : now,
    };
  });

  // sitemap.xml 생성
  const sitemap =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    [...staticUrls, ...productUrls]
      .map(
        (url) => `
  <url>
    <loc>${url.loc}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
    ${url.lastmod ? `<lastmod>${url.lastmod}</lastmod>` : ""}
  </url>`
      )
      .join("\n") +
    `\n</urlset>`;

  fs.writeFileSync(path.join(outDir, "sitemap.xml"), sitemap, "utf8");
  console.log("✅ sitemap.xml 생성 완료");

  // rss.xml 생성
  const rssItems = productsSnap.docs
    .map((doc) => {
      const data = doc.data();
      return `
    <item>
      <title><![CDATA[${data.title || "상품"}]]></title>
      <link>${baseUrl}/products/${doc.id}</link>
      <description><![CDATA[${data.description || "상품 설명 없음"}]]></description>
      <pubDate>${new Date(
        data.createdAt ? data.createdAt.toDate() : now
      ).toUTCString()}</pubDate>
    </item>`;
    })
    .join("\n");

  const rss =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0">\n` +
    `<channel>\n` +
    `<title>한국골드마켓 최신 상품</title>\n` +
    `<link>${baseUrl}</link>\n` +
    `<description>새로 등록된 귀금속 상품을 RSS로 받아보세요.</description>\n` +
    `<language>ko</language>\n` +
    `<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>\n` +
    rssItems +
    `\n</channel>\n</rss>`;

  fs.writeFileSync(path.join(outDir, "rss.xml"), rss, "utf8");
  console.log("✅ rss.xml 생성 완료");
}

generate().catch((err) => {
  console.error("❌ 오류 발생:", err);
  process.exit(1);
});
