/**
 * ModifierWizard
 * A step-by-step modal that walks the user through each modifier group
 * for a menu item before adding it to the cart.
 *
 * Each step = one modifier group.
 * - If minRequired > 0  → at least that many must be selected (radio for max 1, checkboxes otherwise)
 * - If minRequired == 0 → optional group, user can skip
 * - maxAllowed controls how many can be picked simultaneously
 */

import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, ShoppingCart, Check, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart, type CartModifier } from "@/contexts/CartContext";

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

type WizardItem = {
  cloverId: string;
  name: string;
  price: number | null;
  description: string | null;
  imageUrl: string | null;
  modifierGroups: ModifierGroup[];
};

interface ModifierWizardProps {
  item: WizardItem;
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCents(cents: number | null | undefined): string {
  if (cents == null || cents === 0) return "";
  return `+$${(cents / 100).toFixed(2)}`;
}

function formatPrice(cents: number | null | undefined): string {
  if (cents == null) return "";
  return `$${(cents / 100).toFixed(2)}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ModifierWizard({ item, onClose }: ModifierWizardProps) {
  // Only include groups that have at least one available modifier
  const groups = item.modifierGroups.filter(
    (g) => g.modifiers.filter((m) => m.available !== false).length > 0
  );

  const [step, setStep] = useState(0); // 0 = first group
  const [selections, setSelections] = useState<Record<string, string[]>>(
    () => Object.fromEntries(groups.map((g) => [g.cloverId, []]))
  );
  const [quantity, setQuantity] = useState(1);

  const { addItem, openCart } = useCart();

  // Reset when item changes
  useEffect(() => {
    setStep(0);
    setSelections(Object.fromEntries(groups.map((g) => [g.cloverId, []])));
    setQuantity(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.cloverId]);

  const currentGroup = groups[step];
  const isLastStep = step === groups.length - 1;
  const isFirstStep = step === 0;

  const currentSelections = currentGroup ? selections[currentGroup.cloverId] ?? [] : [];
  const minReq = currentGroup?.minRequired ?? 0;
  const maxAllowed = currentGroup?.maxAllowed ?? 0; // 0 = unlimited
  const isRadio = maxAllowed === 1;

  const canProceed =
    !currentGroup ||
    currentSelections.length >= minReq;

  // Toggle a modifier in the current group
  const toggle = (modCloverId: string) => {
    if (!currentGroup) return;
    const key = currentGroup.cloverId;
    const current = selections[key] ?? [];

    if (isRadio) {
      // Radio: replace selection
      setSelections((prev) => ({ ...prev, [key]: [modCloverId] }));
      return;
    }

    if (current.includes(modCloverId)) {
      // Deselect
      setSelections((prev) => ({ ...prev, [key]: current.filter((id) => id !== modCloverId) }));
    } else {
      // Select — respect maxAllowed
      if (maxAllowed > 0 && current.length >= maxAllowed) return;
      setSelections((prev) => ({ ...prev, [key]: [...current, modCloverId] }));
    }
  };

  const handleNext = () => {
    if (!canProceed) return;
    if (isLastStep) {
      handleAddToCart();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleAddToCart = () => {
    // Build flat modifier list from all selections
    const cartModifiers: CartModifier[] = [];
    for (const group of groups) {
      const selected = selections[group.cloverId] ?? [];
      for (const modId of selected) {
        const mod = group.modifiers.find((m) => m.cloverId === modId);
        if (mod) {
          cartModifiers.push({ name: mod.name, priceCents: mod.price ?? 0 });
        }
      }
    }

    addItem({
      itemCloverId: item.cloverId,
      itemName: item.name,
      unitPriceCents: item.price ?? 0,
      quantity,
      modifiers: cartModifiers,
    });

    onClose();
    openCart();
  };

  // Compute running total
  const modifierTotal = groups.reduce((sum, group) => {
    const selected = selections[group.cloverId] ?? [];
    return (
      sum +
      selected.reduce((gs, modId) => {
        const mod = group.modifiers.find((m) => m.cloverId === modId);
        return gs + (mod?.price ?? 0);
      }, 0)
    );
  }, 0);
  const unitTotal = (item.price ?? 0) + modifierTotal;
  const grandTotal = unitTotal * quantity;

  // Progress
  const progress = groups.length > 0 ? ((step + 1) / groups.length) * 100 : 100;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div
          className="w-full sm:max-w-lg bg-background rounded-t-3xl sm:rounded-2xl border border-border shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[85vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-border shrink-0">
            <div className="flex-1 min-w-0 pr-4">
              <h2 className="font-display font-bold text-lg text-foreground leading-snug truncate">
                {item.name}
              </h2>
              {item.description && (
                <p className="text-muted-foreground text-xs mt-0.5 line-clamp-2">
                  {item.description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Progress Bar ── */}
          {groups.length > 1 && (
            <div className="px-5 pt-3 pb-1 shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">
                  Step {step + 1} of {groups.length}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {currentGroup?.name}
                </span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* ── Step Content ── */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {groups.length === 0 ? (
              // No modifiers — just quantity
              <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                <Check className="w-8 h-8 text-primary" />
                <p className="text-sm font-medium text-foreground">Ready to add!</p>
                <p className="text-xs">No customizations needed for this item.</p>
              </div>
            ) : (
              currentGroup && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-foreground text-base">
                      {currentGroup.name}
                    </h3>
                    <Badge
                      variant={minReq > 0 ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {minReq > 0 ? `Required · min ${minReq}` : "Optional"}
                      {maxAllowed > 0 ? ` · max ${maxAllowed}` : ""}
                    </Badge>
                  </div>

                  <p className="text-xs text-muted-foreground mb-4">
                    {isRadio
                      ? "Choose one option"
                      : maxAllowed > 0
                      ? `Choose up to ${maxAllowed}`
                      : "Choose as many as you like"}
                  </p>

                  <div className="space-y-2">
                    {currentGroup.modifiers
                      .filter((m) => m.available !== false)
                      .map((mod) => {
                        const isSelected = currentSelections.includes(mod.cloverId);
                        const isDisabled =
                          !isRadio &&
                          maxAllowed > 0 &&
                          currentSelections.length >= maxAllowed &&
                          !isSelected;

                        return (
                          <button
                            key={mod.cloverId}
                            onClick={() => !isDisabled && toggle(mod.cloverId)}
                            disabled={isDisabled}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${
                              isSelected
                                ? "border-primary bg-primary/10 text-foreground"
                                : isDisabled
                                ? "border-border bg-muted/30 text-muted-foreground opacity-50 cursor-not-allowed"
                                : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-accent/50"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Checkbox / Radio indicator */}
                              <div
                                className={`w-5 h-5 rounded-${isRadio ? "full" : "md"} border-2 flex items-center justify-center shrink-0 transition-colors ${
                                  isSelected
                                    ? "border-primary bg-primary"
                                    : "border-muted-foreground/40"
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                              </div>
                              <span className="text-sm font-medium">{mod.name}</span>
                            </div>
                            {mod.price != null && mod.price > 0 && (
                              <span className="text-primary text-sm font-semibold shrink-0 ml-2">
                                {formatCents(mod.price)}
                              </span>
                            )}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )
            )}
          </div>

          {/* ── Footer ── */}
          <div className="border-t border-border px-5 py-4 shrink-0 space-y-3">
            {/* Quantity selector — show on last step or when no groups */}
            {(isLastStep || groups.length === 0) && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Quantity</span>
                <div className="flex items-center gap-3">
                  <button
                    className="w-8 h-8 rounded-lg bg-muted hover:bg-accent flex items-center justify-center transition-colors"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center font-semibold text-foreground">{quantity}</span>
                  <button
                    className="w-8 h-8 rounded-lg bg-muted hover:bg-accent flex items-center justify-center transition-colors"
                    onClick={() => setQuantity((q) => q + 1)}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Price summary */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {formatPrice(item.price ?? 0)}
                {modifierTotal > 0 && (
                  <span className="text-primary"> {formatCents(modifierTotal)}</span>
                )}
                {quantity > 1 && <span className="text-muted-foreground"> × {quantity}</span>}
              </span>
              <span className="font-bold text-lg text-foreground">{formatPrice(grandTotal)}</span>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              {!isFirstStep && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={() => setStep((s) => s - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>
              )}

              <Button
                className="flex-1 gap-2"
                size="lg"
                disabled={!canProceed}
                onClick={handleNext}
              >
                {isLastStep || groups.length === 0 ? (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    Add to Cart · {formatPrice(grandTotal)}
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>

            {/* Skip optional step */}
            {!isLastStep && minReq === 0 && groups.length > 0 && (
              <button
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
                onClick={() => setStep((s) => s + 1)}
              >
                Skip this step
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
