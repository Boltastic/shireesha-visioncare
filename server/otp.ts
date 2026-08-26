import { randomInt } from "node:crypto";
import { hashValue } from "./bookingUtils";

export type OtpProvider = "development" | "twilio";

export function otpProvider(): OtpProvider {
  const hasTwilio = Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_VERIFY_SERVICE_SID,
  );
  return hasTwilio ? "twilio" : "development";
}

export async function sendOtp(phone: string) {
  const provider = otpProvider();
  if (provider === "development") {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMS verification is not configured.");
    }
    return { provider, codeHash: hashValue("246810") } as const;
  }

  const credentials = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SERVICE_SID}/Verifications`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: phone, Channel: "sms" }),
    },
  );
  if (!response.ok) throw new Error("The SMS provider could not send a code.");
  return { provider, codeHash: null } as const;
}

export async function verifyProviderOtp(phone: string, code: string, provider: OtpProvider, codeHash: string | null) {
  if (provider === "development") return codeHash === hashValue(code);

  const credentials = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
  const response = await fetch(
    `https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SERVICE_SID}/VerificationCheck`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: phone, Code: code }),
    },
  );
  if (!response.ok) return false;
  const data = (await response.json()) as { status?: string };
  return data.status === "approved";
}

export function issueVerificationToken() {
  return `${randomInt(100000, 999999)}-${randomInt(100000, 999999)}-${randomInt(100000, 999999)}`;
}
