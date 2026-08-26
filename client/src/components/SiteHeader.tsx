import { Menu, MoveUpRight, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";

const nav = [
  { key: "nav.home", path: "/" },
  { key: "nav.services", path: "/services" },
  { key: "nav.about", path: "/about" },
  { key: "nav.contact", path: "/contact" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const { locale, setLocale, t } = useLanguage();
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="brand" aria-label="Shireesha 6/6 Vision Care Centre home">
          <span className="brand__name">Shireesha <i>6/6</i></span>
          <span className="brand__sub">Vision Care Centre</span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {nav.map(item => <Link key={item.path} href={item.path} className={location === item.path ? "is-active" : ""}>{t(item.key)}</Link>)}
        </nav>
        <div className="language-toggle" role="group" aria-label="Website language"><button onClick={() => setLocale("en")} className={locale === "en" ? "active" : ""}>EN</button><button onClick={() => setLocale("te")} className={locale === "te" ? "active" : ""}>తెలుగు</button></div>
        <Link href="/book" className="header-cta">{t("nav.book")} <MoveUpRight size={15} aria-hidden="true" /></Link>
        <button className="menu-trigger" onClick={() => setOpen(!open)} aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open}>
          {open ? <X size={23} /> : <Menu size={24} />}
        </button>
      </div>
      {open && <nav className="mobile-nav" aria-label="Mobile navigation">
        {nav.map(item => <Link key={item.path} href={item.path} onClick={() => setOpen(false)}>{t(item.key)}</Link>)}
        <Link href="/book" onClick={() => setOpen(false)} className="mobile-book">{t("nav.book")} <MoveUpRight size={16} /></Link>
      </nav>}
    </header>
  );
}

export function SiteFooter() {
  const { t } = useLanguage();
  return <footer className="site-footer">
    <div>
      <p className="eyebrow">SHIREESHA 6/6</p>
      <p className="footer-title">{t("footer.tagline")}</p>
    </div>
    <div className="footer-links">
      <Link href="/services">{t("nav.services")}</Link><Link href="/about">{t("nav.about")}</Link><Link href="/contact">{t("nav.contact")}</Link><Link href="/book">{t("nav.book")}</Link>
    </div>
    <p className="footer-note">{t("footer.note")}</p>
  </footer>;
}
