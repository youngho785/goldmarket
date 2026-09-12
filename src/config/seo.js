export const SITE_URL = "https://koreagoldmarket.com";
export const SITE_NAME = "한국골드마켓";
export const SITE_ALT_NAMES = ["Korea Gold Market", "koreagoldmarket.com"];
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-cover.jpg`;
export const BRAND_ID = `${SITE_URL}/#brand`;
export const OPERATOR_ID = `${SITE_URL}/#wonil-jewelry`;

export const SEO_ROUTES = {
  "/": {
    title: "한국골드마켓 | 내 금의 가치를 이어가는 금 생활 플랫폼",
    description:
      "오늘 금시세부터 14K·18K·순금의 현재 가치, MY GOLD 기록·관리, 999.9 골드바 교환까지. 내 금의 가치를 확인하고 이어가는 금 생활 플랫폼입니다.",
    ogTitle: "한국골드마켓 — 내 금의 가치를 이어가다",
    ogDescription:
      "내가 가진 금의 오늘 가치를 확인하고, MY GOLD에 기록하고, 필요할 때 999.9 골드바로 이어보세요.",
    imageAlt: "금의 가치를 확인하고 기록하고 이어가는 한국골드마켓",
  },
  "/about": {
    title: "한국골드마켓 소개 | 금의 가치를 이어가는 금 생활 플랫폼",
    description:
      "한국골드마켓(Korea Gold Market)은 원일귀금속이 직접 운영하며, 오늘 금시세 확인부터 MY GOLD 기록·관리, GOLD TO GOLD 999.9 골드바 교환까지 내 금의 가치를 하나의 흐름으로 연결합니다.",
    ogTitle: "한국골드마켓 소개 — 금의 가치를 이어가다",
    ogDescription:
      "오늘 금시세, MY GOLD, GOLD TO GOLD를 하나의 흐름으로 연결하는 한국골드마켓의 서비스와 운영 주체를 소개합니다.",
    imageAlt: "한국골드마켓 Korea Gold Market 공식 소개",
    aboutPage: true,
  },
  "/gold-price": {
    title: "오늘 금시세 | 순금·18K·14K 시세 | 한국골드마켓",
    description:
      "오늘 순금·18K·14K 금시세와 전일 대비 변화를 확인하고, 내가 가진 금의 현재 가치까지 이어서 확인해 보세요.",
    ogTitle: "오늘 금시세 | 한국골드마켓",
    ogDescription:
      "순금·18K·14K의 오늘 가격과 전일 대비 변화를 확인하고 내 금의 가치까지 이어보세요.",
    imageAlt: "한국골드마켓 오늘 금시세",
  },
  "/my-gold": {
    title: "MY GOLD | 내 금 가치 기록·관리 | 한국골드마켓",
    description:
      "내가 가진 14K·18K·순금을 기록하고 오늘 가치, 변화, 예상 순금량을 계속 확인하는 나만의 금 가치 관리 공간입니다.",
    ogTitle: "MY GOLD — 내 금 가치 기록·관리 | 한국골드마켓",
    ogDescription:
      "내 금을 맡기는 곳이 아니라, 내가 가진 금의 가치를 기록하고 계속 확인하는 MY GOLD입니다.",
    imageAlt: "한국골드마켓 MY GOLD 내 금 가치 기록 관리",
    service: {
      name: "MY GOLD",
      serviceType: "보유 금 가치 기록·관리 서비스",
      description:
        "내가 가진 금의 종류와 중량을 기록하고 오늘 가치, 변화, 예상 순금량을 확인하는 한국골드마켓의 금 가치 관리 서비스",
    },
  },
  "/gold-to-gold": {
    title: "GOLD TO GOLD | 보유 금을 999.9 골드바로 | 한국골드마켓",
    description:
      "사용하지 않는 14K·18K·순금의 가치를 확인하고, 매장 실측과 공임 확인 후 999.9 골드바로 이어가는 GOLD TO GOLD를 안내합니다.",
    ogTitle: "GOLD TO GOLD | 한국골드마켓",
    ogDescription:
      "모양은 달라져도 금의 가치는 이어집니다. 보유 금의 가치를 999.9 골드바로 이어보세요.",
    imageAlt: "한국골드마켓 GOLD TO GOLD 999.9 골드바 교환",
    service: {
      name: "GOLD TO GOLD",
      serviceType: "보유 금 999.9 골드바 교환 서비스",
      description:
        "보유 금의 예상 순금 가치를 확인하고 매장 실측 후 999.9 골드바로 이어가는 한국골드마켓의 금교환 서비스",
    },
  },
  "/gold-exchange": {
    title: "금교환 계산 | 예상 순금량·골드바 조합 | 한국골드마켓",
    description:
      "14K·18K·순금 등 여러 금 제품의 예상 순금량과 가능한 999.9 골드바 조합을 계산하고 교환 절차를 확인하세요.",
    ogTitle: "금교환 계산 | 한국골드마켓",
    ogDescription:
      "내 금의 예상 순금량과 가능한 999.9 골드바 조합을 확인하고 GOLD TO GOLD로 이어보세요.",
    imageAlt: "한국골드마켓 금교환 예상 순금량 골드바 조합",
  },
  "/goldbar-fee": {
    title: "골드바 공임 안내 | 한국골드마켓",
    description:
      "한국골드마켓 GOLD TO GOLD 이용 시 규격별 999.9 골드바 제작 공임과 계산 기준을 확인하세요.",
    ogTitle: "골드바 공임 안내 | 한국골드마켓",
    ogDescription:
      "규격별 999.9 골드바 제작 공임과 계산 기준을 확인하세요.",
    imageAlt: "한국골드마켓 골드바 공임 안내",
  },
  "/stores": {
    title: "원일귀금속 매장 안내 | 부산 범천동 | 한국골드마켓",
    description:
      "한국골드마켓 GOLD TO GOLD 오프라인 확인·교환 매장인 부산 범천동 원일귀금속의 주소, 영업시간과 연락처를 안내합니다.",
    ogTitle: "원일귀금속 매장 안내 | 한국골드마켓",
    ogDescription:
      "부산 범천동 원일귀금속에서 순도·중량·공임을 함께 확인하고 최종 교환을 결정합니다.",
    imageAlt: "한국골드마켓 원일귀금속 부산 범천동 매장 안내",
    storePage: true,
  },
  "/reviews": {
    title: "금교환 고객 후기 | 한국골드마켓",
    description:
      "한국골드마켓 GOLD TO GOLD를 이용한 금교환 고객 후기를 확인하세요. 실제 교환 경험을 바탕으로 서비스를 안내합니다.",
    ogTitle: "금교환 고객 후기 | 한국골드마켓",
    ogDescription:
      "GOLD TO GOLD를 이용한 실제 금교환 고객 후기를 확인하세요.",
    imageAlt: "한국골드마켓 GOLD TO GOLD 금교환 고객 후기",
  },
  "/terms": {
    title: "이용약관 | 한국골드마켓",
    description: "한국골드마켓 서비스 이용약관을 확인하세요.",
    ogTitle: "이용약관 | 한국골드마켓",
    ogDescription: "한국골드마켓 서비스 이용약관입니다.",
    imageAlt: "한국골드마켓 이용약관",
  },
  "/privacy": {
    title: "개인정보처리방침 | 한국골드마켓",
    description: "한국골드마켓 개인정보처리방침을 확인하세요.",
    ogTitle: "개인정보처리방침 | 한국골드마켓",
    ogDescription: "한국골드마켓 개인정보처리방침입니다.",
    imageAlt: "한국골드마켓 개인정보처리방침",
  },
};

