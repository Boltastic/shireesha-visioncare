import { canonicalUrl, getPageMeta, organizationSchema, sitemapPaths } from "../client/src/lib/seo";
import { describe, expect, it } from "vitest";

describe("SEO metadata configuration", () => {
  it("assigns unique indexable metadata to every public sitemap route", () => {
    const titles = sitemapPaths.map(path => getPageMeta(path).title);
    expect(new Set(titles).size).toBe(sitemapPaths.length);
    sitemapPaths.forEach(path => {
      expect(getPageMeta(path).indexable).toBe(true);
      expect(canonicalUrl(path)).toMatch(/^https:\/\/shireeshavision\.vercel\.app\//);
    });
  });

  it("keeps staff routes out of search indexing and preserves valid JSON-LD data", () => {
    expect(getPageMeta("/admin").indexable).toBe(false);
    expect(getPageMeta("/admin/services").indexable).toBe(false);
    expect(() => JSON.parse(JSON.stringify(organizationSchema))).not.toThrow();
    expect(organizationSchema["@graph"].map(item => item["@type"])).toEqual(["Organization", "WebSite"]);
  });
});
