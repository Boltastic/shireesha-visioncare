# Production Setup Notes

The application accepts direct appointment requests after the booking security check. Before accepting real patient bookings in production, add the following credentials through the project’s secure settings area. Do not place these values in source code or client-side variables.

| Capability | Required environment variables | Production behaviour |
| --- | --- | --- |
| Bot protection | `RECAPTCHA_SECRET_KEY` and a matching public site key configured in the booking form | Verifies the booking security check server-side before the appointment is confirmed. |
| Staff access | `ADMIN_LOGIN_EMAIL`, `ADMIN_PASSWORD_HASH` | Restricts dashboard access to the configured email and a server-side salted password verifier. |
| Calendar | Google OAuth client credentials and an approved redirect URI | Required before calendar events are created for confirmed bookings. |

## Preview behaviour

The booking form renders Google reCAPTCHA whenever a valid Site Key is configured. Automated server tests use a development-only token; the public booking interface always requests a real CAPTCHA token.

## Before launch

Add approved contact information, address, opening hours, service names, and service descriptions. The dashboard is available only through the configured administrator email and password; no public role assignment is required. Connect a verified Google Calendar integration before relying on calendar event creation. The current build intentionally contains no email collection, WhatsApp automation, testimonials, medical claims, patient reviews, or invented provider credentials.
