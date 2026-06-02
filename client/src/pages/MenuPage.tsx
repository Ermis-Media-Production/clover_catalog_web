import { useState, useMemo, useRef, useEffect, useCallback } from "react";
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
  "appetizer", "soup", "salad",
  // Individual specialty pizza categories (#1-#16)
  "#1", "#2", "# 3", "# 4", "# 5", "# 6", "# 7", "# 8", "#9", "#10", "#11", "# 12", "#13", "# 14", "#15", "# 16",
  "wing", "finger", "chicken wing", "chicken finger",
  "stromboli", "calzone", "italian dinner", "rib", "gyro", "angus",
  "burger", "hot sandwich", "cold sandwich", "dessert", "drink", "beverage",
  "fountain", "lunch special", "combo",
];

// Categories to hide from the public menu (internal Clover categories)
const HIDDEN_CATEGORY_PATTERNS = [
  /^delivery$/i,
  /^employee meal$/i,
  /^sauces? dipping/i,
  /^all day special$/i,
  /^expo$/i,
  /^front desk$/i,
  /^pizzeria$/i,
  /^specialty pizza$/i, // Empty parent category
  /^wings & finger$/i,  // Duplicate
];

function isCategoryVisible(name: string): boolean {
  return !HIDDEN_CATEGORY_PATTERNS.some((pattern) => pattern.test(name.trim()));
}

