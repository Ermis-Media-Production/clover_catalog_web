/**
 * Checkout router tests
 * These tests cover input validation and error paths without hitting
 * the real Authorize.net API or the database.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mock heavy dependencies so tests stay fast and offline ──────────────────

vi.mock("./authnet", () => ({
  chargeCard: vi.fn().mockResolvedValue({
    success: false,
    errorMessage: "Payment declined (mocked)",
  }),
}));

vi.mock("./orderDb", () => ({
  createPendingOrder: vi.fn().mockResolvedValue({
    id: 1,
    reference: "TEST-REF-001",
    totalCents: 1500,
  }),
  markOrderPaid: vi.fn().mockResolvedValue(undefined),
  markOrderFailed: vi.fn().mockResolvedValue(undefined),
  getOrderByReference: vi.fn().mockResolvedValue(null),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

const validOrder = {
  customer: {
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
  },
  items: [
    {
      itemCloverId: "ITEM001",
      itemName: "Pepperoni Pizza",
      unitPriceCents: 1500,
      quantity: 1,
      modifiers: [],
    },
  ],
  payment: {
    cardNumber: "4111111111111111",
    expirationDate: "12/25",
    cardCode: "123",
  },
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("checkout.placeOrder", () => {
  beforeEach(() => {
    // Ensure env vars are set so the gateway-not-configured guard passes
    process.env.AUTHNET_API_LOGIN_ID = "test-login";
    process.env.AUTHNET_TRANSACTION_KEY = "test-key";
  });

  it("throws BAD_REQUEST when payment is declined", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.checkout.placeOrder(validOrder)).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("throws when items array is empty", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.checkout.placeOrder({ ...validOrder, items: [] })
    ).rejects.toThrow();
  });

  it("throws when customer email is invalid", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.checkout.placeOrder({
        ...validOrder,
        customer: { ...validOrder.customer, email: "not-an-email" },
      })
    ).rejects.toThrow();
  });

  it("throws when card number is too short", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.checkout.placeOrder({
        ...validOrder,
        payment: { ...validOrder.payment, cardNumber: "123" },
      })
    ).rejects.toThrow();
  });

  it("throws INTERNAL_SERVER_ERROR when Authorize.net is not configured", async () => {
    delete process.env.AUTHNET_API_LOGIN_ID;
    delete process.env.AUTHNET_TRANSACTION_KEY;
    const caller = appRouter.createCaller(makeCtx());
    await expect(caller.checkout.placeOrder(validOrder)).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
    });
  });
});

describe("checkout.getOrder", () => {
  it("throws NOT_FOUND when order does not exist", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.checkout.getOrder({ reference: "DOES-NOT-EXIST" })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
