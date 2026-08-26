# Production Setup Notes

The application is ready to use its built-in development adapters in preview. Before accepting real patient bookings in production, add the following credentials through the project’s secure settings area. Do not place these values in source code or client-side variables.

| Capability | Required environment variables | Production behaviour |
| --- | --- | --- |
| SMS verification | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_VERIFY_SERVICE_SID` | Uses Twilio Verify to send and validate one-time SMS codes server-side. |
| Bot protection | `RECAPTCHA_SECRET_KEY` and a matching public site key configured in the booking form | Verifies CAPTCHA tokens server-side before requesting SMS verification. |
| Calendar | Google OAuth client credentials and an approved redirect URI | Required before calendar events are created for confirmed bookings. |

## Preview behaviour

In development, the booking flow uses a clear, non-production adapter. The security check accepts the development token and the visible verification code is **246810**. This fallback is rejected when the application is run in production without the SMS provider and CAPTCHA configuration.

## Before launch

Add approved contact information, address, opening hours, service names, and service descriptions. Assign centre staff the `admin` role so they can use the protected dashboard. Connect a verified Google Calendar integration before relying on calendar event creation. The current build intentionally contains no email collection, WhatsApp automation, testimonials, medical claims, patient reviews, or invented provider credentials.
