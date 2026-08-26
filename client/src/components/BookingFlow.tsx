import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useNotification } from "@/contexts/NotificationContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Check, ChevronLeft, ChevronRight, CircleAlert, Clock3, Loader2, MoveUpRight, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";

type Confirmation = { bookingId: string; patient: string; phone: string; service: string; date: string; time: string; status: "Confirmed" };

function datesForPicker() {
  const data: Array<{ iso: string; day: string; weekday: string; disabled: boolean }> = [];
  for (let offset = 0; data.length < 11; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() + offset + 1);
    const iso = date.toISOString().slice(0, 10);
    if (date.getDay() === 0) continue;
    data.push({ iso, day: date.toLocaleDateString("en-IN", { day: "2-digit" }), weekday: date.toLocaleDateString("en-IN", { weekday: "short" }), disabled: false });
  }
  return data;
}

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  const ampm = (hours ?? 0) >= 12 ? "PM" : "AM";
  const hour = (hours ?? 0) % 12 || 12;
  return `${hour}:${minutes?.toString().padStart(2, "0")} ${ampm}`;
}

declare global { interface Window { grecaptcha?: { render: (element: HTMLElement, options: { sitekey: string; callback: (token: string) => void; "expired-callback": () => void; "error-callback": () => void }) => number; }; } }

function CaptchaControl({ siteKey, onVerified }: { siteKey?: string; onVerified: (token: string) => void }) {
  const { t } = useLanguage();
  const container = useRef<HTMLDivElement>(null);
  const widgetId = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!siteKey || !container.current) return;
    let cancelled = false;
    const render = () => {
      if (cancelled || !container.current || widgetId.current !== undefined || !window.grecaptcha) return;
      widgetId.current = window.grecaptcha.render(container.current, { sitekey: siteKey, callback: onVerified, "expired-callback": () => onVerified(""), "error-callback": () => onVerified("") });
    };
    const existing = document.querySelector<HTMLScriptElement>('script[src^="https://www.google.com/recaptcha/api.js"]');
    if (existing) {
      if (window.grecaptcha) render();
      else existing.addEventListener("load", render, { once: true });
    } else {
      const script = document.createElement("script");
      script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.addEventListener("load", render, { once: true });
      document.head.appendChild(script);
    }
    return () => { cancelled = true; };
  }, [siteKey, onVerified]);

  if (!siteKey) return <div className="form-error" role="alert"><CircleAlert size={18} />Booking security is not configured. Please try again later.</div>;
  return <div className="captcha-widget"><div ref={container} /><small>{t("booking.protected")}</small></div>;
}

