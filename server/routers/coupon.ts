import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  validateCoupon,
  getAllCoupons,
  createCoupon,
  toggleCoupon,
  deleteCoupon,
} from "../couponDb";

export const couponRouter = router({
  /** Validate a coupon code against a subtotal. Public — called from checkout. */
  validate: publicProcedure
    .input(
      z.object({
        code: z.string().min(1).max(64),
        subtotalCents: z.number().int().min(0),
      })
    )
    .mutation(async ({ input }) => {
      const result = await validateCoupon(input.code, input.subtotalCents);
      return result;
    }),

  /** List all coupons — admin only. */
  list: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    return getAllCoupons();
  }),

  /** Create a new coupon — admin only. */
  create: protectedProcedure
    .input(
      z.object({
        code: z.string().min(1).max(64),
        description: z.string().max(255).optional(),
        discountType: z.enum(["percentage", "fixed"]),
        discountValue: z.number().int().min(1),
        active: z.boolean().default(true),
        maxUses: z.number().int().min(1).optional(),
        expiresAt: z.string().optional(), // ISO date string
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      if (input.discountType === "percentage" && input.discountValue > 100) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Percentage discount cannot exceed 100%" });
      }
      const id = await createCoupon({
        code: input.code,
        description: input.description ?? null,
        discountType: input.discountType,
        discountValue: input.discountValue,
        active: input.active,
        maxUses: input.maxUses ?? null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      });
      return { success: true, id };
    }),

  /** Toggle a coupon active/inactive — admin only. */
  toggle: protectedProcedure
    .input(z.object({ id: z.number().int(), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      await toggleCoupon(input.id, input.active);
      return { success: true };
    }),

  /** Delete a coupon — admin only. */
  delete: protectedProcedure
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      await deleteCoupon(input.id);
      return { success: true };
    }),
});
