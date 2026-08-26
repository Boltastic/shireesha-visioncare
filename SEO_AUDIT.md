# Initial Vercel SEO Audit

Date: 2026-08-26

- The Vercel homepage and public booking route render publicly without a login requirement.
- The public booking route loads its active service catalogue through the configured API proxy.
- The deployed `robots.txt` URL currently falls through to the single-page app and does not serve a crawler policy; a dedicated static file is required.
- The current document head contains only a general title, description, and partial Open Graph metadata. It has no canonical URL, robots directive, Twitter metadata, or per-route metadata handling.
- Public pages use meaningful headings and existing image alt text. The administration route must remain excluded from both the sitemap and indexing.
- The project is a Vite/React application rather than Next.js, so static crawler files and client-side document metadata are the appropriate implementation path.

## Production crawler verification

On 2026-08-26, `https://shireeshavision.vercel.app/robots.txt` was confirmed to return a dedicated crawler policy that allows public pages, excludes `/admin` and `/api/`, and names the production sitemap. `https://shireeshavision.vercel.app/sitemap.xml` was confirmed to return valid XML with only the five intended public canonical URLs: the home page, services, about, contact, and booking pages.

The rendered production homepage was also checked after deployment. Its document head contains the supplied `google-site-verification` value, a canonical URL of `https://shireeshavision.vercel.app/`, and a JSON-LD script. The public API proxy returned the active service catalogue on the homepage after initial loading, and the hero image loaded through the configured static-asset proxy.

At a 375×812 mobile viewport, the public home page retained readable text, usable navigation and booking controls, and a single-column layout without apparent horizontal overflow. The booking screen retained its service selector, readable labels, and a reachable continuation control within the viewport.

The deployed Services page updated its title to the route-specific value `Vision Care Appointment Services | Shireesha 6/6`. The staff URL updated its title to `Staff Sign In | Shireesha 6/6 Vision Care Centre`; it is excluded by the robots policy and is not included in the sitemap. This browser session already had an authorized staff session, so the private dashboard was shown without changing any staff data.

On the canonical Vercel booking page, the rendered DOM contains Google’s explicit reCAPTCHA loader and a visible `iframe` titled `reCAPTCHA`. Its Google anchor request identifies `shireeshavision.vercel.app:443` as the rendered origin, directly confirming that the widget is authorized and loaded for the production hostname.

The user completed the final live verification action after solving the CAPTCHA. The canonical Vercel deployment returned the booking confirmation page for the submitted test values, which confirms that the complete external booking path—including server-side CAPTCHA verification—works. No appointment record was changed or removed after this validation.

## Google Search Console submission

On 2026-08-26, the verified URL-prefix property for `https://shireeshavision.vercel.app/` accepted `sitemap.xml` with a **Success** status and discovered five public URLs. A URL Inspection request for the canonical homepage then began Google’s live-indexability test; the site was previously known to Google as “Discovered – currently not indexed,” which is expected for a recently published site and does not indicate a crawl block.

Google Search Console completed the live test and confirmed **“Indexing requested.”** The canonical homepage was added to Google’s priority crawl queue. This is a submission for crawling and does not guarantee immediate inclusion or ranking in search results.
