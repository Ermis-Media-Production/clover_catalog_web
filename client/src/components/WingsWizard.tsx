import { useState, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, ShoppingCart, Check, Flame } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

// ─── Data ────────────────────────────────────────────────────────────────────

export interface WingsItem {
  id: number;
  cloverId: string;
  name: string;
  price: number; // cents
  imageUrl?: string | null;
}

// Quantity options mapped to Clover item IDs
const QUANTITY_OPTIONS = [
  { qty: 8,  label: "8 Wings",  price: 999,  cloverId: "2MAXX5A4XKTQ6" },
  { qty: 12, label: "12 Wings", price: 1499, cloverId: "1SJJGB75XK4BR" },
  { qty: 20, label: "20 Wings", price: 2699, cloverId: "5E0YB16XNDKGE" },
  { qty: 40, label: "40 Wings", price: 4999, cloverId: "M0J1THFXQSKM4" },
];

// Cooking styles
const COOKING_STYLES = ["Regular", "Extra Crispy", "Well Done", "Plain"];

// Spice levels: 0=no heat, 1=mild, 2=medium, 3=hot, 4=very hot
const SAUCES: { name: string; spice: number }[] = [
  { name: "Plain",           spice: 0 },
  { name: "Ranch",           spice: 0 },
  { name: "Blue Cheese",     spice: 0 },
  { name: "BBQ",             spice: 0 },
  { name: "Teriyaki",        spice: 0 },
  { name: "Lemon Pepper",    spice: 0 },
  { name: "Lemon Garlic",    spice: 0 },
  { name: "Garlic Parmesan", spice: 0 },
  { name: "Mild",            spice: 1 },
  { name: "Medium",          spice: 2 },
  { name: "Spicy Honey BBQ", spice: 2 },
  { name: "Spicy Teriyaki",  spice: 2 },
  { name: "Hot",             spice: 3 },
  { name: "Half And Half",   spice: 1 },
  { name: "Mango Habanero",  spice: 4 },
];

