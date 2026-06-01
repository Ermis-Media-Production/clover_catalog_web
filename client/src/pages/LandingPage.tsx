import { Link } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { ShoppingCart, MapPin, Clock, Phone, ChevronRight, Star, Flame, Pizza } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const HERO_IMAGE =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663720514377/ejCzvr6KZgeQPg5quv8Pa2/hero_pizza_wings-kzMmbtFr4p4MhqzWSb6X7g.webp";

const HOURS = [
  { day: "Monday", hours: "10:00 AM – 10:00 PM" },
  { day: "Tuesday", hours: "10:00 AM – 10:00 PM" },
  { day: "Wednesday", hours: "10:00 AM – 10:00 PM" },
  { day: "Thursday", hours: "10:00 AM – 10:00 PM" },
  { day: "Friday", hours: "10:00 AM – 10:00 PM" },
  { day: "Saturday", hours: "10:00 AM – 10:00 PM" },
  { day: "Sunday", hours: "10:00 AM – 10:00 PM" },
];

function getTodayStatus() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon ... 6=Sat
  const hour = now.getHours();
  const minute = now.getMinutes();
  const current = hour * 60 + minute;

  // Open/close times in minutes from midnight — 10:00 AM to 10:00 PM every day
  const schedule: Record<number, { open: number; close: number }> = {
    0: { open: 10 * 60, close: 22 * 60 },       // Sun
    1: { open: 10 * 60, close: 22 * 60 },       // Mon
    2: { open: 10 * 60, close: 22 * 60 },
    3: { open: 10 * 60, close: 22 * 60 },
    4: { open: 10 * 60, close: 22 * 60 },
    5: { open: 10 * 60, close: 22 * 60 },       // Fri
    6: { open: 10 * 60, close: 22 * 60 },       // Sat
  };

  const today = schedule[day];
  if (!today) return { open: false, label: "Closed today" };

  if (current >= today.open && current < today.close) {
    const closeHour = Math.floor(today.close / 60);
    const closeMin = today.close % 60;
    const closeStr = `${closeHour > 12 ? closeHour - 12 : closeHour}:${closeMin.toString().padStart(2, "0")} ${closeHour >= 12 ? "PM" : "AM"}`;
    return { open: true, label: `Open now · Closes at ${closeStr}` };
  }
  if (current < today.open) {
    const openHour = Math.floor(today.open / 60);
    const openStr = `${openHour > 12 ? openHour - 12 : openHour}:00 ${openHour >= 12 ? "PM" : "AM"}`;
    return { open: false, label: `Opens at ${openStr}` };
  }
  return { open: false, label: "Closed for today" };
}

const DAYS_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TODAY_NAME = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];

