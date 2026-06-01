import { Link } from "wouter";
import { LayoutGrid, RefreshCw, ArrowRight, Tag, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const { data: lastSync, error: lastSyncError } = trpc.catalog.getLastSync.useQuery();
  const { data: items, error: itemsError } = trpc.catalog.getItems.useQuery({});
  const { data: categories, error: categoriesError } = trpc.catalog.getCategories.useQuery();
  const { data: coupons } = trpc.coupon.list.useQuery();
  const statsError = lastSyncError ?? itemsError ?? categoriesError;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">C</span>
          </div>
          <span className="font-display font-semibold text-lg text-foreground">Clover Catalog</span>
        </div>
        <nav className="flex items-center gap-2">
          <Link href="/catalog">
            <Button variant="ghost" size="sm">Catalog</Button>
          </Link>
          <Link href="/sync">
            <Button variant="ghost" size="sm">Sync</Button>
          </Link>
          <Link href="/coupons">
            <Button variant="ghost" size="sm">Coupons</Button>
          </Link>
          <Link href="/photos">
            <Button variant="ghost" size="sm">Photos</Button>
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col">
        <section className="container py-20 flex flex-col items-start gap-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Clover Integration Active
          </div>
          <h1 className="font-display text-5xl font-bold text-foreground leading-tight">
            Your Clover catalog,<br />
            <span className="text-primary">always in sync.</span>
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-xl">
            Browse your full product catalog pulled directly from Clover — items, categories,
            tags, modifiers, and pricing — updated automatically every 30 minutes.
          </p>
          <div className="flex items-center gap-3">
            <Link href="/catalog">
              <Button size="lg" className="gap-2">
                Browse Catalog <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/sync">
              <Button size="lg" variant="outline" className="gap-2">
                <RefreshCw className="w-4 h-4" /> Sync Dashboard
              </Button>
            </Link>
          </div>
        </section>

        {/* Stats */}
        <section className="container pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl">
            <StatCard
              label="Items"
              value={items?.length ?? "—"}
              icon={<LayoutGrid className="w-5 h-5 text-primary" />}
            />
            <StatCard
              label="Categories"
              value={categories?.length ?? "—"}
              icon={<span className="text-primary text-lg font-bold">#</span>}
            />
            <StatCard
              label="Last Sync"
              value={
                lastSync?.finishedAt
                  ? new Date(lastSync.finishedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "Never"
              }
              icon={<RefreshCw className="w-5 h-5 text-primary" />}
              sub={
                lastSync?.finishedAt
                  ? new Date(lastSync.finishedAt).toLocaleDateString()
                  : undefined
              }
            />
            <StatCard
              label="Active Coupons"
              value={coupons ? coupons.filter((c) => c.active).length : "—"}
              icon={<Tag className="w-5 h-5 text-primary" />}
            />
            <StatCard
              label="Custom Photos"
              value={items ? items.filter((i: any) => i.customImageUrl).length : "—"}
              icon={<Image className="w-5 h-5 text-primary" />}
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-6 py-4 text-center text-muted-foreground text-sm">
        Clover Catalog Sync — powered by Clover REST API
      </footer>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-sm">{label}</span>
        {icon}
      </div>
      <div>
        <span className="font-display text-3xl font-bold text-foreground">{value}</span>
        {sub && <p className="text-muted-foreground text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}