export const INDEXABLE_PATHS = Object.keys(SEO_ROUTES);

export function normalizeSeoPath(pathname) {
  const raw = String(pathname || "/").split(/[?#]/, 1)[0] || "/";
  if (raw === "/") return "/";
  return raw.replace(/\/+$/, "") || "/";
}

export function canonicalUrlForPath(pathname) {
  const path = normalizeSeoPath(pathname);
  return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

export function getSeoForPath(pathname) {
  const path = normalizeSeoPath(pathname);
  const route = SEO_ROUTES[path];

  if (route) {
    return {
      ...route,
      path,
      canonical: canonicalUrlForPath(path),
      robots: "index, follow, max-image-preview:large",
      indexable: true,
    };
  }

  return {
    path,
    title: SITE_NAME,
    description: "한국골드마켓 서비스 페이지입니다.",
    ogTitle: SITE_NAME,
    ogDescription: "내 금의 가치를 확인하고 기록하고 이어가는 금 생활 플랫폼입니다.",
    imageAlt: "한국골드마켓",
    canonical: canonicalUrlForPath(path),
    robots: "noindex, nofollow, noarchive",
    indexable: false,
  };
}

export function buildSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Brand",
        "@id": BRAND_ID,
        name: SITE_NAME,
        alternateName: SITE_ALT_NAMES,
        url: `${SITE_URL}/`,
        logo: `${SITE_URL}/logo.png`,
        image: DEFAULT_OG_IMAGE,
        slogan: "금의 가치를 이어가다",
        description:
          "오늘 금시세 확인부터 MY GOLD 기록·관리, GOLD TO GOLD 999.9 골드바 교환까지 내 금의 가치를 하나의 흐름으로 연결하는 금 생활 플랫폼",
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: `${SITE_URL}/`,
        name: SITE_NAME,
        alternateName: SITE_ALT_NAMES,
        description:
          "오늘 금시세부터 MY GOLD 기록·관리, 999.9 골드바 교환까지 내 금의 가치를 확인하고 이어가는 금 생활 플랫폼",
        inLanguage: "ko-KR",
        about: { "@id": BRAND_ID },
        publisher: { "@id": OPERATOR_ID },
      },
      {
        "@type": "JewelryStore",
        "@id": OPERATOR_ID,
        name: "원일귀금속",
        url: `${SITE_URL}/stores`,
        logo: `${SITE_URL}/logo.png`,
        image: DEFAULT_OG_IMAGE,
        telephone: "+82-51-646-9700",
        email: "lifeapproch@naver.com",
        address: {
          "@type": "PostalAddress",
          streetAddress: "골드테마길 21",
          addressLocality: "부산진구",
          addressRegion: "부산광역시",
          addressCountry: "KR",
        },
        openingHoursSpecification: {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ],
          opens: "10:00",
          closes: "18:00",
        },
        brand: { "@id": BRAND_ID },
      },
    ],
  };
}

