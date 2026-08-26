import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";

type NotificationKind = "success" | "error" | "info";
type NotificationInput = { kind: NotificationKind; title: string; message?: string; duration?: number };
type NotificationItem = NotificationInput & { id: string };

const NotificationContext = createContext<{ notify: (input: NotificationInput) => void }>({ notify: () => undefined });

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const dismiss = useCallback((id: string) => setItems(current => current.filter(item => item.id !== id)), []);
  const notify = useCallback((input: NotificationInput) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setItems(current => [...current.slice(-3), { ...input, id }]);
    window.setTimeout(() => dismiss(id), input.duration ?? 5200);
  }, [dismiss]);
  const value = useMemo(() => ({ notify }), [notify]);
  return <NotificationContext.Provider value={value}>{children}<aside className="custom-notifications" aria-live="polite" aria-label="Website notifications">{items.map(item => <article key={item.id} className={`custom-notification ${item.kind}`}><div className="custom-notification__icon">{item.kind === "success" ? <CheckCircle2 size={19} /> : item.kind === "error" ? <CircleAlert size={19} /> : <Info size={19} />}</div><div><strong>{item.title}</strong>{item.message && <p>{item.message}</p>}</div><button onClick={() => dismiss(item.id)} aria-label="Dismiss notification"><X size={16} /></button></article>)}</aside></NotificationContext.Provider>;
}

export function useNotification() { return useContext(NotificationContext); }