// Extra sauces with prices (cents)
const EXTRA_SAUCES: { name: string; price: number; spice: number }[] = [
  { name: "BBQ",             price: 200, spice: 0 },
  { name: "Blue Cheese",     price: 200, spice: 0 },
  { name: "Garlic Parmesan", price: 200, spice: 0 },
  { name: "Teriyaki",        price: 200, spice: 0 },
  { name: "Lemon Pepper",    price: 200, spice: 0 },
  { name: "Lemon Garlic",    price: 200, spice: 0 },
  { name: "Ranch 2oz",       price: 100, spice: 0 },
  { name: "Ranch 4oz",       price: 200, spice: 0 },
  { name: "Mild",            price: 200, spice: 1 },
  { name: "Medium",          price: 200, spice: 2 },
  { name: "Spicy Honey BBQ", price: 200, spice: 2 },
  { name: "Spicy Teriyaki",  price: 200, spice: 2 },
  { name: "Hot",             price: 200, spice: 3 },
  { name: "Mango Habanero",  price: 200, spice: 4 },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Number of FREE dipping sauces included based on quantity */
function includedSauceCount(qty: number): number {
  // 1 for 8, then +1 per 10 wings for 12+
  if (qty <= 8) return 1;
  return Math.floor(qty / 10) + (qty % 10 > 0 ? 1 : 0);
  // 12 → 2, 20 → 2+1=3... let's use: 8→1, 12→2, 20→3, 40→5
}

function sauceCountForQty(qty: number): number {
  if (qty === 8)  return 1;
  if (qty === 12) return 2;
  if (qty === 20) return 3;
  if (qty === 40) return 5;
  return 1;
}

/** Render chile pepper icons for spice level */
function SpiceIcons({ level }: { level: number }) {
  if (level === 0) return null;
  return (
    <span className="inline-flex items-center gap-0.5 ml-1.5">
      {Array.from({ length: level }).map((_, i) => (
        <Flame
          key={i}
          className="w-3.5 h-3.5"
          style={{
            color: level === 1 ? "#f59e0b"
                 : level === 2 ? "#f97316"
                 : level === 3 ? "#ef4444"
                 : "#dc2626",
            fill: "currentColor",
          }}
        />
      ))}
    </span>
  );
}

// ─── Step Components ──────────────────────────────────────────────────────────

function StepQuantity({
  selected,
  onSelect,
}: {
  selected: number | null;
  onSelect: (qty: number) => void;
}) {
  return (
    <div>
      <h3 className="font-heading text-xl font-bold mb-1" style={{ color: "#f7f2e8" }}>
        How many wings?
      </h3>
      <p className="text-sm mb-5" style={{ color: "rgba(247,242,232,0.6)" }}>
        Choose your quantity
      </p>
      <div className="grid grid-cols-2 gap-3">
        {QUANTITY_OPTIONS.map((opt) => {
          const isSelected = selected === opt.qty;
          return (
            <button
              key={opt.qty}
              onClick={() => onSelect(opt.qty)}
              className="relative rounded-xl p-4 text-left transition-all duration-200 active:scale-95"
              style={{
                background: isSelected
                  ? "linear-gradient(135deg, #2d5a1e, #3a7a28)"
                  : "rgba(247,242,232,0.06)",
                border: isSelected ? "2px solid #f5c842" : "2px solid rgba(247,242,232,0.12)",
                color: "#f7f2e8",
              }}
            >
              {isSelected && (
                <span
                  className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: "#f5c842" }}
                >
                  <Check className="w-3 h-3 text-black" />
                </span>
              )}
              <div className="text-2xl font-black font-heading mb-0.5">{opt.qty}</div>
              <div className="text-xs font-semibold uppercase tracking-wider opacity-70">Wings</div>
              <div
                className="text-lg font-bold mt-2"
                style={{ color: isSelected ? "#f5c842" : "#f5c842" }}
              >
                ${(opt.price / 100).toFixed(2)}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepCookingStyle({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (style: string) => void;
}) {
  return (
    <div>
      <h3 className="font-heading text-xl font-bold mb-1" style={{ color: "#f7f2e8" }}>
        Cooking style
      </h3>
      <p className="text-sm mb-5" style={{ color: "rgba(247,242,232,0.6)" }}>
        How would you like them cooked?
      </p>
      <div className="grid grid-cols-2 gap-3">
        {COOKING_STYLES.map((style) => {
          const isSelected = selected === style;
          return (
            <button
              key={style}
              onClick={() => onSelect(style)}
              className="rounded-xl p-4 text-left transition-all duration-200 active:scale-95 relative"
              style={{
                background: isSelected
                  ? "linear-gradient(135deg, #2d5a1e, #3a7a28)"
                  : "rgba(247,242,232,0.06)",
                border: isSelected ? "2px solid #f5c842" : "2px solid rgba(247,242,232,0.12)",
                color: "#f7f2e8",
              }}
            >
              {isSelected && (
                <span
                  className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: "#f5c842" }}
                >
                  <Check className="w-3 h-3 text-black" />
                </span>
              )}
              <div className="font-bold text-base">{style}</div>
              <div className="text-xs mt-1 opacity-60">
                {style === "Regular" && "Classic fried wings"}
                {style === "Extra Crispy" && "Extra crunchy skin"}
                {style === "Well Done" && "Fully cooked through"}
                {style === "Plain" && "No seasoning"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepFlavor({
  qty,
  flavor,
  halfHalf,
  halfFlavor1,
  halfFlavor2,
  onFlavorChange,
  onHalfHalfToggle,
  onHalfFlavor1Change,
  onHalfFlavor2Change,
}: {
  qty: number;
  flavor: string | null;
  halfHalf: boolean;
  halfFlavor1: string | null;
  halfFlavor2: string | null;
  onFlavorChange: (f: string) => void;
  onHalfHalfToggle: (v: boolean) => void;
  onHalfFlavor1Change: (f: string) => void;
  onHalfFlavor2Change: (f: string) => void;
}) {
  const canHalfHalf = qty >= 12;

  return (
    <div>
      <h3 className="font-heading text-xl font-bold mb-1" style={{ color: "#f7f2e8" }}>
        Choose your flavor
      </h3>
      <p className="text-sm mb-4" style={{ color: "rgba(247,242,232,0.6)" }}>
        Select how you want your wings tossed
      </p>

      {canHalfHalf && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => onHalfHalfToggle(false)}
            className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
            style={{
              background: !halfHalf ? "#2d5a1e" : "rgba(247,242,232,0.06)",
              border: !halfHalf ? "2px solid #f5c842" : "2px solid rgba(247,242,232,0.12)",
              color: "#f7f2e8",
            }}
          >
            Single Flavor
          </button>
          <button
            onClick={() => onHalfHalfToggle(true)}
            className="flex-1 py-2 rounded-lg text-sm font-bold transition-all"
            style={{
              background: halfHalf ? "#2d5a1e" : "rgba(247,242,232,0.06)",
              border: halfHalf ? "2px solid #f5c842" : "2px solid rgba(247,242,232,0.12)",
              color: "#f7f2e8",
            }}
          >
            Half &amp; Half
          </button>
        </div>
      )}

      {!halfHalf ? (
        <div className="grid grid-cols-1 gap-1.5 max-h-64 overflow-y-auto pr-1">
          {SAUCES.filter((s) => s.name !== "Half And Half").map((sauce) => {
            const isSelected = flavor === sauce.name;
            return (
              <button
                key={sauce.name}
                onClick={() => onFlavorChange(sauce.name)}
                className="flex items-center justify-between rounded-lg px-3 py-2.5 text-left transition-all duration-150 active:scale-[0.98]"
                style={{
                  background: isSelected ? "rgba(45,90,30,0.7)" : "rgba(247,242,232,0.04)",
                  border: isSelected ? "1.5px solid #f5c842" : "1.5px solid rgba(247,242,232,0.1)",
                  color: "#f7f2e8",
                }}
              >
                <span className="flex items-center gap-1 font-medium text-sm">
                  {sauce.name}
                  <SpiceIcons level={sauce.spice} />
                </span>
                {isSelected && <Check className="w-4 h-4 shrink-0" style={{ color: "#f5c842" }} />}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#f5c842" }}>
              First Half
            </p>
            <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto pr-1">
              {SAUCES.filter((s) => s.name !== "Half And Half").map((sauce) => {
                const isSelected = halfFlavor1 === sauce.name;
                return (
                  <button
                    key={sauce.name}
                    onClick={() => onHalfFlavor1Change(sauce.name)}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-left transition-all"
                    style={{
                      background: isSelected ? "rgba(45,90,30,0.7)" : "rgba(247,242,232,0.04)",
                      border: isSelected ? "1.5px solid #f5c842" : "1.5px solid rgba(247,242,232,0.1)",
                      color: "#f7f2e8",
                    }}
                  >
                    <span className="flex items-center gap-1 text-sm font-medium">
                      {sauce.name}
                      <SpiceIcons level={sauce.spice} />
                    </span>
                    {isSelected && <Check className="w-4 h-4 shrink-0" style={{ color: "#f5c842" }} />}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#f5c842" }}>
              Second Half
            </p>
            <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto pr-1">
              {SAUCES.filter((s) => s.name !== "Half And Half").map((sauce) => {
                const isSelected = halfFlavor2 === sauce.name;
                return (
                  <button
                    key={sauce.name}
                    onClick={() => onHalfFlavor2Change(sauce.name)}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-left transition-all"
                    style={{
                      background: isSelected ? "rgba(45,90,30,0.7)" : "rgba(247,242,232,0.04)",
                      border: isSelected ? "1.5px solid #f5c842" : "1.5px solid rgba(247,242,232,0.12)",
                      color: "#f7f2e8",
                    }}
                  >
                    <span className="flex items-center gap-1 text-sm font-medium">
                      {sauce.name}
                      <SpiceIcons level={sauce.spice} />
                    </span>
                    {isSelected && <Check className="w-4 h-4 shrink-0" style={{ color: "#f5c842" }} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StepDippingSauces({
  qty,
  selected,
  onToggle,
}: {
  qty: number;
  selected: string[];
  onToggle: (sauce: string) => void;
}) {
  const maxFree = sauceCountForQty(qty);
  const dippingSauces = SAUCES.filter(
    (s) => s.name !== "Half And Half" && s.name !== "Plain"
  );

  return (
    <div>
      <h3 className="font-heading text-xl font-bold mb-1" style={{ color: "#f7f2e8" }}>
        Dipping sauces
      </h3>
      <p className="text-sm mb-1" style={{ color: "rgba(247,242,232,0.6)" }}>
        Choose up to <span style={{ color: "#f5c842", fontWeight: 700 }}>{maxFree}</span> free dipping sauce{maxFree > 1 ? "s" : ""} included with your order
      </p>
      <p className="text-xs mb-4" style={{ color: "rgba(247,242,232,0.4)" }}>
        {selected.length}/{maxFree} selected
      </p>
      <div className="grid grid-cols-1 gap-1.5 max-h-72 overflow-y-auto pr-1">
        {dippingSauces.map((sauce) => {
          const isSelected = selected.includes(sauce.name);
          const isDisabled = !isSelected && selected.length >= maxFree;
          return (
            <button
              key={sauce.name}
              onClick={() => !isDisabled && onToggle(sauce.name)}
              disabled={isDisabled}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-left transition-all duration-150"
              style={{
                background: isSelected ? "rgba(45,90,30,0.7)" : "rgba(247,242,232,0.04)",
                border: isSelected ? "1.5px solid #f5c842" : "1.5px solid rgba(247,242,232,0.1)",
                color: isDisabled ? "rgba(247,242,232,0.3)" : "#f7f2e8",
                cursor: isDisabled ? "not-allowed" : "pointer",
                opacity: isDisabled ? 0.5 : 1,
              }}
            >
              <span className="flex items-center gap-1 font-medium text-sm">
                {sauce.name}
                <SpiceIcons level={sauce.spice} />
              </span>
              {isSelected && <Check className="w-4 h-4 shrink-0" style={{ color: "#f5c842" }} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepExtraSauces({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (sauce: string) => void;
}) {
  return (
    <div>
      <h3 className="font-heading text-xl font-bold mb-1" style={{ color: "#f7f2e8" }}>
        Extra sauces
      </h3>
      <p className="text-sm mb-4" style={{ color: "rgba(247,242,232,0.6)" }}>
        Add extra sauces on the side (optional)
      </p>
      <div className="grid grid-cols-1 gap-1.5 max-h-72 overflow-y-auto pr-1">
        {EXTRA_SAUCES.map((sauce) => {
          const isSelected = selected.includes(sauce.name);
          return (
            <button
              key={sauce.name}
              onClick={() => onToggle(sauce.name)}
              className="flex items-center justify-between rounded-lg px-3 py-2.5 text-left transition-all duration-150 active:scale-[0.98]"
              style={{
                background: isSelected ? "rgba(45,90,30,0.7)" : "rgba(247,242,232,0.04)",
                border: isSelected ? "1.5px solid #f5c842" : "1.5px solid rgba(247,242,232,0.1)",
                color: "#f7f2e8",
              }}
            >
              <span className="flex items-center gap-1 font-medium text-sm">
                {sauce.name}
                <SpiceIcons level={sauce.spice} />
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-sm font-bold" style={{ color: "#f5c842" }}>
                  +${(sauce.price / 100).toFixed(2)}
                </span>
                {isSelected && <Check className="w-4 h-4" style={{ color: "#f5c842" }} />}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: "Quantity" },
  { id: 2, label: "Style" },
  { id: 3, label: "Flavor" },
  { id: 4, label: "Dipping" },
  { id: 5, label: "Extras" },
];

interface WingsWizardProps {
  onClose: () => void;
}

export default function WingsWizard({ onClose }: WingsWizardProps) {
  const { addItem, openCart } = useCart();

  const [step, setStep] = useState(1);
  const [qty, setQty] = useState<number | null>(null);
  const [cookingStyle, setCookingStyle] = useState<string | null>("Regular");
  const [flavor, setFlavor] = useState<string | null>(null);
  const [halfHalf, setHalfHalf] = useState(false);
  const [halfFlavor1, setHalfFlavor1] = useState<string | null>(null);
  const [halfFlavor2, setHalfFlavor2] = useState<string | null>(null);
  const [dippingSauces, setDippingSauces] = useState<string[]>([]);
  const [extraSauces, setExtraSauces] = useState<string[]>([]);

  // Reset half-half when qty drops below 12
  useEffect(() => {
    if (qty !== null && qty < 12) {
      setHalfHalf(false);
      setHalfFlavor1(null);
      setHalfFlavor2(null);
    }
  }, [qty]);

  // Reset dipping sauces if qty changes (max count changes)
  useEffect(() => {
    if (qty !== null) {
      const max = sauceCountForQty(qty);
      setDippingSauces((prev) => prev.slice(0, max));
    }
  }, [qty]);

  const selectedOption = QUANTITY_OPTIONS.find((o) => o.qty === qty);
  const extraSaucesCost = extraSauces.reduce((sum, name) => {
    const s = EXTRA_SAUCES.find((e) => e.name === name);
    return sum + (s?.price ?? 0);
  }, 0);
  const totalPrice = (selectedOption?.price ?? 0) + extraSaucesCost;

  // Validation per step
  function canAdvance(): boolean {
    if (step === 1) return qty !== null;
    if (step === 2) return cookingStyle !== null;
    if (step === 3) {
      if (halfHalf) return halfFlavor1 !== null && halfFlavor2 !== null;
      return flavor !== null;
    }
    if (step === 4) return dippingSauces.length > 0;
    return true; // step 5 extras are optional
  }

  function handleNext() {
    if (step < STEPS.length) setStep((s) => s + 1);
  }

  function handleBack() {
    if (step > 1) setStep((s) => s - 1);
  }

  function toggleDipping(sauce: string) {
    const max = sauceCountForQty(qty ?? 8);
    setDippingSauces((prev) => {
      if (prev.includes(sauce)) return prev.filter((s) => s !== sauce);
      if (prev.length >= max) return prev;
      return [...prev, sauce];
    });
  }

  function toggleExtra(sauce: string) {
    setExtraSauces((prev) =>
      prev.includes(sauce) ? prev.filter((s) => s !== sauce) : [...prev, sauce]
    );
  }

  function buildModifiersNote(): string {
    const parts: string[] = [];
    if (cookingStyle && cookingStyle !== "Regular") parts.push(`Style: ${cookingStyle}`);
    if (halfHalf) {
      parts.push(`Flavor: Half ${halfFlavor1} / Half ${halfFlavor2}`);
    } else if (flavor) {
      parts.push(`Flavor: ${flavor}`);
    }
    if (dippingSauces.length > 0) {
      parts.push(`Dipping: ${dippingSauces.join(", ")}`);
    }
    if (extraSauces.length > 0) {
      parts.push(`Extra sauces: ${extraSauces.join(", ")}`);
    }
    return parts.join(" | ");
  }

  function handleAddToCart() {
    if (!selectedOption) return;
    const note = buildModifiersNote();
    const flavorLabel = halfHalf
      ? `Half ${halfFlavor1} / Half ${halfFlavor2}`
      : flavor ?? "";

    addItem({
      itemCloverId: selectedOption.cloverId,
      itemName: `${selectedOption.qty} Wings`,
      unitPriceCents: totalPrice,
      quantity: 1,
      modifiers: note ? [{ name: note, priceCents: 0 }] : [],
    });
    onClose();
    openCart();
  }

  // Close on backdrop click
  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", zIndex: 70 }}
      onClick={handleBackdropClick}
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
        style={{
          background: "linear-gradient(160deg, #1a2e14 0%, #0f1a0b 100%)",
          border: "1px solid rgba(245,200,66,0.2)",
          maxHeight: "90vh",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: "1px solid rgba(247,242,232,0.08)" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🍗</span>
            <div>
              <h2 className="font-heading font-black text-lg leading-tight" style={{ color: "#f7f2e8" }}>
                Build Your Wings
              </h2>
              {qty && (
                <p className="text-xs" style={{ color: "#f5c842" }}>
                  ${(totalPrice / 100).toFixed(2)} total
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "rgba(247,242,232,0.08)", color: "rgba(247,242,232,0.6)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-1 px-5 py-3 shrink-0">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1 flex-1">
              <div
                className="flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-all duration-300"
                style={{
                  background:
                    step > s.id
                      ? "#2d5a1e"
                      : step === s.id
                      ? "#f5c842"
                      : "rgba(247,242,232,0.1)",
                  color:
                    step > s.id
                      ? "#f5c842"
                      : step === s.id
                      ? "#000"
                      : "rgba(247,242,232,0.4)",
                }}
              >
                {step > s.id ? <Check className="w-3 h-3" /> : s.id}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="flex-1 h-0.5 rounded transition-all duration-300"
                  style={{
                    background: step > s.id ? "#2d5a1e" : "rgba(247,242,232,0.1)",
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step label */}
        <div className="px-5 pb-2 shrink-0">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(247,242,232,0.4)" }}>
            Step {step} of {STEPS.length} — {STEPS[step - 1].label}
          </p>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-5 pb-4">
          {step === 1 && (
            <StepQuantity selected={qty} onSelect={(q) => { setQty(q); }} />
          )}
          {step === 2 && (
            <StepCookingStyle selected={cookingStyle} onSelect={setCookingStyle} />
          )}
          {step === 3 && qty !== null && (
            <StepFlavor
              qty={qty}
              flavor={flavor}
              halfHalf={halfHalf}
              halfFlavor1={halfFlavor1}
              halfFlavor2={halfFlavor2}
              onFlavorChange={setFlavor}
              onHalfHalfToggle={setHalfHalf}
              onHalfFlavor1Change={setHalfFlavor1}
              onHalfFlavor2Change={setHalfFlavor2}
            />
          )}
          {step === 4 && qty !== null && (
            <StepDippingSauces
              qty={qty}
              selected={dippingSauces}
              onToggle={toggleDipping}
            />
          )}
          {step === 5 && (
            <StepExtraSauces selected={extraSauces} onToggle={toggleExtra} />
          )}
        </div>

        {/* Footer navigation */}
        <div
          className="flex items-center gap-3 px-5 py-4 shrink-0"
          style={{ borderTop: "1px solid rgba(247,242,232,0.08)" }}
        >
          {step > 1 ? (
            <button
              onClick={handleBack}
              className="flex items-center gap-1 px-4 py-2.5 rounded-lg text-sm font-bold transition-all active:scale-95"
              style={{
                background: "rgba(247,242,232,0.08)",
                color: "rgba(247,242,232,0.7)",
                border: "1px solid rgba(247,242,232,0.12)",
              }}
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          ) : (
            <div />
          )}

          <div className="flex-1" />

          {step < STEPS.length ? (
            <button
              onClick={handleNext}
              disabled={!canAdvance()}
              className="flex items-center gap-1 px-5 py-2.5 rounded-lg text-sm font-bold transition-all active:scale-95"
              style={{
                background: canAdvance() ? "#f5c842" : "rgba(247,242,232,0.1)",
                color: canAdvance() ? "#000" : "rgba(247,242,232,0.3)",
                cursor: canAdvance() ? "pointer" : "not-allowed",
              }}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleAddToCart}
              disabled={!canAdvance()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all active:scale-95"
              style={{
                background: canAdvance() ? "#c41e1e" : "rgba(247,242,232,0.1)",
                color: canAdvance() ? "#fff" : "rgba(247,242,232,0.3)",
                cursor: canAdvance() ? "pointer" : "not-allowed",
              }}
            >
              <ShoppingCart className="w-4 h-4" />
              Add to Cart — ${(totalPrice / 100).toFixed(2)}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
