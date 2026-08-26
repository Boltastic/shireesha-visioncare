import { useEffect } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { canonicalUrl, getPageMeta, organizationSchema } from "@/lib/seo";

function setMeta(selector: string, attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

export default function PageMeta() {
  const [location] = useLocation();
  const { locale } = useLanguage();

  useEffect(() => {
    const page = getPageMeta(location);
    const canonical = canonicalUrl(page.path);
    const robots = page.indexable ? "index,follow,max-image-preview:large" : "noindex,nofollow,noarchive";

    document.title = page.title;
    document.documentElement.lang = locale === "te" ? "te" : "en";
    setMeta('meta[name="description"]', "name", "description", page.description);
    setMeta('meta[name="robots"]', "name", "robots", robots);
    setMeta('meta[name="googlebot"]', "name", "googlebot", robots);
    setMeta('meta[property="og:title"]', "property", "og:title", page.title);
    setMeta('meta[property="og:description"]', "property", "og:description", page.description);
    setMeta('meta[property="og:url"]', "property", "og:url", canonical);
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", page.title);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", page.description);

    let canonicalElement = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalElement) {
      canonicalElement = document.createElement("link");
      canonicalElement.rel = "canonical";
      document.head.appendChild(canonicalElement);
    }
    canonicalElement.href = canonical;

    const schemaId = "shireesha-site-schema";
    const existingSchema = document.getElementById(schemaId);
    if (page.indexable) {
      const pageSchema = {
        "@context": "https://schema.org",
        "@type": "WebPage",
        "@id": `${canonical}#webpage`,
        name: page.title,
        description: page.description,
        url: canonical,
        isPartOf: { "@id": `${canonicalUrl("/")}#website` },
        inLanguage: locale === "te" ? "te" : "en",
      };
      const script = existingSchema ?? Object.assign(document.createElement("script"), { id: schemaId, type: "application/ld+json" });
      script.textContent = JSON.stringify({ "@context": "https://schema.org", "@graph": [...organizationSchema["@graph"], pageSchema] });
      if (!existingSchema) document.head.appendChild(script);
    } else {
      existingSchema?.remove();
    }
  }, [locale, location]);

  return null;
}
