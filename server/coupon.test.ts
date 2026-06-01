import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock couponDb to avoid real DB calls
vi.mock("./couponDb", () => ({
  validateCoupon: vi.fn(),
  incrementCouponUsage: vi.fn(),
  getAllCoupons: vi.fn(),
  createCoupon: vi.fn(),
  toggleCoupon: vi.fn(),
  deleteCoupon: vi.fn(),
}));

import * as couponDb from "./couponDb";

function makeCtx(role: "admin" | "user" | null = null): TrpcContext {
  return {
    user: role
      ? {
          id: 1,
          openId: "test-user",
          email: "test@example.com",
          name: "Test User",
          loginMethod: "manus",
          role,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        }
      : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("coupon.validate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns valid=true with discount info for a valid coupon", async () => {
    vi.mocked(couponDb.validateCoupon).mockResolvedValue({
      valid: true,
      coupon: {
        id: 1,
        code: "CASA98",
        description: "98% off",
        discountType: "percentage",
        discountValue: 98,
        active: true,
        maxUses: null,
        usedCount: 0,
        expiresAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      discountCents: 980,
      finalCents: 20,
    });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.coupon.validate({ code: "CASA98", subtotalCents: 1000 });

    expect(result.valid).toBe(true);
    expect(result.discountCents).toBe(980);
    expect(result.finalCents).toBe(20);
  });

  it("returns valid=false with message for an invalid coupon", async () => {
    vi.mocked(couponDb.validateCoupon).mockResolvedValue({
      valid: false,
      discountCents: 0,
      finalCents: 500,
      message: "Coupon code not found",
    });

    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.coupon.validate({ code: "BADCODE", subtotalCents: 500 });

    expect(result.valid).toBe(false);
    expect(result.message).toBe("Coupon code not found");
  });
});

describe("coupon.list", () => {
  it("returns coupons for admin users", async () => {
    vi.mocked(couponDb.getAllCoupons).mockResolvedValue([]);
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.coupon.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("throws FORBIDDEN for non-admin users", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.coupon.list()).rejects.toThrow("Admin access required");
  });
});

describe("coupon.create", () => {
  it("creates a coupon for admin users", async () => {
    vi.mocked(couponDb.createCoupon).mockResolvedValue(42);
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.coupon.create({
      code: "TEST10",
      discountType: "percentage",
      discountValue: 10,
      active: true,
    });
    expect(result.success).toBe(true);
    expect(result.id).toBe(42);
  });

  it("rejects percentage discount > 100", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    await expect(
      caller.coupon.create({ code: "BAD", discountType: "percentage", discountValue: 101, active: true })
    ).rejects.toThrow("Percentage discount cannot exceed 100%");
  });

  it("throws FORBIDDEN for non-admin users", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(
      caller.coupon.create({ code: "X", discountType: "percentage", discountValue: 10, active: true })
    ).rejects.toThrow("Admin access required");
  });
});

describe("coupon.toggle", () => {
  it("toggles a coupon for admin users", async () => {
    vi.mocked(couponDb.toggleCoupon).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.coupon.toggle({ id: 1, active: false });
    expect(result.success).toBe(true);
  });
});

describe("coupon.delete", () => {
  it("deletes a coupon for admin users", async () => {
    vi.mocked(couponDb.deleteCoupon).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.coupon.delete({ id: 1 });
    expect(result.success).toBe(true);
  });
});