// Display name override for individual pizza categories
function catDisplayName(name: string): string {
  const m = name.match(/^#\s*\d+\s*[-–]?\s*(.+)$/i);
  if (m) return m[1].trim();
  return name;
}

// Tab label: pizza categories get a short label
function catTabLabel(name: string): string {
  // "#1 - Cheese Pizza" → "Cheese"
  const m = name.match(/^#\s*\d+\s*[-–]?\s*(.+)$/i);
  if (m) {
    const full = m[1].trim();
    // Shorten long names
    const words = full.replace(/ Pizza$/i, "").replace(/ Chicken$/i, "").trim();
    return words.length > 14 ? words.slice(0, 13) + "…" : words;
  }
  // Shorten other long category names
  const short: Record<string, string> = {
    "appetizers & specialties": "Appetizers",
    "100 % angus beef burguers": "Burgers",
    "stromboli & calzone": "Stromboli",
    "italian dinners": "Italian",
    "house salads": "Salads",
    "chicken wings": "Wings",
    "chicken fingers": "Fingers",
    "hot sandwiches": "Hot Sand.",
    "cold sandwiches": "Cold Sand.",
    "fountain drinks": "Fountain",
    "lunch specials": "Lunch",
    "combo specials": "Combos",
  };
  return short[name.toLowerCase()] ?? name;
}

function catSortKey(name: string): number {
  const lower = name.toLowerCase();
  for (let i = 0; i < CATEGORY_ORDER.length; i++) {
    if (lower.startsWith(CATEGORY_ORDER[i].toLowerCase()) || lower.includes(CATEGORY_ORDER[i].toLowerCase())) return i;
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

// Virtual tab for grouping all pizza categories
const PIZZA_GROUP_ID = "__pizza_group";

export default function MenuPage() {
  const searchParams = useSearch();
  const [search, setSearch] = useState("");
  const [activeCatId, setActiveCatId] = useState<string | null>(null);
  const [expandedPizzas, setExpandedPizzas] = useState(false);
  const [wizardItem, setWizardItem] = useState<MenuItem | null>(null);
  const [lightboxState, setLightboxState] = useState<{ items: LightboxItem[]; index: number } | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement | null>(null);

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

  // Pizza categories
  const pizzaCats = useMemo(() => sortedCategories.filter((c) => /^#\s*\d+/i.test(c.name)), [sortedCategories]);
  const nonPizzaCats = useMemo(() => sortedCategories.filter((c) => !/^#\s*\d+/i.test(c.name)), [sortedCategories]);
  const activePizzaCat = useMemo(() => pizzaCats.find((c) => c.cloverId === activeCatId), [pizzaCats, activeCatId]);

  // Scroll to a category section by its Clover ID
  // NAV_HEIGHT = top bar (32px) + header (60px) + tabs bar (48px) + 8px gap
  const NAV_OFFSET = 148;
  const scrollToCategory = useCallback((catId: string) => {
    const el = sectionRefs.current[catId];
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
      window.scrollTo({ top, behavior: "smooth" });
      setActiveCatId(catId);
    }
  }, []);

  // Auto-scroll active tab into view in the tabs bar
  useEffect(() => {
    if (activeTabRef.current && tabsRef.current) {
      const tab = activeTabRef.current;
      const bar = tabsRef.current;
      const tabLeft = tab.offsetLeft;
      const tabRight = tabLeft + tab.offsetWidth;
      const barLeft = bar.scrollLeft;
      const barRight = barLeft + bar.offsetWidth;
      if (tabLeft < barLeft + 40) {
        bar.scrollTo({ left: tabLeft - 40, behavior: "smooth" });
      } else if (tabRight > barRight - 40) {
        bar.scrollTo({ left: tabRight - bar.offsetWidth + 40, behavior: "smooth" });
      }
    }
  }, [activeCatId]);

  // Handle ?category=slug from landing page links
  useEffect(() => {
    if (isLoading || sortedCategories.length === 0) return;
    const params = new URLSearchParams(searchParams);
    const slug = params.get("category");
    if (!slug) return;
    const keyword = SLUG_TO_KEYWORD[slug] ?? slug.replace(/-/g, " ");
    const match = sortedCategories.find((c) => c.name.toLowerCase().includes(keyword));
    if (match) {
      setTimeout(() => scrollToCategory(match.cloverId), 300);
    }
  }, [isLoading, sortedCategories, searchParams, scrollToCategory]);

  // Track active category on scroll
  useEffect(() => {
    const handleScroll = () => {
      let current: string | null = null;
      for (const { catId } of grouped) {
        const el = sectionRefs.current[catId];
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= NAV_OFFSET + 20) current = catId;
        }
      }
      setActiveCatId(current);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [grouped]);

  // Build tab list: non-pizza cats + one "Specialty Pizzas" group tab
  const tabs = useMemo(() => {
    const result: { id: string; label: string; isPizzaGroup?: boolean }[] = [];
    let pizzaInserted = false;
    for (const cat of sortedCategories) {
      if (/^#\s*\d+/i.test(cat.name)) {
        if (!pizzaInserted) {
          result.push({ id: PIZZA_GROUP_ID, label: "Specialty Pizzas", isPizzaGroup: true });
          pizzaInserted = true;
        }
      } else {
        result.push({ id: cat.cloverId, label: catTabLabel(cat.name) });
      }
    }
    return result;
  }, [sortedCategories]);

  const isPizzaGroupActive = !!activePizzaCat;

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
        <button onClick={openCart} className="relative p-2 rounded-full hover:bg-gray-100" aria-label="Cart">
          <ShoppingCart className="w-5 h-5" style={{ color: "#2d5a1e" }} />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center text-white"
              style={{ backgroundColor: "#c41e1e" }}>{totalItems}</span>
          )}
        </button>
      </header>

      {/* Sticky horizontal category tabs */}
      <div className="sticky z-30" style={{ top: "63px", backgroundColor: "#1a3d0f", borderBottom: "2px solid #2d5a1e" }}>
        <div
          ref={tabsRef}
          className="flex overflow-x-auto gap-1 px-3 py-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {tabs.map((tab) => {
            const isActive = tab.isPizzaGroup ? isPizzaGroupActive : activeCatId === tab.id;
            return (
              <button
                key={tab.id}
                ref={isActive ? activeTabRef : undefined}
                onClick={() => {
                  if (tab.isPizzaGroup) {
                    setExpandedPizzas((v) => !v);
                    // Scroll to first pizza section
                    if (pizzaCats.length > 0) scrollToCategory(pizzaCats[0].cloverId);
                  } else {
                    scrollToCategory(tab.id);
                  }
                }}
                className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all duration-150 active:scale-95"
                style={{
                  backgroundColor: isActive ? "#f5c842" : "rgba(255,255,255,0.08)",
                  color: isActive ? "#1a3d0f" : "rgba(247,242,232,0.85)",
                  fontFamily: "'Oswald', sans-serif",
                  letterSpacing: "0.05em",
                  border: isActive ? "none" : "1px solid rgba(255,255,255,0.12)",
                  whiteSpace: "nowrap",
                }}
              >
                {tab.label}
                {tab.isPizzaGroup && <span className="ml-1 opacity-70">{expandedPizzas ? "▲" : "▼"}</span>}
              </button>
            );
          })}
        </div>

        {/* Pizza sub-tabs (expanded) */}
        {expandedPizzas && pizzaCats.length > 0 && (
          <div
            className="flex overflow-x-auto gap-1 px-3 pb-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none", borderTop: "1px solid rgba(255,255,255,0.1)" }}
          >
            {pizzaCats.map((cat) => {
              const isActive = activeCatId === cat.cloverId;
              return (
                <button
                  key={cat.cloverId}
                  onClick={() => scrollToCategory(cat.cloverId)}
                  className="shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition-all duration-150 active:scale-95"
                  style={{
                    backgroundColor: isActive ? "#f5c842" : "rgba(255,255,255,0.05)",
                    color: isActive ? "#1a3d0f" : "rgba(247,242,232,0.7)",
                    border: isActive ? "none" : "1px solid rgba(255,255,255,0.1)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {catDisplayName(cat.name)}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Hero */}
      <div className="py-6 px-6" style={{ background: "linear-gradient(135deg, #1a3d0f 0%, #2d5a1e 60%, #3a7a28 100%)" }}>
        <div className="container">
          <Link href="/" className="flex items-center gap-1 text-xs mb-2 hover:underline" style={{ color: "rgba(247,242,232,0.6)" }}>
            <ChevronLeft className="w-3 h-3" />Home
          </Link>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display font-bold text-3xl md:text-4xl" style={{ color: "#f7f2e8" }}>
                Our <span className="italic" style={{ color: "#f5c842" }}>Menu</span>
              </h1>
              <p className="text-sm mt-1" style={{ color: "rgba(247,242,232,0.75)" }}>Fresh ingredients, made to order.</p>
            </div>
            <div className="flex items-center gap-4 text-xs" style={{ color: "rgba(247,242,232,0.7)" }}>
              <a href="tel:+17022005252" className="flex items-center gap-1.5 hover:underline" style={{ color: "#f5c842" }}>
                <Phone className="w-3.5 h-3.5" />(702) 200-5252
              </a>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />765 N Nellis Blvd
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Items area */}
      <div className="container py-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
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
                    {catDisplayName(catName).toUpperCase()}
                  </h2>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "rgba(45,90,30,0.1)", color: "#2d5a1e" }}>
                    {groupItems.length} items
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
