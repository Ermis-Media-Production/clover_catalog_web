import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  ArrowLeft,
  CreditCard,
  Lock,
  ShoppingBag,
  AlertCircle,
  Loader2,
  Tag,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/contexts/CartContext";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

const checkoutSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  cardNumber: z
    .string()
    .min(13, "Card number too short")
    .max(19, "Card number too long")
    .regex(/^[\d\s]+$/, "Numbers only"),
  expirationDate: z
    .string()
    .regex(/^\d{2}\/\d{2,4}$/, "Use MM/YY or MM/YYYY"),
  cardCode: z
    .string()
    .min(3, "CVV too short")
    .max(4, "CVV too long")
    .regex(/^\d+$/, "Numbers only"),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

interface AppliedCoupon {
  code: string;
  discountCents: number;
  finalCents: number;
  discountType: string;
  discountValue: number;
}

export default function CheckoutPage() {
  const { items, totalCents, clearCart } = useCart();
  const [, navigate] = useLocation();
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
  });

  const validateCoupon = trpc.coupon.validate.useMutation({
    onSuccess: (data) => {
      if (data.valid && data.coupon) {
        setAppliedCoupon({
          code: data.coupon.code,
          discountCents: data.discountCents,
          finalCents: data.finalCents,
          discountType: data.coupon.discountType,
          discountValue: data.coupon.discountValue,
        });
        setCouponError(null);
        toast.success(`Coupon applied! You save ${formatCents(data.discountCents)}`);
      } else {
        setAppliedCoupon(null);
        setCouponError(data.message ?? "Invalid coupon code");
      }
    },
    onError: () => {
      setCouponError("Failed to validate coupon. Please try again.");
    },
  });

  const placeOrder = trpc.checkout.placeOrder.useMutation({
    onSuccess: (data) => {
      clearCart();
      navigate(`/order/${data.reference}`);
    },
    onError: (err) => {
      setPaymentError(err.message);
      toast.error("Payment failed");
    },
  });

  const handleApplyCoupon = () => {
    if (!couponInput.trim()) return;
    validateCoupon.mutate({ code: couponInput.trim(), subtotalCents: totalCents });
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <ShoppingBag className="w-12 h-12 text-muted-foreground opacity-30" />
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Link href="/menu">
          <Button variant="outline">Browse Menu</Button>
        </Link>
      </div>
    );
  }

  const finalTotal = appliedCoupon ? appliedCoupon.finalCents : totalCents;
  const discountAmount = appliedCoupon ? appliedCoupon.discountCents : 0;

  const onSubmit = (data: CheckoutForm) => {
    setPaymentError(null);
    placeOrder.mutate({
      customer: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || undefined,
      },
      items: items.map((item) => ({
        itemCloverId: item.itemCloverId,
        itemName: item.itemName,
        unitPriceCents: item.unitPriceCents,
        quantity: item.quantity,
        modifiers: item.modifiers,
      })),
      payment: {
        cardNumber: data.cardNumber.replace(/\s/g, ""),
        expirationDate: data.expirationDate,
        cardCode: data.cardCode,
      },
      couponCode: appliedCoupon?.code,
    });
  };

  const isSubmitting = placeOrder.isPending;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center gap-3 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <Link href="/menu">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground font-bold text-sm">C</span>
        </div>
        <span className="font-semibold text-lg text-foreground">Checkout</span>
        <div className="ml-auto flex items-center gap-1.5 text-muted-foreground text-sm">
          <Lock className="w-3.5 h-3.5" />
          Secure payment
        </div>
      </header>

      <div className="container py-8 max-w-5xl">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left: forms */}
            <div className="lg:col-span-3 space-y-6">
              {/* Customer info */}
              <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <h2 className="font-semibold text-foreground text-lg">Contact Information</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">First name</Label>
                    <Input id="firstName" {...register("firstName")} placeholder="John" />
                    {errors.firstName && (
                      <p className="text-destructive text-xs">{errors.firstName.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">Last name</Label>
                    <Input id="lastName" {...register("lastName")} placeholder="Doe" />
                    {errors.lastName && (
                      <p className="text-destructive text-xs">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="john@example.com"
                  />
                  {errors.email && (
                    <p className="text-destructive text-xs">{errors.email.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">
                    Phone <span className="text-muted-foreground text-xs">(optional)</span>
                  </Label>
                  <Input id="phone" type="tel" {...register("phone")} placeholder="+1 555 000 0000" />
                </div>
              </section>

              {/* Coupon code */}
              <section className="rounded-2xl border border-border bg-card p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-foreground text-lg">Discount Coupon</h2>
                </div>

                {appliedCoupon ? (
                  <div className="flex items-center justify-between rounded-xl bg-green-500/10 border border-green-500/30 px-4 py-3">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <div>
                        <p className="font-semibold text-sm">{appliedCoupon.code}</p>
                        <p className="text-xs opacity-80">
                          {appliedCoupon.discountType === "percentage"
                            ? `${appliedCoupon.discountValue}% off`
                            : `${formatCents(appliedCoupon.discountValue)} off`}
                          {" — "}You save {formatCents(appliedCoupon.discountCents)}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={handleRemoveCoupon}
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter coupon code"
                      value={couponInput}
                      onChange={(e) => {
                        setCouponInput(e.target.value.toUpperCase());
                        setCouponError(null);
                      }}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleApplyCoupon())}
                      className="uppercase"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleApplyCoupon}
                      disabled={!couponInput.trim() || validateCoupon.isPending}
                      className="shrink-0"
                    >
                      {validateCoupon.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Apply"
                      )}
                    </Button>
                  </div>
                )}

                {couponError && (
                  <div className="flex items-center gap-2 text-destructive text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {couponError}
                  </div>
                )}
              </section>

              {/* Payment */}
              <section className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold text-foreground text-lg">Payment</h2>
                </div>

                {paymentError && (
                  <div className="flex items-start gap-2 rounded-lg bg-destructive/10 border border-destructive/30 p-3 text-sm text-destructive">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    {paymentError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="cardNumber">Card number</Label>
                  <Input
                    id="cardNumber"
                    {...register("cardNumber")}
                    placeholder="4111 1111 1111 1111"
                    maxLength={19}
                    inputMode="numeric"
                  />
                  {errors.cardNumber && (
                    <p className="text-destructive text-xs">{errors.cardNumber.message}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="expirationDate">Expiration</Label>
                    <Input
                      id="expirationDate"
                      {...register("expirationDate")}
                      placeholder="MM/YY"
                      maxLength={7}
                      inputMode="numeric"
                    />
                    {errors.expirationDate && (
                      <p className="text-destructive text-xs">{errors.expirationDate.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cardCode">CVV</Label>
                    <Input
                      id="cardCode"
                      {...register("cardCode")}
                      placeholder="123"
                      maxLength={4}
                      inputMode="numeric"
                      type="password"
                    />
                    {errors.cardCode && (
                      <p className="text-destructive text-xs">{errors.cardCode.message}</p>
                    )}
                  </div>
                </div>

                <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                  <Lock className="w-3 h-3" />
                  Payments are processed securely through Authorize.net. Your card details are never stored.
                </p>
              </section>
            </div>

            {/* Right: order summary */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-border bg-card p-6 space-y-4 sticky top-24">
                <h2 className="font-semibold text-foreground text-lg">Order Summary</h2>
                <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                  {items.map((item) => {
                    const lineTotal =
                      (item.unitPriceCents +
                        item.modifiers.reduce((s, m) => s + m.priceCents, 0)) *
                      item.quantity;
                    return (
                      <div key={item.key} className="flex justify-between gap-2 text-sm">
                        <div className="min-w-0">
                          <p className="text-foreground font-medium truncate">{item.itemName}</p>
                          {item.modifiers.length > 0 && (
                            <p className="text-muted-foreground text-xs truncate">
                              {item.modifiers.map((m) => m.name).join(", ")}
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

                {/* Totals */}
                <div className="border-t border-border pt-3 space-y-2">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Subtotal</span>
                    <span>{formatCents(totalCents)}</span>
                  </div>
                  {appliedCoupon && (
                    <div className="flex justify-between text-sm text-green-600 dark:text-green-400">
                      <span className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" />
                        {appliedCoupon.code}
                        {appliedCoupon.discountType === "percentage"
                          ? ` (${appliedCoupon.discountValue}% off)`
                          : ""}
                      </span>
                      <span>−{formatCents(discountAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-1 border-t border-border">
                    <span className="text-muted-foreground text-sm font-medium">Total</span>
                    <span className="font-bold text-2xl text-foreground">{formatCents(finalTotal)}</span>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full gap-2"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing…
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Pay {formatCents(finalTotal)}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
