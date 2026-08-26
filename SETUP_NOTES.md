# Production Setup Notes

The application accepts direct appointment requests after the booking security check. Before accepting real patient bookings in production, add the following credentials through the project’s secure settings area. Do not place these values in source code or client-side variables.

| Capability | Required environment variables | Production behaviour |
| --- | --- | --- |
| Bot protection | `RECAPTCHA_SECRET_KEY` and a matching public site key configured in the booking form | Verifies the booking security check server-side before the appointment is confirmed. |
| Staff access | `ADMIN_LOGIN_EMAIL`, `ADMIN_PASSWORD_HASH` | Restricts dashboard access to the configured email and a server-side salted password verifier. |
| Calendar | Google OAuth client credentials and an approved redirect URI | Required before calendar events are created for confirmed bookings. |

## Preview behaviour

The booking form renders Google reCAPTCHA whenever a valid Site Key is configured. Automated server tests use a development-only token; the public booking interface always requests a real CAPTCHA token.

## reCAPTCHA domain authorization

Google verified that the booking screen can load the configured widget, but its response is currently **“Invalid domain for site key.”** In the Google reCAPTCHA administration console, update the matching key's allowed-domain list with the hostnames below (enter hostnames only—no protocol, port, or path), then save the change.

| Environment | Required allowed hostname |
| --- | --- |
| Managed preview | `3000-i3ac04idrc9axfzgsy1je-d414b361.us4.manus.computer` |
| Live site | `shireesha6-e25sczv4.manus.space` |

After Google applies the hostname change, reload the booking page and advance to **Your details**. The checkbox should appear in place of the error card. Add any future custom production domain to this same Google allowlist before switching public traffic to it.

## External Vercel deployment

The Vercel configuration publishes the Vite frontend and proxies its `/api/*` requests to the existing live Manus backend. This preserves the database, appointment safeguards, secure staff session, and server-only secrets without copying them to another host. The linked Vercel project uses `shireesha-vision-care.vercel.app`; its first production build is triggered by a push to the GitHub `main` branch. Add the Vercel deployment hostname to the Google reCAPTCHA key's allowed-domain list before testing the booking checkbox on that external URL.

## Before launch

Add approved contact information, address, opening hours, service names, and service descriptions. The dashboard is available only through the configured administrator email and password; no public role assignment is required. Connect a verified Google Calendar integration before relying on calendar event creation. The current build intentionally contains no email collection, WhatsApp automation, testimonials, medical claims, patient reviews, or invented provider credentials.
