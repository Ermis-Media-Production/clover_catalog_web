import { Link, useParams } from "wouter";
import { CheckCircle2, Package, Mail, Hash, ArrowRight, Loader2, AlertCircle, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function OrderConfirmationPage() {
  const params = useParams<{ reference: string }>();
  const reference = params.reference ?? "";

  const { data: order, isLoading, error } = trpc.checkout.getOrder.useQuery(
    { reference },
    { enabled: !!reference }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-10 h-10 text-destructive opacity-70" />
        <p className="text-muted-foreground">Order not found.</p>
        <Link href="/catalog">
          <Button variant="outline">Back to Catalog</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        {/* Success header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Order Confirmed!</h1>
          <p className="text-muted-foreground text-sm">
            Thank you, {order.customerFirstName}. Your payment was processed successfully.
          </p>
        </div>

        {/* Pickup reminder banner */}
        <div className="rounded-2xl border-2 border-amber-500/60 bg-amber-50 dark:bg-amber-950/30 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <h2 className="font-bold text-amber-800 dark:text-amber-300 text-base">
              Recoge tu orden en el local
            </h2>
          </div>
          <p className="text-amber-700 dark:text-amber-400 text-sm leading-relaxed">
            Tu pedido ha sido enviado a nuestra cocina. Por favor recógelo en:
          </p>
          <div className="rounded-xl bg-white/70 dark:bg-black/20 border border-amber-200 dark:border-amber-800 px-4 py-3 space-y-2">
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-amber-900 dark:text-amber-200">Casa de Pizza &amp; Wings</p>
                <p className="text-amber-700 dark:text-amber-400">765 N Nellis Blvd, Las Vegas, NV 89110</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-amber-700 dark:text-amber-400">
                Horario: <span className="font-semibold">Lun – Dom, 10:00 AM – 10:00 PM</span>
              </p>
            </div>
          </div>
          <p className="text-amber-600 dark:text-amber-500 text-xs text-center">
            Muestra tu número de orden <span className="font-mono font-bold">{order.reference}</span> al recoger.
          </p>
        </div>

        {/* Order details card */}
        <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <Hash className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-muted-foreground text-xs">Order Reference</p>
                <p className="font-mono font-semibold text-foreground">{order.reference}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-muted-foreground text-xs">Email</p>
                <p className="font-medium text-foreground truncate">{order.customerEmail}</p>
              </div>
            </div>
          </div>

          {order.authnetTransactionId && (
            <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-muted-foreground">
              Transaction ID: <span className="font-mono text-foreground">{order.authnetTransactionId}</span>
              {order.authnetAuthCode && (
                <> · Auth Code: <span className="font-mono text-foreground">{order.authnetAuthCode}</span></>
              )}
            </div>
          )}

          {/* Items */}
          <div className="border-t border-border pt-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Package className="w-4 h-4 text-primary" />
              Items ({order.items.length})
            </div>
            {order.items.map((item) => {
              const mods = Array.isArray(item.modifiers) ? item.modifiers : [];
              const lineTotal =
                (item.unitPriceCents + mods.reduce((s: number, m: { priceCents: number }) => s + m.priceCents, 0)) *
                item.quantity;
              return (
                <div key={item.id} className="flex justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="text-foreground truncate">{item.itemName}</p>
                    {mods.length > 0 && (
                      <p className="text-muted-foreground text-xs truncate">
                        {mods.map((m: { name: string }) => m.name).join(", ")}
                      </p>
                    )}
                    <p className="text-muted-foreground text-xs">Qty: {item.quantity}</p>
                  </div>
                  <span className="text-foreground font-medium shrink-0">
                    {formatCents(lineTotal)}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="border-t border-border pt-3 flex justify-between items-center">
            <span className="text-muted-foreground text-sm">Total paid</span>
            <span className="font-bold text-2xl text-foreground">{formatCents(order.totalCents)}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <Link href="/catalog" className="flex-1">
            <Button variant="outline" className="w-full gap-2">
              Continue Shopping <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