export function buildRouteSchema(pathname) {
  const seo = getSeoForPath(pathname);
  if (!seo.indexable) return null;

  const webpage = {
    "@type": seo.aboutPage ? "AboutPage" : "WebPage",
    "@id": `${seo.canonical}#webpage`,
    url: seo.canonical,
    name: seo.title,
    description: seo.description,
    inLanguage: "ko-KR",
    isPartOf: { "@id": `${SITE_URL}/#website` },
  };

  if (seo.aboutPage) {
    webpage.mainEntity = { "@id": BRAND_ID };
    webpage.about = { "@id": BRAND_ID };
  }

  if (seo.storePage) {
    webpage.mainEntity = { "@id": OPERATOR_ID };
  }

  if (seo.service) {
    const serviceId = `${seo.canonical}#service`;
    webpage.mainEntity = { "@id": serviceId };

    return {
      "@context": "https://schema.org",
      "@graph": [
        webpage,
        {
          "@type": "Service",
          "@id": serviceId,
          name: seo.service.name,
          serviceType: seo.service.serviceType,
          description: seo.service.description,
          url: seo.canonical,
          brand: { "@id": BRAND_ID },
          provider: { "@id": OPERATOR_ID },
          areaServed: { "@type": "Country", name: "대한민국" },
        },
      ],
    };
  }

  return {
    "@context": "https://schema.org",
    ...webpage,
  };
}
