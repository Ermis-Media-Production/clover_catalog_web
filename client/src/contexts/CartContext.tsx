import { createContext, useContext, useEffect, useReducer, useState, useCallback } from "react";

export interface CartModifier {
  name: string;
  priceCents: number;
  /** Real Clover modifier ID — links to catalog modifier on receipts/tickets */
  cloverId?: string;
}

export interface CartItem {
  itemCloverId: string;
  itemName: string;
  unitPriceCents: number;
  quantity: number;
  modifiers: CartModifier[];
  /** Unique key = cloverId + sorted modifier names */
  key: string;
}

interface CartState {
  items: CartItem[];
}

type CartAction =
  | { type: "ADD"; item: Omit<CartItem, "key"> }
  | { type: "REMOVE"; key: string }
  | { type: "SET_QTY"; key: string; quantity: number }
  | { type: "CLEAR" }
  | { type: "HYDRATE"; items: CartItem[] };

function makeKey(cloverId: string, modifiers: CartModifier[]): string {
  const modKey = modifiers
    .map((m) => m.name)
    .sort()
    .join("|");
  return `${cloverId}::${modKey}`;
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "HYDRATE":
      return { items: action.items };

    case "ADD": {
      const key = makeKey(action.item.itemCloverId, action.item.modifiers);
      const existing = state.items.find((i) => i.key === key);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.key === key ? { ...i, quantity: i.quantity + action.item.quantity } : i
          ),
        };
      }
      return { items: [...state.items, { ...action.item, key }] };
    }

    case "REMOVE":
      return { items: state.items.filter((i) => i.key !== action.key) };

    case "SET_QTY": {
      if (action.quantity <= 0) {
        return { items: state.items.filter((i) => i.key !== action.key) };
      }
      return {
        items: state.items.map((i) =>
          i.key === action.key ? { ...i, quantity: action.quantity } : i
        ),
      };
    }

    case "CLEAR":
      return { items: [] };

    default:
      return state;
  }
}

const STORAGE_KEY = "clover_cart_v1";

function loadFromStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CartItem[];
  } catch {
    return [];
  }
}

export const CONVENIENCE_FEE_RATE = 0.03; // 3% non-taxable
export function calcConvenienceFee(subtotalCents: number): number {
  return Math.round(subtotalCents * CONVENIENCE_FEE_RATE);
}

interface CartContextValue {
  items: CartItem[];
  totalItems: number;
  /** Subtotal before convenience fee */
  totalCents: number;
  /** 3% convenience fee in cents (non-taxable) */
  convenienceFeeCents: number;
  /** Grand total including convenience fee */
  grandTotalCents: number;
  isOpen: boolean;
  specialInstructions: string;
  setSpecialInstructions: (value: string) => void;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, "key">) => void;
  removeItem: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] });
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [specialInstructions, setSpecialInstructionsState] = useState("");

  const setSpecialInstructions = useCallback((value: string) => {
    setSpecialInstructionsState(value);
  }, []);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = loadFromStorage();
    if (stored.length > 0) {
      dispatch({ type: "HYDRATE", items: stored });
    }
    setHydrated(true);
  }, []);

  // Persist to localStorage on every change
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  }, [state.items, hydrated]);

  const totalItems = state.items.reduce((s, i) => s + i.quantity, 0);
  const totalCents = state.items.reduce(
    (s, i) =>
      s +
      i.unitPriceCents * i.quantity +
      i.modifiers.reduce((ms, m) => ms + m.priceCents, 0) * i.quantity,
    0
  );
  const convenienceFeeCents = calcConvenienceFee(totalCents);
  const grandTotalCents = totalCents + convenienceFeeCents;

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        totalItems,
        totalCents,
        convenienceFeeCents,
        grandTotalCents,
        isOpen,
        specialInstructions,
        setSpecialInstructions,
        openCart: () => setIsOpen(true),
        closeCart: () => setIsOpen(false),
        addItem: (item) => dispatch({ type: "ADD", item }),
        removeItem: (key) => dispatch({ type: "REMOVE", key }),
        setQuantity: (key, quantity) => dispatch({ type: "SET_QTY", key, quantity }),
        clearCart: () => {
          dispatch({ type: "CLEAR" });
          setSpecialInstructionsState("");
        },
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}

export { makeKey };
