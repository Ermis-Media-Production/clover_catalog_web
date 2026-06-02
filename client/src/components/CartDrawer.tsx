import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { X, Minus, Plus, ShoppingCart, Trash2, ArrowRight, MessageSquare } from "lucide-react";
import { useLocation } from "wouter";

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CartDrawer() {
  const { items, totalCents, totalItems, isOpen, closeCart, removeItem, setQuantity, specialInstructions, setSpecialInstructions } = useCart();
  const [, navigate] = useLocation();

  const handleCheckout = () => {
    closeCart();
    navigate("/checkout");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-[60] transition-opacity duration-300 ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={closeCart}
      />

      {/* Drawer */}
      <aside
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-background border-l border-border z-[61] flex flex-col shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">
              Cart{totalItems > 0 ? ` (${totalItems})` : ""}
            </h2>
          </div>
          <button
            onClick={closeCart}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Close cart"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
              <ShoppingCart className="w-12 h-12 opacity-20" />
              <p className="text-sm">Your cart is empty</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.key}
                className="flex gap-3 p-3 rounded-xl bg-card border border-border"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground text-sm leading-snug truncate">
                    {item.itemName}
                  </p>
                  {item.modifiers.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {item.modifiers.map((m) => m.name).join(", ")}
                    </p>
                  )}
                  <p className="text-primary text-sm font-semibold mt-1">
                    {formatCents(
                      (item.unitPriceCents +
                        item.modifiers.reduce((s, m) => s + m.priceCents, 0)) *
                        item.quantity
                    )}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  {/* Quantity controls */}
                  <div className="flex items-center gap-1">
                    <button
                      className="w-6 h-6 rounded-md bg-muted hover:bg-accent flex items-center justify-center transition-colors"
                      onClick={() => setQuantity(item.key, item.quantity - 1)}
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-medium text-foreground">
                      {item.quantity}
                    </span>
                    <button
                      className="w-6 h-6 rounded-md bg-muted hover:bg-accent flex items-center justify-center transition-colors"
                      onClick={() => setQuantity(item.key, item.quantity + 1)}
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  {/* Remove */}
                  <button
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => removeItem(item.key)}
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-border px-5 py-4 space-y-4">
            {/* Special Instructions */}
            <div className="space-y-1.5">
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <MessageSquare className="w-3.5 h-3.5" />
                Special Instructions
              </label>
              <textarea
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Allergies, extra napkins, no onions…"
                rows={2}
                maxLength={300}
                className="w-full resize-none rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-150"
              />
              {specialInstructions.length > 0 && (
                <p className="text-[10px] text-muted-foreground text-right">{specialInstructions.length}/300</p>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-sm">Total</span>
              <span className="font-bold text-xl text-foreground">{formatCents(totalCents)}</span>
            </div>
            <Button className="w-full gap-2" size="lg" onClick={handleCheckout}>
              Checkout <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </aside>
    </>
  );
}
