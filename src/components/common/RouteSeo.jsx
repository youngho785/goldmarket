import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  DEFAULT_OG_IMAGE,
  SITE_NAME,
  buildRouteSchema,
  getSeoForPath,
} from "@/config/seo";

function upsertMeta(selector, attributes) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement("meta");
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });

  return element;
}

function upsertLink(selector, attributes) {
  let element = document.head.querySelector(selector);

  if (!element) {
    element = document.createElement("link");
    document.head.appendChild(element);
  }

  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });

  return element;
}

export default function RouteSeo() {
  const location = useLocation();

  useEffect(() => {
    const seo = getSeoForPath(location.pathname);

    document.title = seo.title;

    upsertMeta('meta[name="description"]', {
      name: "description",
      content: seo.description,
    });
    upsertMeta('meta[name="robots"]', {
      name: "robots",
      content: seo.robots,
    });

    upsertLink('link[rel="canonical"]', {
      rel: "canonical",
      href: seo.canonical,
    });
    upsertLink('link[rel="alternate"][hreflang="ko-KR"]', {
      rel: "alternate",
      hreflang: "ko-KR",
      href: seo.canonical,
    });

    upsertMeta('meta[property="og:type"]', {
      property: "og:type",
      content: "website",
    });
    upsertMeta('meta[property="og:locale"]', {
      property: "og:locale",
      content: "ko_KR",
    });
    upsertMeta('meta[property="og:site_name"]', {
      property: "og:site_name",
      content: SITE_NAME,
    });
    upsertMeta('meta[property="og:title"]', {
      property: "og:title",
      content: seo.ogTitle || seo.title,
    });
    upsertMeta('meta[property="og:description"]', {
      property: "og:description",
      content: seo.ogDescription || seo.description,
    });
    upsertMeta('meta[property="og:url"]', {
      property: "og:url",
      content: seo.canonical,
    });
    upsertMeta('meta[property="og:image"]', {
      property: "og:image",
      content: DEFAULT_OG_IMAGE,
    });
    upsertMeta('meta[property="og:image:width"]', {
      property: "og:image:width",
      content: "1200",
    });
    upsertMeta('meta[property="og:image:height"]', {
      property: "og:image:height",
      content: "630",
    });
    upsertMeta('meta[property="og:image:alt"]', {
      property: "og:image:alt",
      content: seo.imageAlt || SITE_NAME,
    });

    upsertMeta('meta[name="twitter:card"]', {
      name: "twitter:card",
      content: "summary_large_image",
    });
    upsertMeta('meta[name="twitter:title"]', {
      name: "twitter:title",
      content: seo.ogTitle || seo.title,
    });
    upsertMeta('meta[name="twitter:description"]', {
      name: "twitter:description",
      content: seo.ogDescription || seo.description,
    });
    upsertMeta('meta[name="twitter:image"]', {
      name: "twitter:image",
      content: DEFAULT_OG_IMAGE,
    });

    let routeSchema = document.getElementById("kgm-route-schema");
    const schema = buildRouteSchema(location.pathname);

    if (!schema) {
      routeSchema?.remove();
      return;
    }

    if (!routeSchema) {
      routeSchema = document.createElement("script");
      routeSchema.id = "kgm-route-schema";
      routeSchema.type = "application/ld+json";
      document.head.appendChild(routeSchema);
    }

    routeSchema.textContent = JSON.stringify(schema);
  }, [location.pathname]);

  return null;
}
