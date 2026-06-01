import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { coupons } from "../drizzle/schema";
import type { InsertCoupon } from "../drizzle/schema";

/** Validate a coupon code and return discount info. Returns null if invalid/expired/exhausted. */
export async function validateCoupon(
  code: string,
  subtotalCents: number
): Promise<{
  valid: boolean;
  coupon?: typeof coupons.$inferSelect;
  discountCents: number;
  finalCents: number;
  message?: string;
}> {
  const db = await getDb();
  if (!db) return { valid: false, discountCents: 0, finalCents: subtotalCents, message: "Database unavailable" };

  const rows = await db
    .select()
    .from(coupons)
    .where(eq(coupons.code, code.toUpperCase().trim()))
    .limit(1);

  if (rows.length === 0) {
    return { valid: false, discountCents: 0, finalCents: subtotalCents, message: "Coupon code not found" };
  }

  const coupon = rows[0]!;

  if (!coupon.active) {
    return { valid: false, discountCents: 0, finalCents: subtotalCents, message: "This coupon is no longer active" };
  }

  if (coupon.expiresAt && new Date() > coupon.expiresAt) {
    return { valid: false, discountCents: 0, finalCents: subtotalCents, message: "This coupon has expired" };
  }

  if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, discountCents: 0, finalCents: subtotalCents, message: "This coupon has reached its usage limit" };
  }

  let discountCents = 0;
  if (coupon.discountType === "percentage") {
    discountCents = Math.round(subtotalCents * coupon.discountValue / 100);
  } else {
    discountCents = coupon.discountValue; // fixed cents
  }

  const finalCents = Math.max(0, subtotalCents - discountCents);

  return { valid: true, coupon, discountCents, finalCents };
}

/** Increment the usedCount for a coupon after a successful order. */
export async function incrementCouponUsage(code: string): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const rows = await db.select().from(coupons).where(eq(coupons.code, code.toUpperCase().trim())).limit(1);
  if (rows.length === 0) return;
  const coupon = rows[0]!;
  await db.update(coupons).set({ usedCount: coupon.usedCount + 1 }).where(eq(coupons.code, coupon.code));
}

/** Get all coupons for admin management. */
export async function getAllCoupons() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(coupons).orderBy(coupons.createdAt);
}

/** Create a new coupon. */
export async function createCoupon(data: InsertCoupon) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const normalized: InsertCoupon = { ...data, code: data.code.toUpperCase().trim() };
  const [result] = await db.insert(coupons).values(normalized);
  return (result as any).insertId as number;
}

/** Toggle a coupon's active status. */
export async function toggleCoupon(id: number, active: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.update(coupons).set({ active }).where(eq(coupons.id, id));
}

/** Delete a coupon by ID. */
export async function deleteCoupon(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  await db.delete(coupons).where(eq(coupons.id, id));
}
