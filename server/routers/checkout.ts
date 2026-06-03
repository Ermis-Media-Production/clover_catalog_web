import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  createPendingOrder,
  markOrderPaid,
  markOrderFailed,
  getOrderByReference,
  listOrders,
  getOrderById,
  saveCloverOrderId,
} from "../orderDb";
import { chargeCard } from "../authnet";
import { validateCoupon, incrementCouponUsage } from "../couponDb";
import { createCloverOrder } from "../cloverOrders";

const cartItemSchema = z.object({
  itemCloverId: z.string().min(1),
  itemName: z.string().min(1),
  unitPriceCents: z.number().int().min(0),
  quantity: z.number().int().min(1).max(99),
  modifiers: z
    .array(
      z.object({
        name: z.string(),
        priceCents: z.number().int().min(0),
      })
    )
    .optional(),
});

export const checkoutRouter = router({
  /**
   * Place an order: create DB record, charge card, push to Clover POS.
   * Returns the order reference on success so the client can navigate to confirmation.
   */
  placeOrder: publicProcedure
    .input(
      z.object({
        customer: z.object({
          firstName: z.string().min(1).max(128),
          lastName: z.string().min(1).max(128),
          email: z.string().email(),
          phone: z.string().max(32).optional(),
        }),
        items: z.array(cartItemSchema).min(1),
        payment: z.object({
          cardNumber: z.string().min(13).max(19),
          expirationDate: z.string().min(4).max(7),
          cardCode: z.string().min(3).max(4),
        }),
        couponCode: z.string().max(64).optional(),
        specialInstructions: z.string().max(300).optional(),
      })
    )
    .mutation(async ({ input }) => {
      if (!process.env.AUTHNET_API_LOGIN_ID || !process.env.AUTHNET_TRANSACTION_KEY) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Payment gateway is not configured. Please contact support.",
        });
      }

      // 1. Validate coupon if provided
      let couponData: { code: string; discountCents: number } | undefined;
      if (input.couponCode) {
        const subtotal = input.items.reduce(
          (sum, item) =>
            sum +
            item.unitPriceCents * item.quantity +
            (item.modifiers ?? []).reduce((ms, m) => ms + m.priceCents, 0) * item.quantity,
          0
        );
        const couponResult = await validateCoupon(input.couponCode, subtotal);
        if (!couponResult.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: couponResult.message ?? "Invalid coupon code",
          });
        }
        couponData = { code: input.couponCode.toUpperCase().trim(), discountCents: couponResult.discountCents };
      }

      // 2. Create pending order in DB (with coupon if any)
      const { id: orderId, reference, finalCents } = await createPendingOrder(
        input.customer,
        input.items,
        couponData,
        input.specialInstructions
      );

      // 3. Charge the card via Authorize.net
      const chargeResult = await chargeCard({
        amountCents: finalCents,
        cardNumber: input.payment.cardNumber,
        expirationDate: input.payment.expirationDate,
        cardCode: input.payment.cardCode,
        firstName: input.customer.firstName,
        lastName: input.customer.lastName,
        email: input.customer.email,
        invoiceNumber: reference,
        description: `Order ${reference} — ${input.items.length} item(s)`,
      });

      // 4. Update local order status based on payment result
      if (chargeResult.success && chargeResult.transactionId) {
        await markOrderPaid(orderId, chargeResult.transactionId, chargeResult.authCode ?? "");

        // Increment coupon usage counter after successful payment
        if (couponData?.code) {
          await incrementCouponUsage(couponData.code).catch(() => {});
        }

        // 5. Push order to Clover POS (fire-and-forget with error logging)
        //    We do NOT fail the checkout if Clover is unavailable — the payment
        //    already succeeded and the customer should get their confirmation.
        const customerName = `${input.customer.firstName} ${input.customer.lastName}`;
        createCloverOrder(input.items, finalCents, reference, customerName, input.specialInstructions, input.customer.phone)
          .then(({ cloverOrderId }) => {
            return saveCloverOrderId(orderId, cloverOrderId).catch((err) => {
              console.error(`[Clover] Failed to save cloverOrderId for order ${reference}:`, err);
            });
          })
          .catch((err) => {
            console.error(`[Clover] Failed to create Clover order for ${reference}:`, err);
          });

        return { success: true, reference, transactionId: chargeResult.transactionId };
      } else {
        await markOrderFailed(orderId, chargeResult.errorMessage ?? "Payment declined");
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: chargeResult.errorMessage ?? "Payment was declined. Please check your card details.",
        });
      }
    }),

  /** Get a completed order by reference for the confirmation page. */
  getOrder: publicProcedure
    .input(z.object({ reference: z.string() }))
    .query(async ({ input }) => {
      const order = await getOrderByReference(input.reference);
      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }
      return order;
    }),

  /** List all orders — admin only. */
  listOrders: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(500).optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      return listOrders(input?.limit ?? 200);
    }),

  /** Get a full order with items by ID — admin only. */
  getOrderById: protectedProcedure
    .input(z.object({ id: z.number().int().min(1) }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      const order = await getOrderById(input.id);
      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }
      return order;
    }),
});
