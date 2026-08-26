import { Button } from "@/components/ui/button";
import { CalendarDays, LayoutDashboard, LogOut, Settings2, Stethoscope, Users } from "lucide-react";
import { useLocation } from "wouter";

const menuItems = [
  { icon: LayoutDashboard, label: "Today", path: "/admin" },
  { icon: CalendarDays, label: "Appointments", path: "/admin/appointments" },
  { icon: Users, label: "Patients", path: "/admin/patients" },
  { icon: Stethoscope, label: "Services", path: "/admin/services" },
  { icon: Settings2, label: "Settings", path: "/admin/settings" },
];

export default function DashboardLayout({ children, email, onLogout }: { children: React.ReactNode; email: string; onLogout: () => void }) {
  const [location, setLocation] = useLocation();
  return <div className="staff-shell"><aside className="staff-sidebar"><button className="staff-brand" onClick={() => setLocation("/admin")}>Shireesha 6/6</button><nav>{menuItems.map(item => <button key={item.path} className={location === item.path ? "active" : ""} onClick={() => setLocation(item.path)}><item.icon size={17} /><span>{item.label}</span></button>)}</nav><div className="staff-profile"><span>V</span><div><b>Vision Care Staff</b><small>{email}</small></div><Button variant="ghost" size="icon" onClick={onLogout} aria-label="Sign out"><LogOut size={16} /></Button></div></aside><main className="staff-main">{children}</main></div>;
}
