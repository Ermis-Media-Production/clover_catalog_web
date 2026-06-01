import { useState, useRef, useEffect, useMemo } from "react";
import { ShoppingCart, Search, ChevronRight, Package, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/contexts/CartContext";
import ModifierWizard from "@/components/ModifierWizard";
import { Link } from "wouter";

function formatCents(cents: number | null | undefined): string {
  if (cents == null) return "";
  return `$${(cents / 100).toFixed(2)}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Modifier = {
  cloverId: string;
  name: string;
  price: number | null;
  available: boolean | null;
};

type ModifierGroup = {
  cloverId: string;
  name: string;
  minRequired: number | null;
  maxAllowed: number | null;
  modifiers: Modifier[];
};

type MenuItem = {
  cloverId: string;
  name: string;
  price: number | null;
  description: string | null;
  imageUrl: string | null;
  available: boolean | null;
  hidden: boolean | null;
  categoryIds: string[];
  tags: { cloverId: string; name: string }[];
  modifierGroups: ModifierGroup[];
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MenuPage() {
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [wizardItem, setWizardItem] = useState<MenuItem | null>(null);

  const { data: categories = [], isLoading: catsLoading } = trpc.catalog.getCategories.useQuery();
  const {
    data: items = [],
    isLoading: itemsLoading,
    error: itemsError,
  } = trpc.catalog.getItems.useQuery({
    categoryId: selectedCat ?? undefined,
    search: search || undefined,
  });

  const { totalItems, openCart } = useCart();

  // Filter out hidden items for the public menu
  const visibleItems = useMemo(
    () => items.filter((i) => !i.hidden && i.available !== false),
    [items]
  );

  // Group items by category
  const grouped = useMemo(() => {
    if (selectedCat) {
      const cat = categories.find((c) => c.cloverId === selectedCat);
      return [{ catId: selectedCat, catName: cat?.name ?? "Category", items: visibleItems }];
    }
    const catMap = new Map<string, MenuItem[]>();
    const uncategorized: MenuItem[] = [];
    for (const item of visibleItems) {
      if (item.categoryIds.length === 0) {
        uncategorized.push(item);
      } else {
        for (const cid of item.categoryIds) {
          if (!catMap.has(cid)) catMap.set(cid, []);
          catMap.get(cid)!.push(item);
        }
      }
    }
    const result: { catId: string; catName: string; items: MenuItem[] }[] = [];
    for (const cat of categories) {
      const its = catMap.get(cat.cloverId);
      if (its && its.length > 0) result.push({ catId: cat.cloverId, catName: cat.name, items: its });
    }
    if (uncategorized.length > 0)
      result.push({ catId: "__uncategorized", catName: "Other", items: uncategorized });
    return result;
  }, [visibleItems, categories, selectedCat]);

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const scrollToCategory = (catId: string) => {
    setSelectedCat(null); // show all so the section exists
    setTimeout(() => {
      sectionRefs.current[catId]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const isLoading = catsLoading || itemsLoading;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Top Nav ── */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <span className="text-primary-foreground font-bold text-base">🍕</span>
            </div>
            <div>
              <p className="font-display font-bold text-foreground leading-tight text-base">
                Casa de Pizza & Wings
              </p>
              <p className="text-xs text-muted-foreground leading-tight">Online Menu</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative hidden sm:block w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search menu…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
              {search && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearch("")}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              className="relative gap-2"
              onClick={openCart}
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Cart</span>
              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {totalItems}
                </span>
              )}
            </Button>

            <Link href="/">
              <Button variant="ghost" size="sm" className="text-muted-foreground hidden sm:flex">
                Admin
              </Button>
            </Link>
          </div>
        </div>

        {/* Mobile search */}
        <div className="sm:hidden px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search menu…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>
        </div>
      </header>

      {/* ── Hero Banner ── */}
      <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-background border-b border-border">
        <div className="container py-10">
          <h1 className="font-display font-bold text-3xl md:text-4xl text-foreground">
            Our Menu
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Fresh ingredients, made to order. Customize your meal exactly how you like it.
          </p>
        </div>
      </div>

      <div className="container py-6 flex gap-6">
        {/* ── Category Sidebar ── */}
        <aside className="w-48 shrink-0 hidden lg:block self-start sticky top-24">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-1">
            Categories
          </p>
          <nav className="space-y-0.5">
            <button
              onClick={() => setSelectedCat(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between group ${
                selectedCat === null && !search
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              All Items
              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            {categories.map((cat) => (
              <button
                key={cat.cloverId}
                onClick={() => {
                  setSearch("");
                  scrollToCategory(cat.cloverId);
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center justify-between group ${
                  selectedCat === cat.cloverId
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <span className="truncate">{cat.name}</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
              </button>
            ))}
          </nav>
        </aside>

        {/* ── Main Content ── */}
        <div className="flex-1 min-w-0">
          {/* Mobile category scroll */}
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
            <button
              onClick={() => { setSelectedCat(null); setSearch(""); }}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                selectedCat === null ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border hover:text-foreground"
              }`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat.cloverId}
                onClick={() => { setSearch(""); scrollToCategory(cat.cloverId); }}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selectedCat === cat.cloverId ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground border border-border hover:text-foreground"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Content */}
          {itemsError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <AlertCircle className="w-8 h-8 text-destructive opacity-70" />
              <p className="text-sm text-destructive">Failed to load menu. Please try again.</p>
            </div>
          ) : isLoading ? (
            <div className="space-y-8">
              {[...Array(3)].map((_, i) => (
                <div key={i}>
                  <div className="h-6 w-40 rounded bg-card animate-pulse mb-4" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {[...Array(3)].map((_, j) => (
                      <div key={j} className="h-52 rounded-2xl bg-card animate-pulse" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
              <Package className="w-12 h-12 opacity-20" />
              <p className="text-lg font-medium">No items found</p>
              <p className="text-sm">Try a different search or category.</p>
            </div>
          ) : (
            <div className="space-y-10">
              {grouped.map(({ catId, catName, items: groupItems }) => (
                <section
                  key={catId}
                  ref={(el) => { sectionRefs.current[catId] = el; }}
                >
                  <div className="flex items-center gap-3 mb-5">
                    <span className="w-1 h-6 rounded-full bg-primary inline-block" />
                    <h2 className="font-display font-bold text-xl text-foreground">{catName}</h2>
                    <span className="text-muted-foreground text-sm">({groupItems.length})</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {groupItems.map((item) => (
                      <MenuItemCard
                        key={item.cloverId}
                        item={item}
                        onCustomize={() => setWizardItem(item)}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Modifier Wizard Modal ── */}
      {wizardItem && (
        <ModifierWizard
          item={wizardItem}
          onClose={() => setWizardItem(null)}
        />
      )}
    </div>
  );
}

// ─── Item Card ────────────────────────────────────────────────────────────────

function MenuItemCard({
  item,
  onCustomize,
}: {
  item: MenuItem;
  onCustomize: () => void;
}) {
  const { addItem, openCart } = useCart();

  const hasModifiers = item.modifierGroups.length > 0;

  const handleAddDirect = () => {
    addItem({
      itemCloverId: item.cloverId,
      itemName: item.name,
      unitPriceCents: item.price ?? 0,
      quantity: 1,
      modifiers: [],
    });
    openCart();
  };

  return (
    <div className="group rounded-2xl border border-border bg-card overflow-hidden flex flex-col hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200">
      {/* Image */}
      <div className="relative h-40 bg-muted overflow-hidden">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-10 h-10 text-muted-foreground/20" />
          </div>
        )}
        {/* Tags overlay */}
        {item.tags.length > 0 && (
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
            {item.tags.slice(0, 2).map((tag) => (
              <Badge
                key={tag.cloverId}
                className="text-[10px] py-0 px-1.5 bg-background/80 backdrop-blur-sm text-foreground border-0"
              >
                {tag.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-foreground text-sm leading-snug">{item.name}</h3>
          {item.description && (
            <p className="text-muted-foreground text-xs mt-1 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-primary font-bold text-base">
            {item.price ? formatCents(item.price) : "Market price"}
          </span>

          {hasModifiers ? (
            <Button
              size="sm"
              className="gap-1.5 text-xs h-8"
              onClick={onCustomize}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Customize
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs h-8 border-primary/40 hover:bg-primary hover:text-primary-foreground"
              onClick={handleAddDirect}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Add
            </Button>
          )}
        </div>

        {hasModifiers && (
          <p className="text-[10px] text-muted-foreground">
            {item.modifierGroups.length} customization option{item.modifierGroups.length > 1 ? "s" : ""} available
          </p>
        )}
      </div>
    </div>
  );
}
