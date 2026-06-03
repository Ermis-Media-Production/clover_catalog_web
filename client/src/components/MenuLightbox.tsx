import { useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, ShoppingCart, Plus } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

export interface LightboxItem {
  cloverId: string;
  name: string;
  imageUrl?: string | null;
  customImageUrl?: string | null;
  price: number;
  description?: string | null;
  modifierGroups?: Array<{ id: string; name: string; required: boolean }>;
}

interface MenuLightboxProps {
  items: LightboxItem[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onOpenWingsWizard?: () => void;
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function MenuLightbox({ items, currentIndex, onClose, onNavigate, onOpenWingsWizard }: MenuLightboxProps) {
  const { addItem } = useCart();
  const item = items[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < items.length - 1;
  const photoUrl = item?.customImageUrl || item?.imageUrl;

  const handlePrev = useCallback(() => {
    if (hasPrev) onNavigate(currentIndex - 1);
  }, [hasPrev, currentIndex, onNavigate]);

  const handleNext = useCallback(() => {
    if (hasNext) onNavigate(currentIndex + 1);
  }, [hasNext, currentIndex, onNavigate]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") handlePrev();
      if (e.key === "ArrowRight") handleNext();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, handlePrev, handleNext]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleAddToCart = () => {
    if (!item) return;
    // Wings items open the Wings Wizard
    if (/chicken wings/i.test(item.name) && onOpenWingsWizard) {
      onClose();
      onOpenWingsWizard();
      return;
    }
    const hasRequired = item.modifierGroups?.some((g) => g.required);
    if (hasRequired) {
      onClose();
      toast.info(`Customize ${item.name} to add to cart`);
      return;
    }
    addItem({
      itemCloverId: item.cloverId,
      itemName: item.name,
      unitPriceCents: item.price,
      quantity: 1,
      modifiers: [],
    });
    toast.success(`${item.name} added to cart`);
  };

  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.92)" }}
      onClick={onClose}
    >
      {/* Main container — stop propagation so clicks inside don't close */}
      <div
        className="relative flex flex-col items-center w-full h-full max-w-5xl mx-auto px-4 py-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 flex items-center justify-center w-10 h-10 rounded-full transition-all duration-150 hover:scale-110 active:scale-95"
          style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "#fff" }}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Counter */}
        <div
          className="absolute top-4 left-4 z-10 text-xs font-medium px-3 py-1 rounded-full"
          style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)" }}
        >
          {currentIndex + 1} / {items.length}
        </div>

        {/* Image area */}
        <div className="flex-1 flex items-center justify-center w-full relative min-h-0">
          {/* Prev arrow */}
          <button
            onClick={handlePrev}
            disabled={!hasPrev}
            className="absolute left-0 z-10 flex items-center justify-center w-11 h-11 rounded-full transition-all duration-150 hover:scale-110 active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed"
            style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "#fff" }}
            aria-label="Previous item"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Photo */}
          <div className="flex-1 flex items-center justify-center px-14 h-full">
            {photoUrl ? (
              <img
                key={item.cloverId}
                src={photoUrl}
                alt={item.name}
                className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl"
                style={{
                  maxHeight: "calc(100vh - 220px)",
                  animation: "lightboxFadeIn 0.2s cubic-bezier(0.23,1,0.32,1)",
                }}
              />
            ) : (
              <div
                className="flex flex-col items-center justify-center rounded-2xl w-full"
                style={{
                  height: "calc(100vh - 220px)",
                  maxWidth: 480,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  color: "rgba(255,255,255,0.3)",
                }}
              >
                <ShoppingCart className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-sm">No photo available</p>
              </div>
            )}
          </div>

          {/* Next arrow */}
          <button
            onClick={handleNext}
            disabled={!hasNext}
            className="absolute right-0 z-10 flex items-center justify-center w-11 h-11 rounded-full transition-all duration-150 hover:scale-110 active:scale-95 disabled:opacity-20 disabled:cursor-not-allowed"
            style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "#fff" }}
            aria-label="Next item"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>

        {/* Bottom info + CTA */}
        <div
          className="flex flex-col items-center gap-3 pt-4 pb-2 w-full max-w-sm"
          style={{ animation: "lightboxFadeIn 0.25s cubic-bezier(0.23,1,0.32,1)" }}
        >
          <h2 className="text-white text-xl font-semibold text-center leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            {item.name}
          </h2>
          {item.description && (
            <p className="text-center text-sm" style={{ color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
              {item.description}
            </p>
          )}

          {/* Add to Cart button */}
          <button
            onClick={handleAddToCart}
            className="flex items-center gap-2 px-8 py-3 rounded-full font-semibold text-sm tracking-wide transition-all duration-150 hover:scale-105 active:scale-95 shadow-lg mt-1"
            style={{
              backgroundColor: "#c41e1e",
              color: "#fff",
              boxShadow: "0 4px 20px rgba(196,30,30,0.4)",
            }}
          >
            <Plus className="w-4 h-4" />
            Add to Cart
          </button>
        </div>
      </div>

      {/* CSS animation */}
      <style>{`
        @keyframes lightboxFadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
