import { useState, useRef, useMemo, useEffect, useCallback } from "react";
import { ShoppingCart, Search, Package, X, ChevronLeft, Phone, MapPin, ZoomIn } from "lucide-react";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/contexts/CartContext";
import ModifierWizard from "@/components/ModifierWizard";
import MenuLightbox, { LightboxItem } from "@/components/MenuLightbox";
import { Link, useSearch } from "wouter";

const LOGO_URL = "/manus-storage/casa_pizza_logo_a63e4fc6.jpg";

function formatCents(cents: number | null | undefined): string {
  if (cents == null) return "";
  return `$${(cents / 100).toFixed(2)}`;
}

const CATEGORY_ORDER = [
  "appetizer", "soup", "salad", "specialty pizza", "wing", "finger",
  "stromboli", "calzone", "italian dinner", "rib", "gyro", "angus",
  "burger", "hot sandwich", "cold sandwich", "dessert", "drink", "beverage",
  "fountain", "lunch special", "combo",
];

// Categories to hide from the public menu (internal Clover categories)
const HIDDEN_CATEGORY_PATTERNS = [
  /^#\d+/,              // Individual pizza variants: #1 - Cheese Pizza, etc.
  /^delivery$/i,        // Internal delivery category
  /^employee meal$/i,   // Staff meal category
  /^sauces? dipping/i,  // Internal sauce category
  /^all day special$/i, // Internal special category
  /^expo$/i,            // Expo station internal tag
  /^front desk$/i,      // Front desk internal category
  /^pizzeria$/i,        // Internal station label
];

function isCategoryVisible(name: string): boolean {
  return !HIDDEN_CATEGORY_PATTERNS.some((pattern) => pattern.test(name.trim()));
}

function catSortKey(name: string): number {
  const lower = name.toLowerCase();
  for (let i = 0; i < CATEGORY_ORDER.length; i++) {
    if (lower.includes(CATEGORY_ORDER[i])) return i;
  }
  return 99;
}

// Map landing page slug → keyword to match against category names
const SLUG_TO_KEYWORD: Record<string, string> = {
  "appetizers": "appetizer",
  "soups": "soup",
  "house-salads": "salad",
  "specialty-pizzas": "pizza",
  "wings-fingers": "wing",
  "stromboli-calzone": "stromboli",
  "italian-dinners": "italian",
  "ribs": "rib",
  "gyro": "gyro",
  "angus-burgers": "angus",
  "hot-sandwiches": "hot sandwich",
  "cold-sandwiches": "cold sandwich",
  "desserts": "dessert",
  "drinks": "drink",
  "lunch-specials": "lunch",
  "combo-specials": "combo",
};

type Modifier = { cloverId: string; name: string; price: number | null; available: boolean | null };
type ModifierGroup = { cloverId: string; name: string; minRequired: number | null; maxAllowed: number | null; modifiers: Modifier[] };
type MenuItem = {
  cloverId: string; name: string; price: number | null; description: string | null;
  imageUrl: string | null; customImageUrl: string | null; available: boolean | null;
  hidden: boolean | null; categoryIds: string[];
  tags: { cloverId: string; name: string }[];
  modifierGroups: ModifierGroup[];
};

