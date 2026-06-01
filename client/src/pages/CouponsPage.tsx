import { useState } from "react";
import { Link } from "wouter";
import {
  Tag,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function CouponsPage() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    code: "",
    description: "",
    discountType: "percentage" as "percentage" | "fixed",
    discountValue: "",
    maxUses: "",
    expiresAt: "",
    active: true,
  });

  const { data: coupons, isLoading, error } = trpc.coupon.list.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  const createMutation = trpc.coupon.create.useMutation({
    onSuccess: () => {
      utils.coupon.list.invalidate();
      setOpen(false);
      setForm({ code: "", description: "", discountType: "percentage", discountValue: "", maxUses: "", expiresAt: "", active: true });
      toast.success("Coupon created successfully");
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleMutation = trpc.coupon.toggle.useMutation({
    onSuccess: () => utils.coupon.list.invalidate(),
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.coupon.delete.useMutation({
    onSuccess: () => {
      utils.coupon.list.invalidate();
      toast.success("Coupon deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCreate = () => {
    if (!form.code.trim()) { toast.error("Coupon code is required"); return; }
    const value = parseInt(form.discountValue, 10);
    if (!value || value < 1) { toast.error("Discount value must be at least 1"); return; }
    createMutation.mutate({
      code: form.code.trim(),
      description: form.description || undefined,
      discountType: form.discountType,
      discountValue: form.discountType === "fixed" ? Math.round(value * 100) : value,
      active: form.active,
      maxUses: form.maxUses ? parseInt(form.maxUses, 10) : undefined,
      expiresAt: form.expiresAt || undefined,
    });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Copied "${code}" to clipboard`);
  };

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-foreground font-semibold">Admin access required</p>
        <Link href="/admin"><Button variant="outline">Go to Admin</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center gap-3 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <Link href="/admin">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Tag className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-bold text-foreground text-lg leading-none">Coupon Manager</h1>
          <p className="text-muted-foreground text-xs">Create and manage discount codes</p>
        </div>
        <div className="ml-auto">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="w-4 h-4" />New Coupon</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Discount Coupon</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label>Coupon Code</Label>
                  <Input
                    placeholder="e.g. SAVE20"
                    value={form.code}
                    onChange={(e) => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                    className="uppercase font-mono"
                  />
                  <p className="text-xs text-muted-foreground">Customers enter this at checkout.</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input
                    placeholder="e.g. 20% off for loyal customers"
                    value={form.description}
                    onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Discount Type</Label>
                    <Select
                      value={form.discountType}
                      onValueChange={(v) => setForm(f => ({ ...f, discountType: v as "percentage" | "fixed" }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>
                      {form.discountType === "percentage" ? "Discount %" : "Discount $"}
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={form.discountType === "percentage" ? 100 : undefined}
                      placeholder={form.discountType === "percentage" ? "e.g. 20" : "e.g. 5.00"}
                      value={form.discountValue}
                      onChange={(e) => setForm(f => ({ ...f, discountValue: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Max Uses <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input
                      type="number"
                      min={1}
                      placeholder="Unlimited"
                      value={form.maxUses}
                      onChange={(e) => setForm(f => ({ ...f, maxUses: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Expires On <span className="text-muted-foreground text-xs">(optional)</span></Label>
                    <Input
                      type="date"
                      value={form.expiresAt}
                      onChange={(e) => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={handleCreate} disabled={createMutation.isPending} className="gap-2">
                  {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Coupon
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <div className="container py-8 max-w-5xl">
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/30 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error.message}</p>
          </div>
        )}

        {!isLoading && !error && coupons && (
          <>
            {coupons.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <Tag className="w-12 h-12 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground font-medium">No coupons yet</p>
                <p className="text-muted-foreground text-sm">Create your first discount coupon to get started.</p>
                <Button className="mt-2 gap-2" onClick={() => setOpen(true)}>
                  <Plus className="w-4 h-4" />New Coupon
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {coupons.map((coupon) => (
                  <div
                    key={coupon.id}
                    className={`rounded-2xl border bg-card p-5 flex flex-col sm:flex-row sm:items-center gap-4 transition-opacity ${
                      !coupon.active ? "opacity-50" : ""
                    }`}
                  >
                    {/* Code + badge */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Tag className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold font-mono text-foreground text-lg tracking-wide">
                            {coupon.code}
                          </span>
                          <button
                            onClick={() => copyCode(coupon.code)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                            title="Copy code"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <Badge variant={coupon.active ? "default" : "secondary"}>
                            {coupon.active ? (
                              <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Active</span>
                            ) : "Inactive"}
                          </Badge>
                        </div>
                        {coupon.description && (
                          <p className="text-muted-foreground text-sm truncate">{coupon.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex flex-wrap gap-4 text-sm sm:ml-auto">
                      <div className="text-center">
                        <p className="font-bold text-foreground text-base">
                          {coupon.discountType === "percentage"
                            ? `${coupon.discountValue}%`
                            : formatCents(coupon.discountValue)}
                        </p>
                        <p className="text-muted-foreground text-xs">Discount</p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-foreground text-base">{coupon.usedCount}</p>
                        <p className="text-muted-foreground text-xs">
                          {coupon.maxUses !== null ? `/ ${coupon.maxUses} uses` : "uses"}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="font-bold text-foreground text-base">{formatDate(coupon.expiresAt)}</p>
                        <p className="text-muted-foreground text-xs">Expires</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        title={coupon.active ? "Deactivate" : "Activate"}
                        onClick={() => toggleMutation.mutate({ id: coupon.id, active: !coupon.active })}
                        disabled={toggleMutation.isPending}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {coupon.active
                          ? <ToggleRight className="w-5 h-5 text-primary" />
                          : <ToggleLeft className="w-5 h-5" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Delete coupon"
                        onClick={() => {
                          if (confirm(`Delete coupon "${coupon.code}"?`)) {
                            deleteMutation.mutate({ id: coupon.id });
                          }
                        }}
                        disabled={deleteMutation.isPending}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
