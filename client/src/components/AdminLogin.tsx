import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { CircleAlert, Loader2, LockKeyhole, MoveUpRight } from "lucide-react";
import { useState } from "react";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const utils = trpc.useUtils();
  const login = trpc.adminAuth.login.useMutation({ onSuccess: () => utils.adminAuth.session.invalidate() });
  return <main className="admin-login"><section className="admin-login__panel"><p className="eyebrow">STAFF ACCESS</p><h1>Welcome<br /><em>back.</em></h1><p>Use the centre administrator email and password to view appointment information.</p><form onSubmit={event => { event.preventDefault(); login.mutate({ email, password }); }}>
    <label htmlFor="admin-email">Email address</label><Input id="admin-email" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="username" required />
    <label htmlFor="admin-password">Password</label><Input id="admin-password" type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required />
    {login.error && <p className="admin-login__error" role="alert"><CircleAlert size={16} />{login.error.message}</p>}
    <Button type="submit" disabled={login.isPending}>{login.isPending ? <><Loader2 className="spin" />Checking access</> : <>Sign in <MoveUpRight size={16} /></>}</Button>
  </form><div className="admin-login__note"><LockKeyhole size={16} />Your session is encrypted and expires automatically.</div></section></main>;
}
