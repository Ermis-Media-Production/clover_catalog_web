import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  ShoppingBag,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Tag,
  ChevronRight,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(date: Date | string) {
  return new Date(date).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type OrderStatus = "pending" | "paid" | "failed" | "refunded";

function StatusBadge({ status }: { status: OrderStatus }) {
  if (status === "paid") {
    return (
      <Badge className="bg-green-500/15 text-green-500 border-green-500/30 gap-1 font-medium">
        <CheckCircle2 className="w-3 h-3" /> Paid
      </Badge>
    );
  }
  if (status === "failed") {
    return (
      <Badge className="bg-destructive/15 text-destructive border-destructive/30 gap-1 font-medium">
        <XCircle className="w-3 h-3" /> Failed
      </Badge>
    );
  }
  if (status === "refunded") {
    return (
      <Badge className="bg-yellow-500/15 text-yellow-500 border-yellow-500/30 gap-1 font-medium">
        <RefreshCw className="w-3 h-3" /> Refunded
      </Badge>
    );
  }
  return (
    <Badge className="bg-muted text-muted-foreground border-border gap-1 font-medium">
      <Clock className="w-3 h-3" /> Pending
    </Badge>
  );
}

export default function OrdersPage() {
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const { data: orders, isLoading, error, refetch } = trpc.checkout.listOrders.useQuery();
  const { data: orderDetail, isLoading: detailLoading } = trpc.checkout.getOrderById.useQuery(
    { id: selectedOrderId! },
    { enabled: selectedOrderId !== null }
  );

  const paidOrders = orders?.filter((o) => o.status === "paid").length ?? 0;
  const totalRevenue = orders
    ?.filter((o) => o.status === "paid")
    .reduce((sum, o) => sum + o.totalCents, 0) ?? 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg text-foreground">Order History</span>
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
          <Button variant="ghost" size="icon" onClick={() => refetch()} title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </nav>
      </header>

      <div className="container py-8 max-w-6xl">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-muted-foreground text-sm mb-1">Total Orders</p>
            <p className="text-3xl font-bold text-foreground">{orders?.length ?? "—"}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-muted-foreground text-sm mb-1">Paid Orders</p>
            <p className="text-3xl font-bold text-green-500">{paidOrders}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-muted-foreground text-sm mb-1">Total Revenue</p>
            <p className="text-3xl font-bold text-foreground">{formatCents(totalRevenue)}</p>
          </div>
        </div>

        {/* Orders Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            Loading orders…
          </div>
        ) : error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-destructive text-sm">
            {error.message}
          </div>
        ) : !orders || orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <ShoppingBag className="w-12 h-12 opacity-20" />
            <p className="text-lg font-medium">No orders yet</p>
            <p className="text-sm">Orders placed through the menu will appear here.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Reference</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Customer</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Date</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-muted-foreground font-medium">Coupon</th>
                  <th className="text-right px-4 py-3 text-muted-foreground font-medium">Total</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {orders.map((order, idx) => (
                  <tr
                    key={order.id}
                    className={`border-b border-border last:border-0 hover:bg-muted/20 cursor-pointer transition-colors ${
                      idx % 2 === 0 ? "" : "bg-muted/5"
                    }`}
                    onClick={() => setSelectedOrderId(order.id)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-primary font-semibold">
                      {order.reference}
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      <div>{order.customerFirstName} {order.customerLastName}</div>
                      <div className="text-muted-foreground text-xs">{order.customerEmail}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status as OrderStatus} />
                    </td>
                    <td className="px-4 py-3">
                      {order.couponCode ? (
                        <span className="flex items-center gap-1 text-xs text-green-500">
                          <Tag className="w-3 h-3" />
                          {order.couponCode}
                          <span className="text-muted-foreground">
                            (−{formatCents(order.discountCents ?? 0)})
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">
                      {formatCents(order.totalCents)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <ChevronRight className="w-4 h-4" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrderId !== null && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setSelectedOrderId(null)}
        >
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-card">
              <h2 className="font-semibold text-foreground text-lg">Order Details</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedOrderId(null)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                Loading…
              </div>
            ) : orderDetail ? (
              <div className="p-6 space-y-5">
                {/* Reference & Status */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-0.5">Order Reference</p>
                    <p className="font-mono font-bold text-primary text-lg">{orderDetail.reference}</p>
                  </div>
                  <StatusBadge status={orderDetail.status as OrderStatus} />
                </div>

                {/* Customer */}
                <div className="rounded-xl bg-muted/20 border border-border p-4 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">Customer</p>
                  <p className="text-foreground font-medium">
                    {orderDetail.customerFirstName} {orderDetail.customerLastName}
                  </p>
                  <p className="text-muted-foreground text-sm">{orderDetail.customerEmail}</p>
                  {orderDetail.customerPhone && (
                    <p className="text-muted-foreground text-sm">{orderDetail.customerPhone}</p>
                  )}
                </div>

                {/* Items */}
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-3">Items</p>
                  <div className="space-y-2">
                    {orderDetail.items.map((item: any) => {
                      const lineTotal =
                        (item.unitPriceCents +
                          item.modifiers.reduce((s: number, m: any) => s + m.priceCents, 0)) *
                        item.quantity;
                      return (
                        <div
                          key={item.id}
                          className="flex justify-between gap-2 text-sm py-2 border-b border-border last:border-0"
                        >
                          <div className="min-w-0">
                            <p className="text-foreground font-medium">{item.itemName}</p>
                            {item.modifiers.length > 0 && (
                              <p className="text-muted-foreground text-xs">
                                {item.modifiers.map((m: any) => m.name).join(", ")}
                              </p>
                            )}
                            <p className="text-muted-foreground text-xs">
                              {formatCents(item.unitPriceCents)} × {item.quantity}
                            </p>
                          </div>
                          <span className="text-foreground font-medium shrink-0">
                            {formatCents(lineTotal)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Totals */}
                <div className="rounded-xl bg-muted/20 border border-border p-4 space-y-2">
                  {orderDetail.couponCode && (
                    <>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Subtotal</span>
                        <span>
                          {formatCents(orderDetail.totalCents + (orderDetail.discountCents ?? 0))}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm text-green-500">
                        <span className="flex items-center gap-1">
                          <Tag className="w-3.5 h-3.5" />
                          {orderDetail.couponCode}
                        </span>
                        <span>−{formatCents(orderDetail.discountCents ?? 0)}</span>
                      </div>
                    </>
                  )}
                  <div className="flex justify-between font-bold text-foreground border-t border-border pt-2">
                    <span>Total</span>
                    <span>{formatCents(orderDetail.totalCents)}</span>
                  </div>
                </div>

                {/* Clover POS Order */}
                {orderDetail.cloverOrderId && (
                  <div className="rounded-xl bg-primary/5 border border-primary/20 p-4">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
                      Clover POS
                    </p>
                    <p className="text-sm text-foreground">
                      Clover Order ID:{" "}
                      <span className="font-mono text-primary">{orderDetail.cloverOrderId}</span>
                    </p>
                  </div>
                )}

                {/* Payment Info */}
                {orderDetail.authnetTransactionId && (
                  <div className="rounded-xl bg-green-500/5 border border-green-500/20 p-4">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
                      Payment
                    </p>
                    <p className="text-sm text-foreground">
                      Transaction ID:{" "}
                      <span className="font-mono text-primary">{orderDetail.authnetTransactionId}</span>
                    </p>
                    {orderDetail.authnetAuthCode && (
                      <p className="text-sm text-muted-foreground">
                        Auth Code: {orderDetail.authnetAuthCode}
                      </p>
                    )}
                  </div>
                )}

                {orderDetail.paymentError && (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/30 p-4">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-2">
                      Payment Error
                    </p>
                    <p className="text-sm text-destructive">{orderDetail.paymentError}</p>
                  </div>
                )}

                {/* Date */}
                <p className="text-xs text-muted-foreground text-center">
                  Placed on {formatDate(orderDetail.createdAt)}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
