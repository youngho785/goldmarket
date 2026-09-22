import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  GOLD_GUIDES,
  GUIDE_BY_SLUG,
  GUIDE_SEO_ROUTES,
} from "../src/data/goldGuides.js";
import {
  INDEXABLE_PATHS,
  SEO_ROUTES,
  buildRouteSchema,
  getSeoForPath,
} from "../src/config/seo.js";

const read = (relativePath) =>
  readFile(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("검색 가이드는 정확히 10개이며 slug가 중복되지 않는다", () => {
  assert.equal(GOLD_GUIDES.length, 10);
  const slugs = GOLD_GUIDES.map((guide) => guide.slug);
  assert.equal(new Set(slugs).size, slugs.length);

  for (const guide of GOLD_GUIDES) {
    assert.ok(guide.title.length >= 20);
    assert.ok(guide.summary.length >= 25);
    assert.ok(guide.directAnswer.length >= 25);
    assert.ok(guide.sections.length >= 4);
    assert.ok(guide.actions.length >= 1);
    assert.ok(guide.related.length >= 2);
  }
});

test("모든 가이드는 SEO route와 sitemap 대상에 포함된다", () => {
  assert.ok(SEO_ROUTES["/guide"]);
  assert.ok(INDEXABLE_PATHS.includes("/guide"));

  for (const guide of GOLD_GUIDES) {
    const path = `/guide/${guide.slug}`;
    assert.ok(GUIDE_SEO_ROUTES[path]);
    assert.ok(SEO_ROUTES[path]);
    assert.ok(INDEXABLE_PATHS.includes(path));

    const seo = getSeoForPath(path);
    assert.equal(seo.indexable, true);
    assert.equal(seo.canonical, `https://koreagoldmarket.com${path}`);

    const schema = buildRouteSchema(path);
    assert.ok(schema);
    assert.match(JSON.stringify(schema), /Article/);
  }
});

test("가이드 관련 링크는 존재하는 slug만 사용하고 자기 자신을 참조하지 않는다", () => {
  for (const guide of GOLD_GUIDES) {
    for (const relatedSlug of guide.related) {
      assert.ok(GUIDE_BY_SLUG[relatedSlug], `${relatedSlug} 가이드가 없습니다.`);
      assert.notEqual(relatedSlug, guide.slug);
    }
  }
});

test("가이드는 변동 가능한 한국골드마켓 환산율을 고정 숫자로 노출하지 않는다", () => {
  const combined = JSON.stringify(GOLD_GUIDES);

  for (const forbidden of [
    "0.585",
    "0.75",
    "58.5%",
    "75%",
    "2.8125g",
    "2.19375g",
    "1.755g",
    "4.755g",
    "이론상 금 함량",
    "이론상 합계",
  ]) {
    assert.equal(
      combined.includes(forbidden),
      false,
      `공개 가이드에 고정 환산 정보가 남아 있습니다: ${forbidden}`
    );
  }

  const hallmarkGuide = GUIDE_BY_SLUG["14k-18k-24k"];
  const eighteen = GUIDE_BY_SLUG["18k-one-don"];
  const fourteen = GUIDE_BY_SLUG["14k-one-don"];
  const multiple = GUIDE_BY_SLUG["multiple-gold-pure-weight"];

  assert.match(hallmarkGuide.directAnswer, /585/);
  assert.match(hallmarkGuide.directAnswer, /750/);
  assert.match(eighteen.directAnswer, /1돈.*3\.75g/);
  assert.match(fourteen.directAnswer, /1돈.*3\.75g/);
  assert.match(multiple.notice, /현재.*계산 기준|현재.*계산기/);
});

test("라우터와 푸터에서 금 정보 가이드에 접근할 수 있다", async () => {
  const [appSource, footerSource] = await Promise.all([
    read("src/App.jsx"),
    read("src/components/common/Footer.jsx"),
  ]);

  assert.match(appSource, /path: "\/guide"/);
  assert.match(appSource, /path: "\/guide\/:slug"/);
  assert.match(footerSource, /to="\/guide">금 정보 가이드/);
});

test("핵심 공개 페이지가 관련 가이드로 내부링크된다", async () => {
  const sources = await Promise.all([
    read("src/pages/GoldPrice.jsx"),
    read("src/pages/GoldValue.jsx"),
    read("src/pages/GoldToGoldIntro.jsx"),
    read("src/pages/Stores.jsx"),
  ]);

  for (const source of sources) {
    assert.match(source, /<GuideLinks/);
  }
});