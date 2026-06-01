import { Link } from "wouter";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Package,
  Tag,
  Layers,
  FolderOpen,
  AlertCircle,
  CalendarClock,
  CircleStop,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return "Never";
  const d = new Date(date);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
}

function duration(start: Date | string | null | undefined, end: Date | string | null | undefined): string {
  if (!start || !end) return "—";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function SyncPage() {
  const utils = trpc.useUtils();
  const { data: lastSync, isLoading: lastSyncLoading, error: lastSyncError } = trpc.catalog.getLastSync.useQuery();
  const { data: logs = [], isLoading: logsLoading, error: logsError } = trpc.catalog.getSyncLogs.useQuery({ limit: 20 });
  const { data: items = [], error: itemsError } = trpc.catalog.getItems.useQuery({});
  const { data: categories = [], error: categoriesError } = trpc.catalog.getCategories.useQuery();
  const { data: tags = [], error: tagsError } = trpc.catalog.getTags.useQuery();
  const { data: modifierGroups = [], error: modGroupsError } = trpc.catalog.getModifierGroups.useQuery();
  const catalogError = itemsError ?? categoriesError ?? tagsError ?? modGroupsError;

  const syncMutation = trpc.catalog.syncNow.useMutation({
    onSuccess: () => {
      toast.success("Sync completed successfully");
      utils.catalog.getSyncLogs.invalidate();
      utils.catalog.getLastSync.invalidate();
      utils.catalog.getItems.invalidate();
      utils.catalog.getCategories.invalidate();
      utils.catalog.getTags.invalidate();
      utils.catalog.getModifierGroups.invalidate();
    },
    onError: (err) => {
      toast.error(`Sync failed: ${err.message}`);
      utils.catalog.getSyncLogs.invalidate();
    },
  });

  const isSyncing = syncMutation.isPending;

  const { data: scheduleStatus, isLoading: scheduleLoading } = trpc.catalog.getScheduleStatus.useQuery();

  const setupScheduleMutation = trpc.catalog.setupScheduledSync.useMutation({
    onSuccess: () => {
      toast.success("Automatic sync enabled — runs every 30 minutes");
      utils.catalog.getScheduleStatus.invalidate();
    },
    onError: (err) => toast.error(`Failed to enable schedule: ${err.message}`),
  });

  const cancelScheduleMutation = trpc.catalog.cancelScheduledSync.useMutation({
    onSuccess: () => {
      toast.success("Automatic sync disabled");
      utils.catalog.getScheduleStatus.invalidate();
    },
    onError: (err) => toast.error(`Failed to disable schedule: ${err.message}`),
  });

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
          <span className="font-display font-semibold text-lg text-foreground">Sync Dashboard</span>
        </div>
        <Link href="/catalog">
          <Button variant="outline" size="sm">Browse Catalog</Button>
        </Link>
      </header>

      <div className="container py-8 space-y-8 max-w-5xl">
        {/* Control panel */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="font-display font-semibold text-xl text-foreground">Manual Sync</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Pull the latest catalog data from Clover immediately.
                Automatic sync runs every 30 minutes.
              </p>
              {lastSync && (
                <p className="text-muted-foreground text-xs mt-2">
                  Last successful sync: {timeAgo(lastSync.finishedAt)} ·{" "}
                  {lastSync.itemsSynced} items synced
                </p>
              )}
            </div>
            <Button
              size="lg"
              onClick={() => syncMutation.mutate()}
              disabled={isSyncing}
              className="gap-2 shrink-0"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing…" : "Sync Now"}
            </Button>
          </div>
        </section>

        {/* Catalog stats */}
        <section>
          <h2 className="font-display font-semibold text-lg text-foreground mb-4">Current Catalog</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard icon={<Package className="w-4 h-4" />} label="Items" value={items.length} />
            <StatCard icon={<FolderOpen className="w-4 h-4" />} label="Categories" value={categories.length} />
            <StatCard icon={<Tag className="w-4 h-4" />} label="Tags" value={tags.length} />
            <StatCard icon={<Layers className="w-4 h-4" />} label="Modifier Groups" value={modifierGroups.length} />
          </div>
        </section>

        {/* Sync log */}
        <section>
          <h2 className="font-display font-semibold text-lg text-foreground mb-4">Sync History</h2>
          {logsError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground rounded-xl border border-destructive/30 bg-destructive/5">
              <AlertCircle className="w-8 h-8 text-destructive opacity-70" />
              <p className="text-sm font-medium text-destructive">Failed to load sync history</p>
              <p className="text-xs">{logsError.message}</p>
            </div>
          ) : logsLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-card animate-pulse" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground rounded-xl border border-border bg-card">
              <Clock className="w-8 h-8 opacity-30" />
              <p>No sync history yet. Run a sync to get started.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Started</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden sm:table-cell">Duration</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Items</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden md:table-cell">Categories</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden lg:table-cell">Tags</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium hidden lg:table-cell">Modifiers</th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">Error</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-border/50 last:border-0 hover:bg-accent/30 transition-colors">
                      <td className="px-4 py-3">
                        <StatusBadge status={log.status} />
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        <span title={new Date(log.startedAt).toLocaleString()}>
                          {timeAgo(log.startedAt)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {duration(log.startedAt, log.finishedAt)}
                      </td>
                      <td className="px-4 py-3 text-foreground hidden md:table-cell">{log.itemsSynced ?? 0}</td>
                      <td className="px-4 py-3 text-foreground hidden md:table-cell">{log.categoriesSynced ?? 0}</td>
                      <td className="px-4 py-3 text-foreground hidden lg:table-cell">{log.tagsSynced ?? 0}</td>
                      <td className="px-4 py-3 text-foreground hidden lg:table-cell">{log.modifiersSynced ?? 0}</td>
                      <td className="px-4 py-3 max-w-xs">
                        {log.errorMessage ? (
                          <span className="text-destructive text-xs flex items-start gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span className="truncate">{log.errorMessage}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Schedule control */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-start gap-3">
              <CalendarClock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h2 className="font-display font-semibold text-xl text-foreground">Automatic Sync</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  When enabled, the catalog syncs every 30 minutes via a platform-managed heartbeat job.
                  The schedule runs independently of this browser session.
                </p>
                {scheduleStatus?.active && (
                  <p className="text-primary text-xs mt-2 font-medium">● Active — syncing every 30 minutes</p>
                )}
                {scheduleStatus && !scheduleStatus.active && (
                  <p className="text-muted-foreground text-xs mt-2">● Inactive — automatic sync is off</p>
                )}
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              {scheduleStatus?.active ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={() => cancelScheduleMutation.mutate()}
                  disabled={cancelScheduleMutation.isPending || scheduleLoading}
                >
                  <CircleStop className="w-4 h-4" />
                  {cancelScheduleMutation.isPending ? "Disabling…" : "Disable Auto-Sync"}
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => setupScheduleMutation.mutate()}
                  disabled={setupScheduleMutation.isPending || scheduleLoading}
                >
                  <CalendarClock className="w-4 h-4" />
                  {setupScheduleMutation.isPending ? "Enabling…" : "Enable Auto-Sync"}
                </Button>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-muted-foreground text-xs">{label}</p>
        <p className="font-display font-bold text-xl text-foreground">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "success") {
    return (
      <Badge className="gap-1 bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">
        <CheckCircle2 className="w-3 h-3" /> Success
      </Badge>
    );
  }
  if (status === "error") {
    return (
      <Badge variant="destructive" className="gap-1">
        <XCircle className="w-3 h-3" /> Error
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <RefreshCw className="w-3 h-3 animate-spin" /> Running
    </Badge>
  );
}
