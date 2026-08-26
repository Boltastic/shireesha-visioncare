export function readCaptchaSiteKey() {
  const siteKey = process.env.VITE_RECAPTCHA_SITE_KEY;
  if (!siteKey || !/^6L[A-Za-z0-9_-]{20,}$/.test(siteKey)) {
    throw new Error("A valid reCAPTCHA Site Key is not configured");
  }
  return siteKey;
}

export function hasCaptchaSecretKey() {
  return Boolean(process.env.RECAPTCHA_SECRET_KEY?.trim());
}
