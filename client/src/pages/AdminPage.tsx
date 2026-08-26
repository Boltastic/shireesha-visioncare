import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { CalendarDays, Check, ChevronRight, ClipboardList, Clock3, ExternalLink, Loader2, Search, Settings2, UsersRound } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

const dateTime = (value: Date) => new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(value));
const timeOnly = (value: Date) => new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
const titleFromLocation = (location: string) => location.includes("appointments") ? "Appointments" : location.includes("patients") ? "Patients" : location.includes("services") ? "Services" : location.includes("settings") ? "Settings" : "Today";
const labelStatus = (status: string) => status === "no_show" ? "No-show" : status.charAt(0).toUpperCase() + status.slice(1);

function Stat({ label, value }: { label: string; value: number }) { return <div className="admin-stat"><b>{value}</b><span>{label}</span></div>; }

function Overview() {
  const overview = trpc.admin.overview.useQuery();
  if (overview.isLoading) return <AdminLoading />;
  const data = overview.data;
  return <div className="admin-content"><div className="admin-heading"><div><p className="eyebrow">DASHBOARD</p><h1>Today’s <em>appointments</em></h1></div><p>{new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(new Date())}</p></div><div className="admin-stats"><Stat label="Today" value={data?.totals.today ?? 0} /><Stat label="Upcoming" value={data?.totals.upcoming ?? 0} /><Stat label="Pending" value={data?.totals.pending ?? 0} /></div><section className="admin-card"><div className="card-head"><h2>Today’s schedule</h2><a href="/admin/appointments">All appointments <ChevronRight size={15} /></a></div>{data?.today.length ? <div className="schedule-list">{data.today.map(item => <div key={item.id} className="schedule-item"><b>{timeOnly(item.startTime)}</b><div><strong>{item.patientName}</strong><span>{item.serviceName} · {item.phone}</span></div><span className={`status-pill ${item.status}`}>{labelStatus(item.status)}</span></div>)}</div> : <EmptyState title="No appointments are scheduled today." body="When confirmed bookings arrive, they will appear here." />}</section></div>;
}

function Appointments() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string | undefined>();
  const [rescheduleId, setRescheduleId] = useState<number>();
  const [rescheduleDate, setRescheduleDate] = useState(() => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [rescheduleTime, setRescheduleTime] = useState("09:00");
  const query = trpc.admin.appointments.list.useQuery({ search: search || undefined, status: status as "pending" | "confirmed" | "cancelled" | "completed" | "no_show" | undefined });
  const utils = trpc.useUtils();
  const update = trpc.admin.appointments.updateStatus.useMutation({ onSuccess: () => utils.admin.appointments.list.invalidate() });
  const reschedule = trpc.admin.appointments.reschedule.useMutation({ onSuccess: () => { setRescheduleId(undefined); utils.admin.appointments.list.invalidate(); } });
  return <div className="admin-content"><div className="admin-heading"><div><p className="eyebrow">APPOINTMENTS</p><h1>Keep the day <em>moving.</em></h1></div></div><div className="table-controls"><div className="search-field"><Search size={17}/><Input aria-label="Search appointments" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or phone" /></div><div className="filter-buttons" aria-label="Filter appointments">{[undefined, "confirmed", "completed", "cancelled"].map(item => <button key={item ?? "all"} onClick={() => setStatus(item)} className={status === item ? "active" : ""}>{item ? labelStatus(item) : "All"}</button>)}</div></div><section className="admin-card appointment-table"><div className="table-header"><span>Patient</span><span>Appointment</span><span>Status</span><span>Actions</span></div>{query.isLoading ? <AdminLoading /> : query.data?.length ? query.data.map(item => <div className="table-row" key={item.id}><div><strong>{item.patientName}</strong><span>{item.phone}<small>{item.bookingId}</small></span></div><div><strong>{dateTime(item.startTime)}</strong><span>{item.serviceName}{item.reason ? <small>{item.reason}</small> : null}</span></div><div><span className={`status-pill ${item.status}`}>{labelStatus(item.status)}</span></div><div className="row-actions">{["confirmed", "pending"].includes(item.status) && <><button onClick={() => update.mutate({ id: item.id, status: "completed" })}>Complete</button><button onClick={() => update.mutate({ id: item.id, status: "cancelled" })}>Cancel</button><button onClick={() => setRescheduleId(rescheduleId === item.id ? undefined : item.id)}>Reschedule</button></>}</div>{rescheduleId === item.id && <div className="reschedule-inline"><label>New date<Input type="date" value={rescheduleDate} onChange={e => setRescheduleDate(e.target.value)} /></label><label>New time<select value={rescheduleTime} onChange={e => setRescheduleTime(e.target.value)}>{["09:00","09:30","10:00","10:30","11:00","11:30","14:00","14:30","15:00","15:30","16:00","16:30"].map(time => <option key={time}>{time}</option>)}</select></label><Button onClick={() => reschedule.mutate({ id: item.id, date: rescheduleDate, time: rescheduleTime })} disabled={reschedule.isPending}>{reschedule.isPending ? <Loader2 className="spin"/> : "Save new time"}</Button></div>}</div>) : <EmptyState title="No matching appointments." body="Try a different search or status." />}</section></div>;
}