export default function MenuPage() {
  const searchParams = useSearch();
  const [search, setSearch] = useState("");
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [wizardItem, setWizardItem] = useState<MenuItem | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [lightboxState, setLightboxState] = useState<{ items: LightboxItem[]; index: number } | null>(null);

  const { data: categories = [], isLoading: catsLoading } = trpc.catalog.getCategories.useQuery();
  const { data: items = [], isLoading: itemsLoading, error: itemsError } = trpc.catalog.getItems.useQuery({
    search: search || undefined,
  });
  const { totalItems, openCart } = useCart();

  const visibleItems = useMemo(() => items.filter((i) => !i.hidden && i.available !== false), [items]);

  const sortedCategories = useMemo(
    () => [...categories]
      .filter((c) => isCategoryVisible(c.name))
      .sort((a, b) => catSortKey(a.name) - catSortKey(b.name)),
    [categories]
  );

  const grouped = useMemo(() => {
    const catMap = new Map<string, MenuItem[]>();
    const uncategorized: MenuItem[] = [];
    for (const item of visibleItems) {
      if (item.categoryIds.length === 0) { uncategorized.push(item); }
      else { for (const cid of item.categoryIds) { if (!catMap.has(cid)) catMap.set(cid, []); catMap.get(cid)!.push(item); } }
    }
    const result: { catId: string; catName: string; items: MenuItem[] }[] = [];
    for (const cat of sortedCategories) {
      const its = catMap.get(cat.cloverId);
      if (its && its.length > 0) result.push({ catId: cat.cloverId, catName: cat.name, items: its });
    }
    if (uncategorized.length > 0) result.push({ catId: "__uncategorized", catName: "Other", items: uncategorized });
    return result;
  }, [visibleItems, sortedCategories]);

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const isLoading = catsLoading || itemsLoading;

  // Scroll to a category section by its Clover ID
  const scrollToCategory = useCallback((catId: string) => {
    const el = sectionRefs.current[catId];
    if (el) {
      const offset = 96; // account for sticky header
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
      setActiveCatId(catId);
    }
  }, []);

  // Handle ?category=slug from landing page links
  useEffect(() => {
    if (isLoading || sortedCategories.length === 0) return;
    const params = new URLSearchParams(searchParams);
    const slug = params.get("category");
    if (!slug) return;
    const keyword = SLUG_TO_KEYWORD[slug] ?? slug.replace(/-/g, " ");
    const match = sortedCategories.find((c) => c.name.toLowerCase().includes(keyword));
    if (match) {
      // Small delay to allow sections to render
      setTimeout(() => scrollToCategory(match.cloverId), 300);
    }
  }, [isLoading, sortedCategories, searchParams, scrollToCategory]);

  // Track active category on scroll
  useEffect(() => {
    const handleScroll = () => {
      const offset = 120;
      let current: string | null = null;
      for (const { catId } of grouped) {
        const el = sectionRefs.current[catId];
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= offset) current = catId;
        }
      }
      setActiveCatId(current);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [grouped]);

  const SidebarContent = () => (
    <>
      <div className="px-4 py-3 text-xs font-bold tracking-[0.15em]"
        style={{ color: "#f5c842", fontFamily: "'Oswald', sans-serif", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        CATEGORIES
      </div>
      <div className="p-2">
        <button
          className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold mb-0.5"
          style={{ backgroundColor: !activeCatId ? "rgba(245,200,66,0.15)" : "transparent", color: !activeCatId ? "#f5c842" : "rgba(247,242,232,0.75)" }}
          onClick={() => { window.scrollTo({ top: 0, behavior: "smooth" }); setActiveCatId(null); setMobileSidebarOpen(false); }}>
          All Items
        </button>
        {sortedCategories.map((cat) => {
          const isActive = activeCatId === cat.cloverId;
          return (
            <button
              key={cat.cloverId}
              className="w-full text-left px-3 py-2 rounded-lg text-sm mb-0.5 transition-colors"
              style={{
                backgroundColor: isActive ? "rgba(245,200,66,0.15)" : "transparent",
                color: isActive ? "#f5c842" : "rgba(247,242,232,0.75)",
                fontWeight: isActive ? 700 : 400,
              }}
              onClick={() => { scrollToCategory(cat.cloverId); setMobileSidebarOpen(false); }}>
              {cat.name}
            </button>
          );
        })}
      </div>
    </>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f7f2e8" }}>
      {/* Top bar */}
      <div className="w-full text-center text-xs py-2 px-4 flex items-center justify-center gap-6"
        style={{ backgroundColor: "#1a3d0f", color: "#f7f2e8", fontFamily: "'Oswald', sans-serif", letterSpacing: "0.1em" }}>
        <span>🍕 OPEN MON – SUN 10AM–10PM</span>
        <a href="tel:+17022005252" className="font-bold hover:underline" style={{ color: "#f5c842" }}>CALL: (702) 200-5252</a>
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 md:px-6 py-3 shadow-md"
        style={{ backgroundColor: "#ffffff", borderBottom: "3px solid #2d5a1e" }}>
        <Link href="/" className="flex items-center gap-2">
          <img src={LOGO_URL} alt="Casa de Pizza & Wings" className="h-10 w-10 object-contain rounded-full" />
          <div className="hidden sm:block">
            <div className="font-display italic font-bold text-base leading-tight" style={{ color: "#c41e1e" }}>Casa de</div>
            <div className="font-bold text-xs tracking-widest leading-tight" style={{ color: "#2d5a1e", fontFamily: "'Oswald', sans-serif" }}>PIZZA & WINGS</div>
          </div>
        </Link>
        <div className="relative flex-1 max-w-xs mx-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#999" }} />
          <Input
            placeholder="Search menu…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm border-2"
            style={{ borderColor: "#d0c8b8", backgroundColor: "#faf7f0" }}
          />
          {search && (
            <button className="absolute right-2 top-1/2 -translate-y-1/2" onClick={() => setSearch("")} style={{ color: "#999" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="lg:hidden px-3 py-1.5 rounded text-xs font-bold tracking-wider"
            style={{ backgroundColor: "#2d5a1e", color: "#f7f2e8", fontFamily: "'Oswald', sans-serif" }}
            onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}>
            CATEGORIES
          </button>
          <button onClick={openCart} className="relative p-2 rounded-full hover:bg-gray-100" aria-label="Cart">
            <ShoppingCart className="w-5 h-5" style={{ color: "#2d5a1e" }} />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
                style={{ backgroundColor: "#c41e1e" }}>{totalItems}</span>
            )}
          </button>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex" onClick={() => setMobileSidebarOpen(false)}>
          <div className="w-72 h-full overflow-y-auto shadow-xl" style={{ backgroundColor: "#1a3d0f" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="font-bold tracking-widest text-sm" style={{ color: "#f5c842", fontFamily: "'Oswald', sans-serif" }}>CATEGORIES</span>
              <button onClick={() => setMobileSidebarOpen(false)} style={{ color: "#f7f2e8" }}><X className="w-5 h-5" /></button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Hero */}
      <div className="py-8 px-6" style={{ background: "linear-gradient(135deg, #1a3d0f 0%, #2d5a1e 60%, #3a7a28 100%)" }}>
        <div className="container">
          <Link href="/" className="flex items-center gap-1 text-xs mb-2 hover:underline" style={{ color: "rgba(247,242,232,0.6)" }}>
            <ChevronLeft className="w-3 h-3" />Home
          </Link>
          <h1 className="font-display font-bold text-3xl md:text-4xl" style={{ color: "#f7f2e8" }}>
            Our <span className="italic" style={{ color: "#f5c842" }}>Menu</span>
          </h1>
          <p className="text-sm mt-1" style={{ color: "rgba(247,242,232,0.75)" }}>Fresh ingredients, made to order. Customize your meal exactly how you like it.</p>
        </div>
      </div>

      {/* Main layout */}
      <div className="container py-6 flex gap-6">
        {/* Desktop sidebar */}
        <aside className="w-52 shrink-0 hidden lg:block self-start sticky top-24">
          <div className="rounded-2xl overflow-hidden shadow-sm" style={{ backgroundColor: "#1a3d0f" }}>
            <SidebarContent />
          </div>
          <div className="mt-4 rounded-2xl p-4 text-xs" style={{ backgroundColor: "#ffffff", border: "2px solid #e8e0d0" }}>
            <div className="font-bold mb-2" style={{ color: "#1c1c1c", fontFamily: "'Oswald', sans-serif" }}>CALL TO ORDER</div>
            <a href="tel:+17022005252" className="flex items-center gap-2 font-bold hover:underline" style={{ color: "#c41e1e" }}>
              <Phone className="w-3.5 h-3.5 flex-shrink-0" />(702) 200-5252
            </a>
            <div className="flex items-center gap-2 mt-2" style={{ color: "#555" }}>
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />765 N Nellis Blvd
            </div>
          </div>
        </aside>

        {/* Items area */}
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ backgroundColor: "#e8e0d0", height: 260 }} />
              ))}
            </div>
          ) : itemsError ? (
            <div className="text-center py-20" style={{ color: "#c41e1e" }}>
              <p className="font-semibold">Failed to load menu. Please try again.</p>
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="text-center py-20" style={{ color: "#888" }}>
              <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-semibold">No items found</p>
              <p className="text-sm mt-1">Try a different search or category.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {grouped.map(({ catId, catName, items: groupItems }) => (
                <section
                  key={catId}
                  id={`cat-${catId}`}
                  ref={(el) => { sectionRefs.current[catId] = el; }}>
                  <div className="flex items-center gap-3 mb-5 pb-3" style={{ borderBottom: "2px solid #2d5a1e" }}>
                    <h2 className="font-bold text-xl tracking-wide" style={{ color: "#2d5a1e", fontFamily: "'Oswald', sans-serif" }}>
                      {catName.toUpperCase()}
                    </h2>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: "rgba(45,90,30,0.1)", color: "#2d5a1e" }}>
                      {groupItems.length} items
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {groupItems.map((item, itemIdx) => {
                      const sectionLightboxItems: LightboxItem[] = groupItems.map((gi) => ({
                        cloverId: gi.cloverId,
                        name: gi.name,
                        imageUrl: gi.imageUrl,
                        customImageUrl: gi.customImageUrl,
                        price: gi.price ?? 0,
                        description: gi.description,
                        modifierGroups: gi.modifierGroups.map((mg) => ({
                          id: mg.cloverId,
                          name: mg.name,
                          required: (mg.minRequired ?? 0) > 0,
                        })),
                      }));
                      return (
                        <MenuItemCard
                          key={item.cloverId}
                          item={item}
                          onCustomize={() => setWizardItem(item)}
                          onOpenLightbox={() => setLightboxState({ items: sectionLightboxItems, index: itemIdx })}
                        />
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      {wizardItem && <ModifierWizard item={wizardItem} onClose={() => setWizardItem(null)} />}
      {lightboxState && (
        <MenuLightbox
          items={lightboxState.items}
          currentIndex={lightboxState.index}
          onClose={() => setLightboxState(null)}
          onNavigate={(i) => setLightboxState((s) => (s ? { ...s, index: i } : null))}
        />
      )}
    </div>
  );
}

function MenuItemCard({ item, onCustomize, onOpenLightbox }: { item: MenuItem; onCustomize: () => void; onOpenLightbox: () => void }) {
  const { addItem, openCart } = useCart();
  const hasModifiers = item.modifierGroups.length > 0;
  const imgSrc = item.customImageUrl ?? item.imageUrl;

  const handleAddDirect = () => {
    addItem({ itemCloverId: item.cloverId, itemName: item.name, unitPriceCents: item.price ?? 0, quantity: 1, modifiers: [] });
    openCart();
  };

  return (
    <div className="group rounded-2xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
      style={{ backgroundColor: "#ffffff", border: "1.5px solid #e8e0d0" }}>
      <div
        className="relative h-40 overflow-hidden cursor-pointer"
        style={{ backgroundColor: "#f0ebe0" }}
        onClick={onOpenLightbox}
        role="button"
        aria-label={`View photo of ${item.name}`}
      >
        {imgSrc ? (
          <img src={imgSrc} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10" style={{ color: "#d0c8b8" }} />
          </div>
        )}
        {/* Magnifying glass overlay on hover */}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ backgroundColor: "rgba(0,0,0,0.28)" }}
        >
          <div
            className="flex items-center justify-center w-10 h-10 rounded-full"
            style={{ backgroundColor: "rgba(255,255,255,0.18)", backdropFilter: "blur(2px)" }}
          >
            <ZoomIn className="w-5 h-5" style={{ color: "#fff" }} />
          </div>
        </div>
        {item.tags.length > 0 && (
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
            {item.tags.slice(0, 2).map((tag) => (
              <span key={tag.cloverId} className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ backgroundColor: "rgba(45,90,30,0.85)", color: "#f7f2e8" }}>{tag.name}</span>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col flex-1 p-4 gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-sm leading-snug" style={{ color: "#1c1c1c" }}>{item.name}</h3>
          {item.description && (
            <p className="text-xs mt-1 line-clamp-2 leading-relaxed" style={{ color: "#777" }}>{item.description}</p>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-base" style={{ color: "#2d5a1e" }}>
            {item.price ? formatCents(item.price) : "Market price"}
          </span>
          {hasModifiers ? (
            <button
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-all active:scale-95"
              style={{ backgroundColor: "#2d5a1e" }}
              onClick={onCustomize}>
              CUSTOMIZE
            </button>
          ) : (
            <button
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-all active:scale-95"
              style={{ backgroundColor: "#c41e1e" }}
              onClick={handleAddDirect}>
              ADD
            </button>
          )}
        </div>
        {hasModifiers && (
          <p className="text-[10px]" style={{ color: "#aaa" }}>
            {item.modifierGroups.length} customization option{item.modifierGroups.length !== 1 ? "s" : ""} available
          </p>
        )}
      </div>
    </div>
  );
}
