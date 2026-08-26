# Initial Vercel SEO Audit

Date: 2026-08-26

- The Vercel homepage and public booking route render publicly without a login requirement.
- The public booking route loads its active service catalogue through the configured API proxy.
- The deployed `robots.txt` URL currently falls through to the single-page app and does not serve a crawler policy; a dedicated static file is required.
- The current document head contains only a general title, description, and partial Open Graph metadata. It has no canonical URL, robots directive, Twitter metadata, or per-route metadata handling.
- Public pages use meaningful headings and existing image alt text. The administration route must remain excluded from both the sitemap and indexing.
- The project is a Vite/React application rather than Next.js, so static crawler files and client-side document metadata are the appropriate implementation path.