function Patients() {
  const [search, setSearch] = useState("");
  const query = trpc.admin.patients.list.useQuery({ search: search || undefined });
  return <div className="admin-content"><div className="admin-heading"><div><p className="eyebrow">PATIENTS</p><h1>Private, clear <em>records.</em></h1></div><p>Appointment details only. This is not a medical record system.</p></div><div className="table-controls"><div className="search-field"><Search size={17}/><Input aria-label="Search patients" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or phone" /></div></div><section className="admin-card appointment-table patient-table"><div className="table-header"><span>Patient</span><span>Appointments</span><span>Last appointment</span><span>Upcoming</span></div>{query.isLoading ? <AdminLoading /> : query.data?.length ? query.data.map(item => <div className="table-row" key={item.id}><div><strong>{item.fullName}</strong><span>{item.phone}</span></div><div><strong>{item.appointmentCount}</strong><span>booking{item.appointmentCount === 1 ? "" : "s"}</span></div><div><strong>{item.lastAppointment ? dateTime(item.lastAppointment) : "—"}</strong></div><div><strong>{item.upcomingAppointment ? dateTime(item.upcomingAppointment) : "—"}</strong></div></div>) : <EmptyState title="No patients yet." body="Patients appear after a verified booking." />}</section></div>;
}

function Services() {
  const [name, setName] = useState(""); const [duration, setDuration] = useState("30");
  const services = trpc.admin.services.list.useQuery(); const utils = trpc.useUtils();
  const create = trpc.admin.services.create.useMutation({ onSuccess: () => { setName(""); utils.admin.services.list.invalidate(); } });
  const toggle = trpc.admin.services.toggle.useMutation({ onSuccess: () => utils.admin.services.list.invalidate() });
  return <div className="admin-content"><div className="admin-heading"><div><p className="eyebrow">SERVICES</p><h1>Approved appointment <em>services.</em></h1></div><p>Only active services appear in public booking.</p></div><section className="admin-card service-admin"><div className="card-head"><h2>Add a service</h2></div><form onSubmit={e => { e.preventDefault(); if (name.trim()) create.mutate({ name, durationMinutes: Number(duration) }); }} className="service-form"><Input value={name} onChange={e => setName(e.target.value)} placeholder="Approved service name" aria-label="Service name" /><select value={duration} onChange={e => setDuration(e.target.value)} aria-label="Appointment duration"><option value="15">15 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">60 min</option></select><Button disabled={create.isPending}>{create.isPending ? <Loader2 className="spin" /> : "Add service"}</Button></form></section><section className="admin-card service-list-admin">{services.isLoading ? <AdminLoading /> : services.data?.map(item => <div key={item.id}><div><strong>{item.name}</strong><span>{item.description || "No public description added."}</span></div><span>{item.durationMinutes} min</span><button onClick={() => toggle.mutate({ id: item.id, active: !item.active })} className={item.active ? "toggle on" : "toggle"} aria-pressed={item.active}><i />{item.active ? "Active" : "Inactive"}</button></div>)}</section></div>;
}