export default function LandingPage() {
  const { totalItems, openCart } = useCart();
  const status = getTodayStatus();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── NAV ── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
            <Pizza className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-lg text-foreground">Casa de Pizza & Wings</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/menu">
            <Button variant="ghost" size="sm" className="hidden sm:flex">
              Menu
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="relative"
            onClick={openCart}
          >
            <ShoppingCart className="w-4 h-4" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </Button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
        />
        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-background" />

        {/* Hero content */}
        <div className="relative z-10 text-center px-6 max-w-3xl mx-auto pt-20">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Badge
              className="px-3 py-1 text-sm font-medium"
              style={{
                background: status.open
                  ? "oklch(0.65 0.18 145 / 0.2)"
                  : "oklch(0.6 0.22 25 / 0.2)",
                color: status.open ? "oklch(0.75 0.18 145)" : "oklch(0.75 0.22 25)",
                border: `1px solid ${status.open ? "oklch(0.65 0.18 145 / 0.4)" : "oklch(0.6 0.22 25 / 0.4)"}`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full mr-2 inline-block"
                style={{ background: status.open ? "oklch(0.65 0.18 145)" : "oklch(0.6 0.22 25)" }}
              />
              {status.label}
            </Badge>
          </div>

          <h1 className="font-display text-5xl sm:text-7xl font-bold text-white leading-tight mb-4">
            Casa de<br />
            <span className="text-primary">Pizza & Wings</span>
          </h1>

          <p className="text-white/80 text-lg sm:text-xl mb-10 max-w-xl mx-auto leading-relaxed">
            Authentic wood-fired pizzas, crispy wings, and handmade strombolis — crafted fresh for every order.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/menu">
              <Button size="lg" className="w-full sm:w-auto text-base px-8 py-6 font-semibold shadow-lg shadow-primary/30">
                Order Now
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
            <a href="#info">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8 py-6 font-semibold bg-white/10 border-white/30 text-white hover:bg-white/20">
                Hours & Location
              </Button>
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/40 text-xs animate-bounce">
          <span>Scroll</span>
          <ChevronRight className="w-4 h-4 rotate-90" />
        </div>
      </section>

      {/* ── HIGHLIGHTS ── */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            {
              icon: <Pizza className="w-7 h-7 text-primary" />,
              title: "Wood-Fired Pizzas",
              desc: "Authentic dough, house-made sauce, and premium toppings baked to perfection.",
            },
            {
              icon: <Flame className="w-7 h-7 text-orange-400" />,
              title: "Crispy Wings",
              desc: "Buffalo, BBQ, garlic parmesan — choose your flavor, choose your heat.",
            },
            {
              icon: <Star className="w-7 h-7 text-yellow-400" />,
              title: "Strombolis & Calzones",
              desc: "Stuffed with your favorite fillings, folded and baked golden every time.",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card p-6 flex flex-col gap-3 hover:border-primary/40 transition-colors"
            >
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                {f.icon}
              </div>
              <h3 className="font-display font-semibold text-lg text-foreground">{f.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOURS & ADDRESS ── */}
      <section id="info" className="py-16 px-6 bg-card/50">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Hours */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Clock className="w-5 h-5 text-primary" />
              <h2 className="font-display text-2xl font-bold text-foreground">Hours</h2>
            </div>
            <div className="space-y-2">
              {HOURS.map(({ day, hours }) => {
                const isToday = day === TODAY_NAME;
                return (
                  <div
                    key={day}
                    className={`flex items-center justify-between py-2.5 px-4 rounded-lg transition-colors ${
                      isToday
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <span
                      className={`font-medium text-sm ${
                        isToday ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {day}
                      {isToday && (
                        <span className="ml-2 text-xs font-normal text-primary/70">Today</span>
                      )}
                    </span>
                    <span
                      className={`text-sm ${
                        isToday ? "text-primary font-semibold" : "text-muted-foreground"
                      }`}
                    >
                      {hours}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Address & Contact */}
          <div className="flex flex-col gap-8">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <MapPin className="w-5 h-5 text-primary" />
                <h2 className="font-display text-2xl font-bold text-foreground">Location</h2>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
                <div>
                  <p className="text-foreground font-semibold text-base leading-snug">
                    Casa de Pizza & Wings
                  </p>
                  <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
                    765 N Nellis Blvd, Suite 10<br />
                    Las Vegas, NV 89110
                  </p>
                </div>
                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=765+N+Nellis+Blvd+Suite+10+Las+Vegas+NV+89110"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary text-sm hover:underline"
                >
                  <MapPin className="w-4 h-4 flex-shrink-0" />
                  <span>Get Directions on Google Maps</span>
                </a>
                <a
                  href="tel:+17022005252"
                  className="flex items-center gap-2 text-primary text-sm hover:underline"
                >
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <span>(702) 200-5252</span>
                </a>
                <div className="w-full h-44 rounded-xl overflow-hidden border border-border">
                  <iframe
                    title="Casa de Pizza & Wings location"
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    loading="lazy"
                    allowFullScreen
                    referrerPolicy="no-referrer-when-downgrade"
                    src="https://www.google.com/maps/embed/v1/place?key=AIzaSyD-9tSrke72PouQMnMX-a7eZSW0jkFMBWY&q=765+N+Nellis+Blvd+Suite+10+Las+Vegas+NV+89110"
                  />
                </div>
              </div>
            </div>

            {/* CTA card */}
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 flex flex-col gap-4">
              <div>
                <h3 className="font-display font-bold text-lg text-foreground">Ready to order?</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  Browse our full menu and place your order online in minutes.
                </p>
              </div>
              <Link href="/menu">
                <Button className="w-full font-semibold" size="lg">
                  View Full Menu
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border px-6 py-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
            <Pizza className="w-3 h-3 text-primary-foreground" />
          </div>
          <span className="font-display font-semibold text-foreground">Casa de Pizza & Wings</span>
        </div>
        <p className="text-muted-foreground text-sm">
          © {new Date().getFullYear()} Casa de Pizza & Wings · All rights reserved
        </p>
        <div className="flex items-center justify-center gap-4 mt-3">
          <Link href="/menu" className="text-muted-foreground hover:text-primary text-sm transition-colors">
            Menu
          </Link>
          <span className="text-border">·</span>
          <a href="#info" className="text-muted-foreground hover:text-primary text-sm transition-colors">
            Hours
          </a>
          <span className="text-border">·</span>
          <a href="#info" className="text-muted-foreground hover:text-primary text-sm transition-colors">
            Location
          </a>
        </div>
      </footer>
    </div>
  );
}
