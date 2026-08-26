export const SITE_URL = "https://shireesha-vision-care.vercel.app";
export const SITE_NAME = "Shireesha 6/6 Vision Care Centre";

export type PageMeta = {
  title: string;
  description: string;
  path: string;
  indexable: boolean;
};

const publicPages: Record<string, Omit<PageMeta, "path" | "indexable">> = {
  "/": {
    title: "Shireesha 6/6 Vision Care Centre | Vision Care Appointments",
    description: "Arrange a vision-care appointment with Shireesha 6/6 Vision Care Centre. Choose an approved service, date and time online.",
  },
  "/services": {
    title: "Vision Care Appointment Services | Shireesha 6/6",
    description: "Explore the approved vision-care appointment services available at Shireesha 6/6 Vision Care Centre and choose a suitable time online.",
  },
  "/about": {
    title: "About Shireesha 6/6 Vision Care Centre",
    description: "Learn about Shireesha 6/6 Vision Care Centre’s clear, privacy-conscious approach to arranging vision-care appointments.",
  },
  "/contact": {
    title: "Plan Your Visit | Shireesha 6/6 Vision Care Centre",
    description: "Plan a visit to Shireesha 6/6 Vision Care Centre by choosing an approved vision-care appointment time online.",
  },
  "/book": {
    title: "Book a Vision Care Appointment | Shireesha 6/6",
    description: "Book a vision-care appointment with Shireesha 6/6 Vision Care Centre. Select an approved service, an available date and a convenient time.",
  },
};

export function getPageMeta(pathname: string): PageMeta {
  const normalizedPath = pathname.replace(/\/+$/, "") || "/";
  const publicPage = publicPages[normalizedPath];
  if (publicPage) return { ...publicPage, path: normalizedPath, indexable: true };
  if (normalizedPath === "/admin" || normalizedPath.startsWith("/admin/")) {
    return {
      title: "Staff Sign In | Shireesha 6/6 Vision Care Centre",
      description: "Secure staff access for Shireesha 6/6 Vision Care Centre.",
      path: normalizedPath,
      indexable: false,
    };
  }
  return {
    title: `Page Not Found | ${SITE_NAME}`,
    description: "The requested page is not available.",
    path: normalizedPath,
    indexable: false,
  };
}

export function canonicalUrl(path: string) {
  return `${SITE_URL}${path === "/" ? "/" : path}`;
}

export const organizationSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
      inLanguage: ["en", "te"],
    },
  ],
};

export const sitemapPaths = ["/", "/services", "/about", "/contact", "/book"] as const;
