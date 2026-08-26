import { Menu, MoveUpRight, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const nav = [
  { label: "Home", path: "/" },
  { label: "Services", path: "/services" },
  { label: "About", path: "/about" },
  { label: "Contact", path: "/contact" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="brand" aria-label="Shireesha 6/6 Vision Care Centre home">
          <span className="brand__name">Shireesha <i>6/6</i></span>
          <span className="brand__sub">Vision Care Centre</span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {nav.map(item => <Link key={item.path} href={item.path} className={location === item.path ? "is-active" : ""}>{item.label}</Link>)}
        </nav>
        <Link href="/book" className="header-cta">Book appointment <MoveUpRight size={15} aria-hidden="true" /></Link>
        <button className="menu-trigger" onClick={() => setOpen(!open)} aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open}>
          {open ? <X size={23} /> : <Menu size={24} />}
        </button>
      </div>
      {open && <nav className="mobile-nav" aria-label="Mobile navigation">
        {nav.map(item => <Link key={item.path} href={item.path} onClick={() => setOpen(false)}>{item.label}</Link>)}
        <Link href="/book" onClick={() => setOpen(false)} className="mobile-book">Book appointment <MoveUpRight size={16} /></Link>
      </nav>}
    </header>
  );
}

export function SiteFooter() {
  return <footer className="site-footer">
    <div>
      <p className="eyebrow">SHIREESHA 6/6</p>
      <p className="footer-title">Care, clearly considered.</p>
    </div>
    <div className="footer-links">
      <Link href="/services">Services</Link><Link href="/about">About</Link><Link href="/contact">Contact</Link><Link href="/book">Book appointment</Link>
    </div>
    <p className="footer-note">A focused appointment experience for Shireesha 6/6 Vision Care Centre.</p>
  </footer>;
}
