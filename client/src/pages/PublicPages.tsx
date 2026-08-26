import { SiteFooter, SiteHeader } from "@/components/SiteHeader";
import { trpc } from "@/lib/trpc";
import { ArrowDown, CheckCircle2, CircleArrowUp, Eye, MoveUpRight, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "wouter";

const heroImage = "/manus-storage/eye-exam-editorial_9c50ae91.jpg";
const equipmentImage = "/manus-storage/vision-equipment_3f1da33e.jpg";
const clinicImage = "/manus-storage/clinic-interior_7361ec46.jpg";

export function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="public-site"><SiteHeader /><main>{children}</main><SiteFooter /></div>;
}

function BookingCta({ dark = false }: { dark?: boolean }) {
  return <Link href="/book" className={dark ? "primary-link on-dark" : "primary-link"}>Book appointment <MoveUpRight size={16} /></Link>;
}

export function HomePage() {
  return <PublicLayout>
    <section className="hero-section">
      <div className="hero-copy"><p className="eyebrow">SHIREESHA 6/6 VISION CARE CENTRE</p><h1>See clearly.<br /><em>Live fully.</em></h1><p className="hero-lead">A considered place to begin your eye-care appointment, with a simple path from choosing a time to confirmed booking.</p><div className="hero-actions"><BookingCta /><Link href="/services" className="secondary-link">Explore services <ArrowDown size={15} /></Link></div></div>
      <div className="hero-visual"><img src={heroImage} alt="Eye examination equipment in use" /><div className="image-caption"><span>01</span><p>Thoughtful appointments,<br />made easier.</p></div></div>
    </section>
    <section className="principles-strip" aria-label="Centre booking principles"><div><ShieldCheck size={23} /><b>Private by design</b><p>Only the information needed for your booking.</p></div><div><CircleArrowUp size={23} /><b>Easy to arrange</b><p>Choose your time, verify your phone, and confirm.</p></div><div><CheckCircle2 size={23} /><b>Clear confirmation</b><p>A booking reference and appointment details when complete.</p></div></section>
    <section className="editorial-section intro-section"><div className="section-label"><span>01</span><p>A considered approach</p></div><div className="intro-copy"><h2>Care begins with <em>attention.</em></h2><p>Every interaction should feel clear, calm and easy to understand. The centre’s appointment experience is designed to keep the focus where it belongs: on your time and your visit.</p><Link href="/about" className="text-link">About the centre <MoveUpRight size={15} /></Link></div></section>
    <section className="feature-split"><div className="feature-image"><img src={equipmentImage} alt="Vision examination equipment" loading="lazy" /></div><div className="feature-copy"><p className="eyebrow">APPOINTMENTS, SIMPLIFIED</p><h2>Choose.<br /><em>Verify. Book.</em></h2><p>Take a moment to choose an approved service, a date and a time. Phone verification protects the availability of appointments for everyone.</p><BookingCta /></div></section>
    <section className="services-preview"><div><p className="eyebrow">SERVICES</p><h2>Designed around<br /><em>what you need.</em></h2></div><div className="services-list"><ServiceLines /><Link href="/services" className="text-link">View all services <MoveUpRight size={15} /></Link></div></section>
    <section className="closing-cta"><div><p className="eyebrow">PLAN YOUR VISIT</p><h2>Book a time<br />that <em>works for you.</em></h2></div><BookingCta dark /></section>
  </PublicLayout>;
}

export function ServiceLines() {
  const { data, isLoading } = trpc.booking.services.useQuery();
  if (isLoading) return <p className="muted-copy">Loading approved services…</p>;
  return <>{data?.map((service, index) => <article className="service-line" key={service.id}><span>0{index + 1}</span><div><h3>{service.name}</h3><p>{service.description || "Details can be confirmed with the centre."}</p></div><b>{service.durationMinutes} min</b></article>)}</>;
}

export function ServicesPage() {
  return <PublicLayout><section className="page-hero"><p className="eyebrow">SERVICES</p><h1>What would you<br /><em>like to arrange?</em></h1><p>Choose the appointment that best reflects the reason for your visit, then select a convenient time.</p></section><section className="services-page-list"><ServiceLines /></section><section className="inline-cta"><div><p className="eyebrow">READY WHEN YOU ARE</p><h2>Find a time<br /><em>that suits you.</em></h2></div><BookingCta dark /></section></PublicLayout>;
}

export function AboutPage() {
  return <PublicLayout><section className="about-hero"><div><p className="eyebrow">ABOUT SHIREESHA 6/6</p><h1>A quieter, clearer<br /><em>way to begin.</em></h1><p>Shireesha 6/6 Vision Care Centre is presented here as a focused appointment experience — built around clarity, privacy and thoughtful access to care.</p><BookingCta /></div><figure><img src={clinicImage} alt="Clean clinic interior" /><figcaption>Space for the information that matters.</figcaption></figure></section><section className="values-grid"><div><Sparkles size={20}/><h2>Clear by default</h2><p>Plain-language steps and decisions that are easy to follow.</p></div><div><Eye size={20}/><h2>Focused experience</h2><p>One primary action: arrange a suitable appointment.</p></div><div><ShieldCheck size={20}/><h2>Respectful privacy</h2><p>Booking details are handled as private centre information.</p></div></section></PublicLayout>;
}

export function ContactPage() {
  return <PublicLayout><section className="page-hero contact-hero"><p className="eyebrow">CONTACT</p><h1>Plan your visit<br /><em>with confidence.</em></h1><p>For the clearest path to an appointment, choose a time online and receive your booking reference straight away.</p></section><section className="contact-details"><div><p className="eyebrow">CENTRE DETAILS</p><h2>Shireesha 6/6<br />Vision Care Centre</h2><p className="muted-copy">Verified phone, address and opening-hour details will be shared here by the centre.</p></div><div className="contact-list"><div><span>Phone</span><b>Centre number to be confirmed</b></div><div><span>Address</span><b>Centre address to be confirmed</b></div><div><span>Opening hours</span><b>Opening hours to be confirmed</b></div></div></section><section className="map-placeholder"><div><Eye size={30}/><p>Location details to follow</p><small>Book online to reserve a suitable appointment time.</small></div></section><section className="inline-cta"><div><p className="eyebrow">PREFER TO BOOK NOW?</p><h2>Choose a time<br /><em>online.</em></h2></div><BookingCta dark /></section></PublicLayout>;
}
