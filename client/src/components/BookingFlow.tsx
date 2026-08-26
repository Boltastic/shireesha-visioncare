import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Check, ChevronLeft, ChevronRight, CircleAlert, Clock3, Loader2, MoveUpRight, ShieldCheck, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
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

export default function BookingFlow() {
  const dates = useMemo(datesForPicker, []);
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<number>();
  const [date, setDate] = useState<string>();
  const [time, setTime] = useState<string>();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [captchaComplete, setCaptchaComplete] = useState(false);
  const [challengeId, setChallengeId] = useState<number>();
  const [code, setCode] = useState("");
  const [verificationToken, setVerificationToken] = useState<string>();
  const [confirmation, setConfirmation] = useState<Confirmation>();
  const [error, setError] = useState<string>();
  const servicesQuery = trpc.booking.services.useQuery();
  const slotsQuery = trpc.booking.availableSlots.useQuery({ date: date ?? "", serviceId: serviceId ?? 0 }, { enabled: Boolean(date && serviceId) });
  const requestOtp = trpc.booking.requestOtp.useMutation({
    onSuccess: result => { setChallengeId(result.challengeId); setStep(5); setError(undefined); },
    onError: err => setError(err.message),
  });
  const verifyOtp = trpc.booking.verifyOtp.useMutation({
    onSuccess: result => { setVerificationToken(result.verificationToken); setStep(6); setError(undefined); },
    onError: err => setError(err.message),
  });
  const createBooking = trpc.booking.create.useMutation({
    onSuccess: result => { setConfirmation(result); setStep(7); setError(undefined); },
    onError: err => setError(err.message),
  });
  const service = servicesQuery.data?.find(item => item.id === serviceId);
  const canContinue = [Boolean(serviceId), Boolean(date), Boolean(time), fullName.trim().length > 1 && phone.trim().length > 7 && captchaComplete].at(step - 1);

  const goNext = () => { setError(undefined); if (canContinue) setStep(current => Math.min(current + 1, 6)); };
  const requestCode = () => serviceId && date && time && requestOtp.mutate({ phone, captchaToken: captchaComplete ? "development-pass" : "", serviceId, date, time });
  const confirmCode = () => challengeId && verifyOtp.mutate({ phone, challengeId, code });
  const confirmBooking = () => challengeId && verificationToken && serviceId && date && time && createBooking.mutate({ fullName, phone, reason: reason || undefined, serviceId, date, time, challengeId, verificationToken });

  if (confirmation) return <section className="booking-confirmation" aria-live="polite">
    <div className="confirmation-seal"><Check size={27} strokeWidth={2.5} /></div>
    <p className="eyebrow">BOOKING COMPLETE</p>
    <h1>Appointment<br /><em>confirmed.</em></h1>
    <p className="confirmation-intro">Your appointment has been recorded. Keep this booking reference for the centre: <strong>{confirmation.bookingId}</strong></p>
    <dl className="confirmation-details">
      <div><dt>Patient</dt><dd>{confirmation.patient}</dd></div>
      <div><dt>Service</dt><dd>{confirmation.service}</dd></div>
      <div><dt>Date</dt><dd>{dateLabel(confirmation.date)}</dd></div>
      <div><dt>Time</dt><dd>{formatTime(confirmation.time)}</dd></div>
      <div><dt>Phone</dt><dd>{confirmation.phone}</dd></div>
      <div><dt>Status</dt><dd><span className="status-pill confirmed">{confirmation.status}</span></dd></div>
    </dl>
    <Link href="/" className="text-link">Back to home <MoveUpRight size={15} /></Link>
  </section>;

  return <div className="booking-shell">
    <aside className="booking-aside">
      <p className="eyebrow">YOUR APPOINTMENT</p>
      <h1>Simple steps.<br /><em>Clear care.</em></h1>
      <p>Choose a time that suits you. Your phone number is verified before any appointment is confirmed.</p>
      <ol className="booking-progress" aria-label="Booking progress">
        {["Service", "Date", "Time", "Your details", "Verify", "Confirm"].map((label, index) => <li key={label} className={step > index + 1 ? "done" : step === index + 1 ? "current" : ""}><span>{step > index + 1 ? <Check size={13} /> : `0${index + 1}`}</span>{label}</li>)}
      </ol>
      <div className="privacy-note"><ShieldCheck size={18} /><span><strong>Private by design.</strong> Your booking details are only visible to authorised centre staff.</span></div>
    </aside>
    <section className="booking-panel" aria-labelledby="booking-title">
      <div className="step-heading"><span>Step {Math.min(step, 6)} of 6</span><div className="progress-line"><i style={{ width: `${Math.min(step, 6) / 6 * 100}%` }} /></div></div>
      {error && <div className="form-error" role="alert"><CircleAlert size={18} />{error}</div>}
      {step === 1 && <div className="booking-step">
        <p className="eyebrow">01 — SELECT SERVICE</p><h2 id="booking-title">What would you like to book?</h2><p className="step-copy">The centre’s approved appointment services appear here.</p>
        {servicesQuery.isLoading ? <div className="loading-line"><Loader2 className="spin" />Loading services</div> : <div className="service-picker">{servicesQuery.data?.map(item => <button key={item.id} onClick={() => setServiceId(item.id)} className={serviceId === item.id ? "selected" : ""}><span className="service-radio" aria-hidden="true" /> <span><b>{item.name}</b><small>{item.description || "Details can be confirmed with the centre."}</small></span><em>{item.durationMinutes} min</em></button>)}</div>}
      </div>}
      {step === 2 && <div className="booking-step">
        <p className="eyebrow">02 — CHOOSE A DATE</p><h2>When would you prefer to visit?</h2><p className="step-copy">Available dates are shown in the centre’s local timezone.</p>
        <div className="date-calendar"><div className="calendar-caption"><button aria-label="Previous month" disabled><ChevronLeft size={18} /></button><b>{new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date())}</b><button aria-label="Next month" disabled><ChevronRight size={18} /></button></div><div className="date-grid">{dates.map(item => <button key={item.iso} onClick={() => setDate(item.iso)} className={date === item.iso ? "selected" : ""} aria-pressed={date === item.iso}><span>{item.weekday}</span><b>{item.day}</b></button>)}</div></div>
      </div>}
      {step === 3 && <div className="booking-step">
        <p className="eyebrow">03 — CHOOSE A TIME</p><h2>Pick a time that works for you.</h2><p className="step-copy">{date ? dateLabel(date) : "Select a date to see times."}</p>
        {slotsQuery.isLoading ? <div className="loading-line"><Loader2 className="spin" />Finding available times</div> : <div className="time-grid">{slotsQuery.data?.map(slot => <button key={slot.time} disabled={!slot.available} onClick={() => setTime(slot.time)} className={time === slot.time ? "selected" : ""}><Clock3 size={15} />{formatTime(slot.time)}</button>)}</div>}
      </div>}
      {step === 4 && <div className="booking-step">
        <p className="eyebrow">04 — YOUR DETAILS</p><h2>Tell us just what we need.</h2><p className="step-copy">We do not request an email address or medical history to make an appointment.</p>
        <div className="form-grid"><div><Label htmlFor="fullName">Full name</Label><Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" autoComplete="name" /></div><div><Label htmlFor="phone">Mobile number</Label><Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 98765 43210" autoComplete="tel" inputMode="tel" /></div><div className="full-span"><Label htmlFor="reason">Reason for visit <span>Optional</span></Label><Textarea id="reason" value={reason} onChange={e => setReason(e.target.value)} placeholder="A brief note for the centre, if helpful" rows={3} /></div></div>
        <button type="button" className={captchaComplete ? "captcha-box complete" : "captcha-box"} onClick={() => setCaptchaComplete(true)} aria-pressed={captchaComplete}><span>{captchaComplete ? <Check size={16} /> : null}</span><b>{captchaComplete ? "Security check completed" : "Complete security check"}</b><small>reCAPTCHA will be enabled with the centre’s production key.</small></button>
      </div>}
      {step === 5 && <div className="booking-step otp-step">
        <p className="eyebrow">05 — VERIFY YOUR NUMBER</p><h2>Enter your SMS code.</h2><p className="step-copy">A six-digit code has been sent to <strong>{phone}</strong>.</p>
        {import.meta.env.DEV && <div className="dev-notice"><Sparkles size={16} /><span><b>Preview mode</b> — use code <strong>246810</strong>. Live SMS is activated when the centre adds its verified SMS provider credentials.</span></div>}
        <div className="otp-input"><Label htmlFor="otpCode">Verification code</Label><Input id="otpCode" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" inputMode="numeric" autoComplete="one-time-code" /></div>
      </div>}
      {step === 6 && <div className="booking-step">
        <p className="eyebrow">06 — CONFIRM</p><h2>Review your appointment.</h2><p className="step-copy">We’ll do one final availability check before confirming your booking.</p>
        <div className="booking-review"><div><span>Service</span><b>{service?.name}</b></div><div><span>Date</span><b>{date && dateLabel(date)}</b></div><div><span>Time</span><b>{time && formatTime(time)}</b></div><div><span>Patient</span><b>{fullName}</b></div><div><span>Phone</span><b>{phone}</b></div></div>
      </div>}
      <div className="booking-actions">
        {step > 1 && step < 7 && <Button variant="ghost" onClick={() => { setError(undefined); setStep(step - 1); }} disabled={requestOtp.isPending || verifyOtp.isPending || createBooking.isPending}>Back</Button>}
        {step < 4 && <Button onClick={goNext} disabled={!canContinue}>Continue <MoveUpRight size={16} /></Button>}
        {step === 4 && <Button onClick={requestCode} disabled={!canContinue || requestOtp.isPending}>{requestOtp.isPending ? <><Loader2 className="spin" />Sending code</> : <>Send verification code <MoveUpRight size={16} /></>}</Button>}
        {step === 5 && <Button onClick={confirmCode} disabled={code.length !== 6 || verifyOtp.isPending}>{verifyOtp.isPending ? <><Loader2 className="spin" />Checking</> : <>Verify number <ShieldCheck size={16} /></>}</Button>}
        {step === 6 && <Button onClick={confirmBooking} disabled={createBooking.isPending}>{createBooking.isPending ? <><Loader2 className="spin" />Confirming</> : <>Confirm appointment <Check size={16} /></>}</Button>}
      </div>
    </section>
  </div>;
}
