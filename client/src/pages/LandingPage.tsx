import { Link } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { MapView } from "@/components/Map";
import { ShoppingCart, MapPin, Clock, Phone, ChevronRight, Star, Flame, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

const LOGO_URL = "/manus-storage/casa_pizza_logo_a63e4fc6.jpg";

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
  const day = now.getDay();
  const current = now.getHours() * 60 + now.getMinutes();
  const open = 10 * 60;
  const close = 22 * 60;
  if (current >= open && current < close) {
    return { open: true, label: "Open Now · Closes at 10:00 PM" };
  }
  if (current < open) return { open: false, label: "Opens at 10:00 AM" };
  return { open: false, label: "Closed for today" };
}

const TODAY_NAME = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()];

const CATEGORIES = [
  { id: "appetizers", num: "01", name: "Appetizers", desc: "Garlic bread, mozzarella sticks & daily specials", img: "/manus-storage/cat_appetizers_9af80b68.jpg" },
  { id: "soups", num: "02", name: "Soups", desc: "Warm, hearty soups made fresh daily", img: "/manus-storage/cat_soups_1748dddc.jpg" },
  { id: "house-salads", num: "03", name: "House Salads", desc: "Fresh salads with house dressings", img: "/manus-storage/cat_house_salads_d106490e.jpg" },
  { id: "specialty-pizzas", num: "04", name: "Specialty Pizzas", desc: "Bold toppings, house sauce, baked to perfection", img: "/manus-storage/cat_specialty_pizzas_63da53b5.jpg" },
  { id: "wings-fingers", num: "05", name: "Wings & Fingers", desc: "Buffalo, BBQ, honey garlic and more", img: "/manus-storage/cat_wings_fingers_e7d7173b.jpg" },
  { id: "stromboli-calzone", num: "06", name: "Stromboli & Calzone", desc: "Golden baked Italian rolled favorites", img: "/manus-storage/cat_stromboli_calzone_939bb559.jpg" },
  { id: "italian-dinners", num: "07", name: "Italian Dinners", desc: "Lasagna, parmigiana, spaghetti & classics", img: "/manus-storage/cat_italian_dinners_0cd78bd4.jpg" },
  { id: "ribs", num: "08", name: "Ribs", desc: "Slow-cooked, fall-off-the-bone BBQ ribs", img: "/manus-storage/cat_ribs_ac0233e9.jpg" },
  { id: "gyro", num: "09", name: "Gyro", desc: "Seasoned meat, tzatziki & fresh veggies in pita", img: "/manus-storage/cat_gyro_116ff15a.jpg" },
  { id: "angus-burgers", num: "10", name: "100% Angus Burgers", desc: "Premium patties, juicy & stacked with fries", img: "/manus-storage/cat_angus_burgers_d8a877a4.jpg" },
  { id: "hot-sandwiches", num: "11", name: "Hot Sandwiches", desc: "Melted cheese & generous fillings on toasted bread", img: "/manus-storage/cat_hot_sandwiches_bdf44518.jpg" },
  { id: "cold-sandwiches", num: "12", name: "Cold Sandwiches", desc: "Premium deli meats & fresh veggies", img: "/manus-storage/cat_cold_sandwiches_9e3d3514.jpg" },
  { id: "desserts", num: "13", name: "Desserts", desc: "Cannoli, tiramisu & sweet endings", img: "/manus-storage/cat_desserts_2424e0f6.jpg" },
  { id: "drinks", num: "14", name: "Drinks", desc: "Sodas, juices & refreshing beverages", img: "/manus-storage/cat_drinks_11639d07.jpg" },
  { id: "lunch-specials", num: "15", name: "Lunch Specials", desc: "Daily deals available 10AM–3PM", img: "/manus-storage/cat_lunch_specials_2ae59a86.jpg" },
  { id: "combo-specials", num: "16", name: "Combo Specials", desc: "Pizza, wings, sides & drinks bundled", img: "/manus-storage/cat_combo_specials_e70479ea.jpg" },
];

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function LandingPage() {
  const { totalItems, openCart, addItem } = useCart();
  const status = getTodayStatus();
  const { data: popularItems = [], isLoading: popularLoading, isError: popularError } = trpc.catalog.getPopularItems.useQuery({ limit: 6 });

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f7f2e8", color: "#1c1c1c" }}>

      {/* ── Top announcement bar ─────────────────────────────────────────── */}
      <div
        className="w-full text-center text-sm font-heading tracking-wider py-2 px-4 flex items-center justify-center gap-6"
        style={{ backgroundColor: "#1a3d0f", color: "#f7f2e8" }}
      >
        <span>🍕 OPEN MON – SUN 10AM–10PM</span>
        <a
          href="tel:+17022005252"
          className="font-bold hover:underline"
          style={{ color: "#f5c842" }}
        >
          CALL: (702) 200-5252
        </a>
      </div>

      {/* ── Navigation ──────────────────────────────────────────────────── */}
      <nav
        className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 shadow-md"
        style={{ backgroundColor: "#ffffff", borderBottom: "3px solid #2d5a1e" }}
      >
        <Link href="/" className="flex items-center gap-3">
          <img src={LOGO_URL} alt="Casa de Pizza & Wings" className="h-12 w-12 object-contain rounded-full" />
          <div className="hidden sm:block">
            <div className="font-display italic font-bold text-lg leading-tight" style={{ color: "#c41e1e" }}>
              Casa de
            </div>
            <div className="font-heading font-bold text-sm tracking-widest leading-tight" style={{ color: "#2d5a1e" }}>
              PIZZA & WINGS
            </div>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {[
            { label: "MENU", href: "/menu" },
            { label: "CONTACT", href: "#contact" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="font-heading font-semibold text-sm tracking-widest hover:underline transition-colors"
              style={{ color: "#2d5a1e" }}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openCart}
            className="relative p-2 rounded-full transition-colors hover:bg-gray-100"
            aria-label="Cart"
          >
            <ShoppingCart className="w-5 h-5" style={{ color: "#2d5a1e" }} />
            {totalItems > 0 && (
              <span
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                style={{ backgroundColor: "#c41e1e" }}
              >
                {totalItems}
              </span>
            )}
          </button>
          <Link href="/menu">
            <button
              className="font-heading font-bold text-sm tracking-wider px-5 py-2 rounded text-white transition-all active:scale-95"
              style={{ backgroundColor: "#c41e1e" }}
            >
              ORDER NOW
            </button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background photo */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, rgba(10,20,5,0.85) 45%, rgba(10,20,5,0.3) 100%)" }} />

        {/* Content */}
        <div className="relative z-10 px-8 md:px-16 max-w-2xl">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-heading font-semibold tracking-widest mb-6"
            style={{ backgroundColor: "#2d5a1e", color: "#f7f2e8" }}
          >
            <Star className="w-3 h-3 fill-current" style={{ color: "#f5c842" }} />
            LAS VEGAS FAVORITE SINCE 2008
          </div>

          {/* Address */}
          <div className="flex items-center gap-2 mb-4 text-sm" style={{ color: "#f5c842" }}>
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span className="font-heading tracking-wider">765 N NELLIS BLVD, LAS VEGAS, NV</span>
          </div>

          {/* Headline */}
          <h1 className="font-display leading-none mb-2">
            <span className="block text-6xl md:text-7xl font-bold" style={{ color: "#f7f2e8" }}>
              Casa De
            </span>
            <span className="block text-6xl md:text-7xl font-bold italic" style={{ color: "#c41e1e" }}>
              Pizza
            </span>
            <span className="block text-4xl md:text-5xl font-bold" style={{ color: "#f7f2e8" }}>
              &amp; Wings
            </span>
          </h1>

          <p className="mt-4 mb-8 text-base md:text-lg leading-relaxed" style={{ color: "rgba(247,242,232,0.85)" }}>
            Specialty pizzas, crispy wings, Angus burgers, Italian dinners and so much more —
            all made fresh, every single day.
          </p>

          {/* Status badge */}
          <div className="flex items-center gap-2 mb-6">
            <span
              className="inline-block w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ backgroundColor: status.open ? "#4ade80" : "#f87171" }}
            />
            <span className="text-sm font-semibold" style={{ color: status.open ? "#4ade80" : "#f87171" }}>
              {status.label}
            </span>
          </div>

          {/* CTAs */}
          <div className="flex flex-wrap gap-4">
            <Link href="/menu">
              <button
                className="font-heading font-bold tracking-wider px-8 py-3 rounded text-white text-sm transition-all active:scale-95 flex items-center gap-2"
                style={{ backgroundColor: "#c41e1e" }}
              >
                VIEW FULL MENU
                <ChevronRight className="w-4 h-4" />
              </button>
            </Link>
            <a
              href="tel:+17022005252"
              className="font-heading font-bold tracking-wider px-8 py-3 rounded text-sm transition-all active:scale-95 flex items-center gap-2"
              style={{ border: "2px solid #f7f2e8", color: "#f7f2e8", backgroundColor: "transparent" }}
            >
              <Phone className="w-4 h-4" />
              CALL &amp; ORDER
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats bar ───────────────────────────────────────────────────── */}
      <div style={{ backgroundColor: "#2d5a1e" }}>
        <div className="container py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: "16+", label: "Categories" },
            { value: "7", label: "Days/Week" },
            { value: "100%", label: "Fresh Daily" },
            { value: "4.8★", label: "Rated" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="font-heading text-3xl font-bold" style={{ color: "#f5c842" }}>
                {stat.value}
              </div>
              <div className="text-sm font-semibold tracking-wider mt-1" style={{ color: "rgba(247,242,232,0.8)" }}>
                {stat.label.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Categories section ──────────────────────────────────────────── */}
      <section className="py-16" style={{ backgroundColor: "#f7f2e8" }}>
        <div className="container">
          {/* Section header */}
          <div className="text-center mb-12">
            <span
              className="inline-block font-heading text-xs font-bold tracking-[0.2em] px-4 py-1.5 rounded-full mb-4"
              style={{ backgroundColor: "#2d5a1e", color: "#f7f2e8" }}
            >
              EXPLORE OUR MENU
            </span>
            <h2 className="font-display text-4xl md:text-5xl font-bold" style={{ color: "#1c1c1c" }}>
              Our <span className="italic" style={{ color: "#c41e1e" }}>Categories</span>
            </h2>
            <div className="w-16 h-1 mx-auto mt-4 rounded" style={{ backgroundColor: "#2d5a1e" }} />
            <p className="mt-4 text-base max-w-xl mx-auto" style={{ color: "#555" }}>
              From our legendary Specialty Casa Pizza to crispy wings, hearty burgers and
              classic Italian favorites — there's something for everyone.
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => (
              <Link key={cat.id} href={`/menu?category=${cat.id}`}>
                <div
                  className="group relative rounded-xl overflow-hidden border-2 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl cursor-pointer flex flex-col"
                  style={{ borderColor: "#e8e0d0", backgroundColor: "#ffffff" }}
                >
                  {/* Food photo */}
                  <div className="relative h-32 overflow-hidden" style={{ backgroundColor: "#f0ebe0" }}>
                    <img
                      src={cat.img}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* Dark overlay on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300" />
                    {/* Number badge */}
                    <div
                      className="absolute top-2 left-2 w-7 h-7 rounded-full flex items-center justify-center text-xs font-heading font-bold z-10 shadow-md"
                      style={{ backgroundColor: "#2d5a1e", color: "#f7f2e8" }}
                    >
                      {cat.num}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 flex-1">
                    <h3
                      className="font-heading font-bold text-sm tracking-wide leading-tight mb-1 group-hover:text-red-700 transition-colors"
                      style={{ color: "#1c1c1c" }}
                    >
                      {cat.name.toUpperCase()}
                    </h3>
                    <p className="text-xs leading-relaxed" style={{ color: "#777" }}>
                      {cat.desc}
                    </p>
                  </div>

                  {/* Bottom accent bar */}
                  <div
                    className="h-1 w-0 group-hover:w-full transition-all duration-300"
                    style={{ backgroundColor: "#c41e1e" }}
                  />
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href="/menu">
              <button
                className="font-heading font-bold tracking-wider px-10 py-3 rounded text-white text-sm transition-all active:scale-95 inline-flex items-center gap-2"
                style={{ backgroundColor: "#c41e1e" }}
              >
                VIEW FULL MENU &amp; PRICES
                <ChevronRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Lunch specials callout ───────────────────────────────────────── */}
      <section
        className="py-14"
        style={{ backgroundColor: "#1a3d0f" }}
      >
        <div className="container flex flex-col md:flex-row items-center justify-between gap-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Flame className="w-5 h-5" style={{ color: "#f5c842" }} />
              <span className="font-heading text-xs font-bold tracking-[0.2em]" style={{ color: "#f5c842" }}>
                DAILY DEALS
              </span>
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold" style={{ color: "#f7f2e8" }}>
              Lunch Specials
            </h2>
            <p className="mt-2 text-base" style={{ color: "rgba(247,242,232,0.75)" }}>
              Available Monday – Sunday, 10AM–3PM. Great meals at great prices.
            </p>
          </div>
          <Link href="/menu?category=lunch-specials">
            <button
              className="font-heading font-bold tracking-wider px-8 py-3 rounded text-sm transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap"
              style={{ backgroundColor: "#f5c842", color: "#1a3d0f" }}
            >
              SEE LUNCH DEALS
              <ChevronRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </section>

      {/* ── Hours & Location ────────────────────────────────────────────── */}
      <section id="contact" className="py-16" style={{ backgroundColor: "#f7f2e8" }}>
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-display text-4xl font-bold" style={{ color: "#1c1c1c" }}>
              Hours &amp; <span className="italic" style={{ color: "#2d5a1e" }}>Location</span>
            </h2>
            <div className="w-16 h-1 mx-auto mt-4 rounded" style={{ backgroundColor: "#c41e1e" }} />
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Hours */}
            <div
              className="rounded-2xl p-6 shadow-sm border"
              style={{ backgroundColor: "#ffffff", borderColor: "#e8e0d0" }}
            >
              <div className="flex items-center gap-2 mb-5">
                <Clock className="w-5 h-5" style={{ color: "#2d5a1e" }} />
                <h3 className="font-heading font-bold text-lg tracking-wide" style={{ color: "#1c1c1c" }}>
                  HOURS
                </h3>
              </div>
              <div className="space-y-2">
                {HOURS.map(({ day, hours }) => (
                  <div
                    key={day}
                    className={`flex justify-between items-center py-2 px-3 rounded-lg text-sm ${day === TODAY_NAME ? "font-bold" : ""}`}
                    style={{
                      backgroundColor: day === TODAY_NAME ? "rgba(45,90,30,0.08)" : "transparent",
                      borderLeft: day === TODAY_NAME ? "3px solid #2d5a1e" : "3px solid transparent",
                    }}
                  >
                    <span style={{ color: day === TODAY_NAME ? "#2d5a1e" : "#555" }}>{day}</span>
                    <span style={{ color: day === TODAY_NAME ? "#2d5a1e" : "#333" }}>{hours}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Location */}
            <div className="flex flex-col gap-4">
              <div
                className="rounded-2xl p-6 shadow-sm border"
                style={{ backgroundColor: "#ffffff", borderColor: "#e8e0d0" }}
              >
                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5" style={{ color: "#c41e1e" }} />
                  <h3 className="font-heading font-bold text-lg tracking-wide" style={{ color: "#1c1c1c" }}>
                    LOCATION
                  </h3>
                </div>
                <p className="font-semibold text-base" style={{ color: "#1c1c1c" }}>
                  Casa de Pizza &amp; Wings
                </p>
                <p className="text-sm mt-1" style={{ color: "#555" }}>
                  765 N Nellis Blvd, Suite 10<br />
                  Las Vegas, NV 89110
                </p>

                <div className="mt-4 space-y-2">
                  <a
                    href="https://www.google.com/maps/dir/?api=1&destination=765+N+Nellis+Blvd+Suite+10+Las+Vegas+NV+89110"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm font-semibold hover:underline"
                    style={{ color: "#2d5a1e" }}
                  >
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    Get Directions on Google Maps
                  </a>
                  <a
                    href="tel:+17022005252"
                    className="flex items-center gap-2 text-sm font-semibold hover:underline"
                    style={{ color: "#c41e1e" }}
                  >
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    (702) 200-5252
                  </a>
                </div>

                {/* Map — Manus proxy, no external API key needed */}
                <div className="mt-4 w-full rounded-xl overflow-hidden border" style={{ borderColor: "#e8e0d0" }}>
                  <MapView
                    className="w-full h-56"
                    initialCenter={{ lat: 36.1765, lng: -115.0726 }}
                    initialZoom={16}
                    onMapReady={(map) => {
                      new window.google.maps.marker.AdvancedMarkerElement({
                        map,
                        position: { lat: 36.1765, lng: -115.0726 },
                        title: "Casa de Pizza & Wings",
                      });
                    }}
                  />
                </div>
              </div>

              {/* CTA */}
              <div
                className="rounded-2xl p-6 border"
                style={{ backgroundColor: "#2d5a1e", borderColor: "#2d5a1e" }}
              >
                <h3 className="font-display font-bold text-xl" style={{ color: "#f7f2e8" }}>
                  Ready to order?
                </h3>
                <p className="text-sm mt-1 mb-4" style={{ color: "rgba(247,242,232,0.75)" }}>
                  Browse our full menu and place your order online in minutes.
                </p>
                <Link href="/menu">
                  <button
                    className="w-full font-heading font-bold tracking-wider py-3 rounded text-sm transition-all active:scale-95 flex items-center justify-center gap-2"
                    style={{ backgroundColor: "#c41e1e", color: "#f7f2e8" }}
                  >
                    VIEW FULL MENU
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Most Popular ─────────────────────────────────────────────── */}
      <section className="py-16" style={{ backgroundColor: "#f7f2e8" }}>
        <div className="container">
          <div className="text-center mb-12">
            <span
              className="inline-block font-heading text-xs font-bold tracking-[0.2em] px-4 py-1.5 rounded-full mb-4"
              style={{ backgroundColor: "#2d5a1e", color: "#f7f2e8" }}
            >
              CUSTOMER FAVORITES
            </span>
            <h2 className="font-display text-4xl md:text-5xl font-bold" style={{ color: "#1c1c1c" }}>
              Most <span className="italic" style={{ color: "#c41e1e" }}>Popular</span>
            </h2>
            <div className="w-16 h-1 mx-auto mt-4 rounded" style={{ backgroundColor: "#2d5a1e" }} />
            <p className="mt-4 text-base max-w-xl mx-auto" style={{ color: "#555" }}>
              Our guests keep coming back for these. Order online and have them ready for pickup.
            </p>
          </div>

          {popularLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden shadow-sm border animate-pulse" style={{ backgroundColor: "#fff", borderColor: "#e8e0d0" }}>
                  <div className="h-48 bg-gray-200" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : popularError || popularItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-base mb-6" style={{ color: "#777" }}>
                {popularError ? "Could not load popular items at this time." : "Check out our full menu for all available dishes."}
              </p>
              <Link href="/menu">
                <button
                  className="font-heading font-bold tracking-wider px-10 py-3 rounded text-white text-sm transition-all active:scale-95 inline-flex items-center gap-2"
                  style={{ backgroundColor: "#2d5a1e" }}
                >
                  VIEW FULL MENU
                  <ChevronRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {popularItems.map((item) => (
                <div
                  key={item.cloverId}
                  className="group rounded-2xl overflow-hidden shadow-sm border flex flex-col transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                  style={{ backgroundColor: "#fff", borderColor: "#e8e0d0" }}
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden bg-gray-100">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: "#f0ebe0" }}>
                        <span className="text-5xl">🍕</span>
                      </div>
                    )}
                    {/* Price badge */}
                    <div
                      className="absolute top-3 right-3 font-heading font-bold text-sm px-3 py-1 rounded-full shadow"
                      style={{ backgroundColor: "#c41e1e", color: "#fff" }}
                    >
                      {formatCents(item.price)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4 flex-1 flex flex-col">
                    <h3
                      className="font-heading font-bold text-base tracking-wide leading-tight mb-1"
                      style={{ color: "#1c1c1c" }}
                    >
                      {item.name}
                    </h3>
                    {item.description && (
                      <p className="text-xs leading-relaxed flex-1 mb-3" style={{ color: "#777" }}>
                        {item.description.length > 80 ? item.description.slice(0, 80) + "…" : item.description}
                      </p>
                    )}
                    <Link href={`/menu`}>
                      <button
                        className="w-full font-heading font-bold tracking-wider py-2 rounded text-sm transition-all active:scale-95 flex items-center justify-center gap-2 mt-auto"
                        style={{ backgroundColor: "#2d5a1e", color: "#f7f2e8" }}
                      >
                        <ShoppingBag className="w-4 h-4" />
                        ORDER NOW
                      </button>
                    </Link>
                  </div>

                  {/* Bottom accent */}
                  <div
                    className="h-1 w-0 group-hover:w-full transition-all duration-300"
                    style={{ backgroundColor: "#c41e1e" }}
                  />
                </div>
              ))}
            </div>
          )}

          <div className="text-center mt-10">
            <Link href="/menu">
              <button
                className="font-heading font-bold tracking-wider px-10 py-3 rounded text-white text-sm transition-all active:scale-95 inline-flex items-center gap-2"
                style={{ backgroundColor: "#c41e1e" }}
              >
                SEE FULL MENU
                <ChevronRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────── */}
      <section className="py-16" style={{ backgroundColor: "#1c1c1c" }}>
        <div className="container">
          {/* Header */}
          <div className="text-center mb-12">
            <span
              className="inline-block font-heading text-xs font-bold tracking-[0.2em] px-4 py-1.5 rounded-full mb-4"
              style={{ backgroundColor: "#c41e1e", color: "#f7f2e8" }}
            >
              WHAT OUR CUSTOMERS SAY
            </span>
            <h2 className="font-display text-4xl md:text-5xl font-bold" style={{ color: "#f7f2e8" }}>
              Real <span className="italic" style={{ color: "#f5c842" }}>Reviews</span>
            </h2>
            <div className="w-16 h-1 mx-auto mt-4 rounded" style={{ backgroundColor: "#c41e1e" }} />
            <div className="flex items-center justify-center gap-2 mt-5">
              {[1,2,3,4,5].map(i => (
                <svg key={i} className="w-6 h-6" fill="#f5c842" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="font-heading font-bold text-lg ml-1" style={{ color: "#f5c842" }}>4.8</span>
              <span className="text-sm" style={{ color: "rgba(247,242,232,0.5)" }}>· 200+ reviews</span>
            </div>
          </div>

          {/* Cards grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                name: "Maria G.",
                date: "May 2025",
                stars: 5,
                text: "Best pizza in Las Vegas! The specialty pizza is absolutely incredible — crispy crust, generous toppings, and the sauce is out of this world. We order from here every Friday night.",
                initials: "MG",
                color: "#c41e1e",
              },
              {
                name: "James T.",
                date: "April 2025",
                stars: 5,
                text: "The wings are phenomenal. Buffalo sauce is perfectly spicy and the chicken is always juicy. Combo specials are a great deal — got pizza + wings + drinks for a very fair price.",
                initials: "JT",
                color: "#2d5a1e",
              },
              {
                name: "Sofia R.",
                date: "March 2025",
                stars: 5,
                text: "Tried the gyro and the Angus burger on the same visit — both were amazing! The staff is super friendly and the food came out fast. Definitely my go-to spot in the neighborhood.",
                initials: "SR",
                color: "#c41e1e",
              },
              {
                name: "Carlos M.",
                date: "February 2025",
                stars: 5,
                text: "The Italian dinners remind me of my grandmother's cooking. Lasagna is rich and hearty. Love that they're open every day — great for family dinners after a long week.",
                initials: "CM",
                color: "#2d5a1e",
              },
              {
                name: "Ashley K.",
                date: "January 2025",
                stars: 5,
                text: "Lunch specials are unbeatable. I come here almost every week for the deal. The stromboli is my personal favorite — perfectly golden and stuffed with flavor. Highly recommend!",
                initials: "AK",
                color: "#c41e1e",
              },
              {
                name: "David L.",
                date: "December 2024",
                stars: 5,
                text: "Ordered online and the experience was seamless. Food arrived hot and exactly as described. The ribs were fall-off-the-bone tender. This place never disappoints. 5 stars every time!",
                initials: "DL",
                color: "#2d5a1e",
              },
            ].map((review) => (
              <div
                key={review.name}
                className="rounded-2xl p-6 flex flex-col gap-4 border transition-transform duration-200 hover:-translate-y-1"
                style={{ backgroundColor: "#2a2a2a", borderColor: "#3a3a3a" }}
              >
                {/* Stars */}
                <div className="flex gap-1">
                  {Array.from({ length: review.stars }).map((_, i) => (
                    <svg key={i} className="w-4 h-4" fill="#f5c842" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                {/* Quote */}
                <p className="text-sm leading-relaxed flex-1" style={{ color: "rgba(247,242,232,0.8)" }}>
                  &ldquo;{review.text}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: "#3a3a3a" }}>
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-heading font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: review.color }}
                  >
                    {review.initials}
                  </div>
                  <div>
                    <div className="font-heading font-bold text-sm" style={{ color: "#f7f2e8" }}>
                      {review.name}
                    </div>
                    <div className="text-xs" style={{ color: "rgba(247,242,232,0.4)" }}>
                      {review.date}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Google Reviews CTA */}
          <div className="text-center mt-10">
            <a
              href="https://www.google.com/maps/place/?q=place_id:ChIJU4k4Jp0d3IAR-9J2f8xU7pM"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-heading font-bold tracking-wider px-8 py-3 rounded text-sm transition-all active:scale-95"
              style={{ border: "2px solid #f5c842", color: "#f5c842", backgroundColor: "transparent" }}
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              READ MORE REVIEWS ON GOOGLE
            </a>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer style={{ backgroundColor: "#1a3d0f", color: "rgba(247,242,232,0.7)" }}>
        <div className="container py-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-3">
            <img src={LOGO_URL} alt="Casa de Pizza & Wings" className="h-10 w-10 object-contain rounded-full" />
            <div>
              <div className="font-display italic font-bold" style={{ color: "#f7f2e8" }}>Casa de Pizza &amp; Wings</div>
              <div style={{ color: "rgba(247,242,232,0.6)" }}>765 N Nellis Blvd · Las Vegas, NV</div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1 text-center">
            <a href="tel:+17022005252" className="hover:underline font-semibold" style={{ color: "#f5c842" }}>
              (702) 200-5252
            </a>
            <span>Open Daily 10AM – 10PM</span>
          </div>
          <div className="text-xs" style={{ color: "rgba(247,242,232,0.4)" }}>
            © {new Date().getFullYear()} Casa de Pizza &amp; Wings. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
