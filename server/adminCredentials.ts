export function readAdminCredentials() {
  const email = process.env.ADMIN_LOGIN_EMAIL;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;

  if (!email || !passwordHash) {
    throw new Error("Administrator sign-in credentials are not configured");
  }

  return { email: email.trim().toLowerCase(), passwordHash };
}
