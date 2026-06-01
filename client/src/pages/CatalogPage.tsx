import { useState, useMemo } from "react";
import { Link } from "wouter";
import {
  Search,
  Tag,
  Layers,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ArrowLeft,
  Package,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

function formatPrice(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground rounded-xl border border-destructive/30 bg-destructive/5">
      <AlertCircle className="w-8 h-8 text-destructive opacity-70" />
      <p className="text-sm font-medium text-destructive">Failed to load data</p>
      <p className="text-xs">{message}</p>
    </div>
  );
}

export default function CatalogPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const {
    data: categories = [],
    isLoading: catsLoading,
    error: catsError,
  } = trpc.catalog.getCategories.useQuery();

  const {
    data: items = [],
    isLoading: itemsLoading,
    error: itemsError,
  } = trpc.catalog.getItems.useQuery({
    categoryId: selectedCategory ?? undefined,
    search: search || undefined,
  });

  // Group items by category
  const grouped = useMemo(() => {
    if (selectedCategory) {
      const cat = categories.find((c) => c.cloverId === selectedCategory);
      return [{ category: cat?.name ?? "Category", items }];
    }
    const catMap = new Map<string, typeof items>();
    const uncategorized: typeof items = [];
    for (const item of items) {
      if (item.categoryIds.length === 0) {
        uncategorized.push(item);
      } else {
        for (const cid of item.categoryIds) {
          if (!catMap.has(cid)) catMap.set(cid, []);
          catMap.get(cid)!.push(item);
        }
      }
    }
    const result: { category: string; items: typeof items }[] = [];
    for (const cat of categories) {
      const its = catMap.get(cat.cloverId);
      if (its && its.length > 0) result.push({ category: cat.name, items: its });
    }
    if (uncategorized.length > 0) result.push({ category: "Uncategorized", items: uncategorized });
    return result;
  }, [items, categories, selectedCategory]);

  const isLoading = catsLoading || itemsLoading;
  const hasError = catsError || itemsError;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="mr-1">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">C</span>
          </div>
          <span className="font-display font-semibold text-lg text-foreground">Catalog Browser</span>
        </div>
        <Link href="/sync">
          <Button variant="outline" size="sm">Sync Dashboard</Button>
        </Link>
      </header>

      <div className="container py-6 flex gap-6">
        {/* Sidebar — categories */}
        <aside className="w-52 shrink-0 hidden md:block">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Categories</p>
          {catsError ? (
            <p className="text-xs text-destructive">Failed to load categories</p>
          ) : (
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedCategory === null
                      ? "bg-primary text-primary-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  All Items
                </button>
              </li>
              {categories.map((cat) => (
                <li key={cat.cloverId}>
                  <button
                    onClick={() => setSelectedCategory(cat.cloverId)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedCategory === cat.cloverId
                        ? "bg-primary text-primary-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search items by name, SKU, or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {hasError ? (
            <ErrorState message={(itemsError ?? catsError)?.message ?? "Unknown error"} />
          ) : isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 rounded-xl bg-card animate-pulse" />
              ))}
            </div>
          ) : grouped.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
              <Package className="w-12 h-12 opacity-30" />
              <p className="text-lg font-medium">No items found</p>
              <p className="text-sm">Try syncing from the Sync Dashboard or adjusting your filters.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {grouped.map(({ category, items: groupItems }) => (
                <section key={category}>
                  <h2 className="font-display font-semibold text-xl text-foreground mb-4 flex items-center gap-2">
                    <span className="w-1 h-5 rounded-full bg-primary inline-block" />
                    {category}
                    <span className="text-muted-foreground text-sm font-normal">({groupItems.length})</span>
                  </h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {groupItems.map((item) => (
                      <ItemCard key={item.cloverId} item={item} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type ModifierType = {
  cloverId: string;
  name: string;
  price: number | null;
  available: boolean | null;
};

type ModifierGroupType = {
  cloverId: string;
  name: string;
  minRequired: number | null;
  maxAllowed: number | null;
  modifiers: ModifierType[];
};

type TagType = { cloverId: string; name: string };

type ItemType = {
  cloverId: string;
  name: string;
  price: number | null;
  cost: number | null;
  description: string | null;
  sku: string | null;
  hidden: boolean | null;
  available: boolean | null;
  stockCount: number | null;
  imageUrl: string | null;
  categoryIds: string[];
  tagIds: string[];
  tags: TagType[];
  modifierGroupIds: string[];
  modifierGroups: ModifierGroupType[];
};

function ItemCard({ item }: { item: ItemType }) {
  const [expanded, setExpanded] = useState(false);
  const hasExtra = item.modifierGroups.length > 0 || item.stockCount != null;

  return (
    <div
      className={`rounded-xl border bg-card overflow-hidden transition-all ${
        item.hidden ? "opacity-60 border-border/50" : "border-border"
      }`}
    >
      <div className="flex gap-3 p-4">
        {/* Image */}
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-16 h-16 rounded-lg object-cover shrink-0 bg-muted"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-muted shrink-0 flex items-center justify-center">
            <Package className="w-6 h-6 text-muted-foreground/40" />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground text-sm leading-tight">{item.name}</h3>
            <div className="flex items-center gap-1 shrink-0">
              {item.hidden ? (
                <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
              ) : (
                <Eye className="w-3.5 h-3.5 text-primary" />
              )}
              <span
                className={`text-xs font-medium ${
                  item.available ? "text-primary" : "text-destructive"
                }`}
              >
                {item.available ? "Available" : "Unavailable"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-1">
            <span className="text-primary font-semibold text-sm">{formatPrice(item.price)}</span>
            {item.cost != null && item.cost > 0 && (
              <span className="text-muted-foreground text-xs">Cost: {formatPrice(item.cost)}</span>
            )}
            {item.sku && (
              <span className="text-muted-foreground text-xs">SKU: {item.sku}</span>
            )}
          </div>

          {item.description && (
            <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{item.description}</p>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {item.tags.map((tag) => (
                <Badge key={tag.cloverId} variant="secondary" className="text-xs gap-1 py-0">
                  <Tag className="w-2.5 h-2.5" />
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expandable: modifiers + stock */}
      {hasExtra && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between px-4 py-2 border-t border-border text-xs text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              {item.modifierGroups.length > 0
                ? `${item.modifierGroups.length} modifier group${item.modifierGroups.length > 1 ? "s" : ""}`
                : ""}
              {item.stockCount != null ? ` · Stock: ${item.stockCount}` : ""}
            </span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {expanded && (
            <div className="px-4 pb-4 pt-2 space-y-3 border-t border-border bg-background/30">
              {item.stockCount != null && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Stock count:</span>
                  <span className="font-medium text-foreground">{item.stockCount}</span>
                </div>
              )}
              {item.modifierGroups.map((mg) => (
                <div key={mg.cloverId} className="rounded-lg bg-muted/30 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-foreground">{mg.name}</p>
                    <span className="text-xs text-muted-foreground">
                      {mg.minRequired != null && mg.minRequired > 0
                        ? `Required: ${mg.minRequired}`
                        : "Optional"}
                      {mg.maxAllowed != null && mg.maxAllowed > 0
                        ? ` · Max: ${mg.maxAllowed}`
                        : ""}
                    </span>
                  </div>
                  {mg.modifiers.length > 0 && (
                    <div className="space-y-1">
                      {mg.modifiers.map((mod) => (
                        <div
                          key={mod.cloverId}
                          className={`flex items-center justify-between text-xs px-2 py-1 rounded bg-background/50 ${
                            mod.available === false ? "opacity-50" : ""
                          }`}
                        >
                          <span className="text-foreground">{mod.name}</span>
                          <span className="text-primary font-medium">
                            {mod.price && mod.price > 0 ? `+${formatPrice(mod.price)}` : "Included"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