function Settings() {
  const settings = trpc.admin.settings.list.useQuery();
  const utils = trpc.useUtils(); const update = trpc.admin.settings.update.useMutation({ onSuccess: () => utils.admin.settings.list.invalidate() });
  const setting = (key: string, fallback: string) => settings.data?.find(item => item.key === key)?.value ?? fallback;
  const cards = [{ key: "max_active_bookings", label: "Maximum active bookings per phone", fallback: "2" }, { key: "slot_hold_minutes", label: "Slot hold duration (minutes)", fallback: "5" }, { key: "min_booking_notice_hours", label: "Minimum booking notice (hours)", fallback: "1" }, { key: "max_booking_days", label: "Maximum advance period (days)", fallback: "90" }];
  return <div className="admin-content"><div className="admin-heading"><div><p className="eyebrow">SETTINGS</p><h1>Keep the system <em>in step.</em></h1></div></div><section className="settings-grid">{cards.map(card => <div className="settings-item" key={card.key}><span>{card.label}</span><div><Input defaultValue={setting(card.key, card.fallback)} aria-label={card.label} onBlur={e => { if (e.target.value !== setting(card.key, card.fallback)) update.mutate({ key: card.key, value: e.target.value }); }} /></div></div>)}</section><AvailabilityEditor /><section className="admin-card integration-card"><div><p className="eyebrow">CALENDAR</p><h2>Google Calendar</h2><p>Connect a verified Google OAuth integration before launch. Calendar events are not created until this connection is configured.</p></div><span className="status-pill pending">Setup required</span></section></div>;
}

function AvailabilityEditor() {
  const availability = trpc.admin.availability.list.useQuery(); const utils = trpc.useUtils();
  const save = trpc.admin.availability.saveRule.useMutation({ onSuccess: () => utils.admin.availability.list.invalidate() });
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return <section className="admin-card availability-card"><div className="card-head"><div><h2>Weekly availability</h2><p>These times determine which appointment slots can be booked.</p></div></div>{availability.isLoading ? <AdminLoading /> : days.map((day, dayOfWeek) => { const rule = availability.data?.rules.find(item => item.dayOfWeek === dayOfWeek); const start = rule?.startTime ?? "09:00"; const end = rule?.endTime ?? "17:00"; const active = rule?.active ?? (dayOfWeek !== 0); return <div className="availability-row" key={day}><strong>{day}</strong><Input type="time" defaultValue={start} onBlur={e => save.mutate({ dayOfWeek, startTime: e.target.value, endTime: end, active })} /><span>to</span><Input type="time" defaultValue={end} onBlur={e => save.mutate({ dayOfWeek, startTime: start, endTime: e.target.value, active })} /><button className={active ? "toggle on" : "toggle"} onClick={() => save.mutate({ dayOfWeek, startTime: start, endTime: end, active: !active })} aria-pressed={active}><i />{active ? "Open" : "Closed"}</button></div>; })}</section>;
}

function EmptyState({ title, body }: { title: string; body: string }) { return <div className="empty-state"><ClipboardList size={26}/><strong>{title}</strong><p>{body}</p></div>; }
function AdminLoading() { return <div className="admin-loading"><Loader2 className="spin" /> Loading</div>; }

export default function AdminPage() {
  const { user, loading } = useAuth(); const [location] = useLocation();
  let content = <Overview />;
  if (location.includes("appointments")) content = <Appointments />;
  if (location.includes("patients")) content = <Patients />;
  if (location.includes("services")) content = <Services />;
  if (location.includes("settings")) content = <Settings />;
  return <DashboardLayout>{loading ? <AdminLoading /> : user && user.role !== "admin" ? <div className="admin-denied"><p className="eyebrow">RESTRICTED AREA</p><h1>Staff access<br /><em>required.</em></h1><p>Your account is signed in but is not assigned to the centre’s staff role. Ask the centre owner to add your account before accessing appointment information.</p></div> : content}</DashboardLayout>;
}