export default function BookingFlow() {
  const { notify } = useNotification();
  const { t } = useLanguage();
  const dates = useMemo(datesForPicker, []);
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<number>();
  const [date, setDate] = useState<string>();
  const [time, setTime] = useState<string>();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [confirmation, setConfirmation] = useState<Confirmation>();
  const [error, setError] = useState<string>();
  const servicesQuery = trpc.booking.services.useQuery();
  const captchaConfig = trpc.booking.captchaConfig.useQuery();
  const slotsQuery = trpc.booking.availableSlots.useQuery({ date: date ?? "", serviceId: serviceId ?? 0 }, { enabled: Boolean(date && serviceId) });
  const createBooking = trpc.booking.create.useMutation({
    onSuccess: result => { setConfirmation(result); setStep(6); setError(undefined); notify({ kind: "success", title: "Appointment confirmed", message: `Your booking reference is ${result.bookingId}.` }); },
    onError: err => { setError(err.message); notify({ kind: "error", title: "Booking could not be confirmed", message: err.message }); },
  });
  const service = servicesQuery.data?.find(item => item.id === serviceId);
  const canContinue = [Boolean(serviceId), Boolean(date), Boolean(time), fullName.trim().length > 1 && phone.trim().length > 7 && captchaToken.length > 0].at(step - 1);

  const goNext = () => { setError(undefined); if (canContinue) setStep(current => Math.min(current + 1, 5)); };
  const confirmBooking = () => serviceId && date && time && createBooking.mutate({ fullName, phone, reason: reason || undefined, serviceId, date, time, captchaToken });

  if (confirmation) return <section className="booking-confirmation" aria-live="polite">
    <div className="confirmation-seal"><Check size={27} strokeWidth={2.5} /></div>
    <p className="eyebrow">BOOKING COMPLETE</p>
    <h1>Appointment<br /><em>confirmed.</em></h1>
    <p className="confirmation-intro">Your appointment has been recorded. Keep this booking reference for the centre: <strong>{confirmation.bookingId}</strong></p>
    <dl className="confirmation-details">
      <div><dt>{t("booking.patient")}</dt><dd>{confirmation.patient}</dd></div>
      <div><dt>{t("booking.service")}</dt><dd>{confirmation.service}</dd></div>
      <div><dt>{t("booking.date")}</dt><dd>{dateLabel(confirmation.date)}</dd></div>
      <div><dt>{t("booking.time")}</dt><dd>{formatTime(confirmation.time)}</dd></div>
      <div><dt>{t("booking.phone")}</dt><dd>{confirmation.phone}</dd></div>
      <div><dt>{t("booking.status")}</dt><dd><span className="status-pill confirmed">{confirmation.status}</span></dd></div>
    </dl>
    <Link href="/" className="text-link">Back to home <MoveUpRight size={15} /></Link>
  </section>;

  return <div className="booking-shell">
    <aside className="booking-aside">
      <p className="eyebrow">{t("booking.eyebrow")}</p>
      <h1>{t("booking.headline")}</h1>
      <p>{t("booking.intro")}</p>
      <ol className="booking-progress" aria-label="Booking progress">
        {[t("booking.service"), t("booking.date"), t("booking.time"), t("booking.details"), t("booking.confirm")].map((label, index) => <li key={label} className={step > index + 1 ? "done" : step === index + 1 ? "current" : ""}><span>{step > index + 1 ? <Check size={13} /> : `0${index + 1}`}</span>{label}</li>)}
      </ol>
      <div className="privacy-note"><ShieldCheck size={18} /><span><strong>{t("booking.private")}</strong> {t("booking.privateBody")}</span></div>
    </aside>
    <section className="booking-panel" aria-labelledby="booking-title">
      <div className="step-heading"><span>{t("booking.step")} {Math.min(step, 5)} {t("booking.of")} 5</span><div className="progress-line"><i style={{ width: `${Math.min(step, 5) / 5 * 100}%` }} /></div></div>
      {error && <div className="form-error" role="alert"><CircleAlert size={18} />{error}</div>}
      {step === 1 && <div className="booking-step">
        <p className="eyebrow">01 — {t("booking.service")}</p><h2 id="booking-title">{t("booking.stepService")}</h2><p className="step-copy">{t("booking.serviceCopy")}</p>
        {servicesQuery.isLoading ? <div className="loading-line"><Loader2 className="spin" />Loading services</div> : servicesQuery.data?.length ? <div className="service-picker">{servicesQuery.data.map(item => <button key={item.id} onClick={() => setServiceId(item.id)} className={serviceId === item.id ? "selected" : ""}><span className="service-radio" aria-hidden="true" /> <span><b>{item.name}</b><small>{item.description || "Details can be confirmed with the centre."}</small></span><em>{item.durationMinutes} min</em></button>)}</div> : <div className="empty-state"><strong>Services will be available soon.</strong><p>Centre staff can add active services from the admin dashboard.</p></div>}
      </div>}
      {step === 2 && <div className="booking-step">
        <p className="eyebrow">02 — {t("booking.date")}</p><h2>{t("booking.stepDate")}</h2><p className="step-copy">{t("booking.dateCopy")}</p>
        <div className="date-calendar"><div className="calendar-caption"><button aria-label="Previous month" disabled><ChevronLeft size={18} /></button><b>{new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date())}</b><button aria-label="Next month" disabled><ChevronRight size={18} /></button></div><div className="date-grid">{dates.map(item => <button key={item.iso} onClick={() => setDate(item.iso)} className={date === item.iso ? "selected" : ""} aria-pressed={date === item.iso}><span>{item.weekday}</span><b>{item.day}</b></button>)}</div></div>
      </div>}
      {step === 3 && <div className="booking-step">
        <p className="eyebrow">03 — {t("booking.time")}</p><h2>{t("booking.stepTime")}</h2><p className="step-copy">{date ? dateLabel(date) : t("booking.selectDate")}</p>
        {slotsQuery.isLoading ? <div className="loading-line"><Loader2 className="spin" />Finding available times</div> : <div className="time-grid">{slotsQuery.data?.map(slot => <button key={slot.time} disabled={!slot.available} onClick={() => setTime(slot.time)} className={time === slot.time ? "selected" : ""}><Clock3 size={15} />{formatTime(slot.time)}</button>)}</div>}
      </div>}
      {step === 4 && <div className="booking-step">
        <p className="eyebrow">04 — {t("booking.details")}</p><h2>{t("booking.stepDetails")}</h2><p className="step-copy">{t("booking.detailsCopy")}</p>
        <div className="form-grid"><div><Label htmlFor="fullName">{t("booking.fullName")}</Label><Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t("booking.fullName")} autoComplete="name" /></div><div><Label htmlFor="phone">{t("booking.phone")}</Label><Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" autoComplete="tel" inputMode="tel" /></div><div className="full-span"><Label htmlFor="reason">{t("booking.reason")} <span>{t("booking.optional")}</span></Label><Textarea id="reason" value={reason} onChange={e => setReason(e.target.value)} placeholder={t("booking.reasonPlaceholder")} rows={3} /></div></div>
        {captchaConfig.isLoading ? <div className="loading-line"><Loader2 className="spin" />{t("booking.securityLoading")}</div> : <CaptchaControl siteKey={captchaConfig.data?.siteKey} onVerified={setCaptchaToken} />}
      </div>}
      {step === 5 && <div className="booking-step">
        <p className="eyebrow">05 — {t("booking.confirm")}</p><h2>{t("booking.stepConfirm")}</h2><p className="step-copy">{t("booking.confirmCopy")}</p>
        <div className="booking-review"><div><span>{t("booking.service")}</span><b>{service?.name}</b></div><div><span>{t("booking.date")}</span><b>{date && dateLabel(date)}</b></div><div><span>{t("booking.time")}</span><b>{time && formatTime(time)}</b></div><div><span>{t("booking.patient")}</span><b>{fullName}</b></div><div><span>{t("booking.phone")}</span><b>{phone}</b></div></div>
      </div>}
      <div className="booking-actions">
        {step > 1 && step < 6 && <Button variant="ghost" onClick={() => { setError(undefined); setStep(step - 1); }} disabled={createBooking.isPending}>{t("booking.back")}</Button>}
        {step < 4 && <Button onClick={goNext} disabled={!canContinue}>{t("booking.continue")} <MoveUpRight size={16} /></Button>}
        {step === 4 && <Button onClick={goNext} disabled={!canContinue}>{t("booking.review")} <MoveUpRight size={16} /></Button>}
        {step === 5 && <Button onClick={confirmBooking} disabled={createBooking.isPending}>{createBooking.isPending ? <><Loader2 className="spin" />Confirming</> : <>{t("booking.confirmAppointment")} <Check size={16} /></>}</Button>}
      </div>
    </section>
  </div>;
}
