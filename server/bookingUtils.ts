import { createHash } from "node:crypto";

export const BUSINESS_OFFSET = "+05:30";
export const SLOT_TIMES = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];

export function normalizePhone(input: string) {
  return input.replace(/[\s()-]/g, "");
}

export function isE164Phone(input: string) {
  return /^\+[1-9]\d{7,14}$/.test(normalizePhone(input));
}

export function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function maskPhone(phone: string) {
  const normalized = normalizePhone(phone);
  if (normalized.length < 5) return "••••";
  return `${normalized.slice(0, 3)} •••• ${normalized.slice(-3)}`;
}

export function slotStart(date: string, time: string) {
  return new Date(`${date}T${time}:00${BUSINESS_OFFSET}`);
}

export function isAvailableTime(time: string) {
  return SLOT_TIMES.includes(time);
}

export function isBookableSlot(date: string, time: string, minimumLeadMinutes = 60, maximumAdvanceDays = 90) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !isAvailableTime(time)) return false;
  const start = slotStart(date, time);
  const businessDay = new Date(`${date}T12:00:00${BUSINESS_OFFSET}`).getDay();
  const maxDate = new Date(Date.now() + maximumAdvanceDays * 24 * 60 * 60 * 1000);
  return businessDay !== 0 && start.getTime() >= Date.now() + minimumLeadMinutes * 60 * 1000 && start.getTime() <= maxDate.getTime();
}
