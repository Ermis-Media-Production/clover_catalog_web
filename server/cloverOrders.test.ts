/**
 * Tests for the Clover Orders integration — atomic order flow.
 * Uses vi.stubGlobal to mock fetch so no real HTTP calls are made.
 * Also mocks setTimeout so sleep(2000) resolves instantly in tests.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Set required env vars before importing the module
process.env.CLOVER_API_BASE_URL = "https://api.clover.com";
process.env.CLOVER_MERCHANT_ID = "TEST_MERCHANT";
process.env.CLOVER_API_TOKEN = "TEST_TOKEN";
process.env.CLOVER_PRINTER_DEVICE_ID = "DEVICE_001";
process.env.CLOVER_PAYMENT_TENDER_ID = "TENDER_001";
process.env.CLOVER_ORDER_TYPE_ID = "ORDER_TYPE_001";
process.env.CLOVER_EMPLOYEE_ID = "EMP_001";

import { createCloverOrder } from "./cloverOrders";

const mockItems = [
  {
    itemCloverId: "ITEM001",
    itemName: "Pepperoni Pizza",
    unitPriceCents: 1599,
    quantity: 1,
    modifiers: [{ cloverId: "MOD001", name: "Extra Cheese", priceCents: 200 }],
  },
  {
    itemCloverId: "ITEM002",
    itemName: "Buffalo Wings",
    unitPriceCents: 1299,
    quantity: 2,
  },
];

function makeFetchMock(responses: Array<{ ok: boolean; json: () => unknown; text?: () => string }>) {
  let callIndex = 0;
  return vi.fn(async () => {
    const resp = responses[callIndex] ?? responses[responses.length - 1];
    callIndex++;
    return {
      ok: resp.ok,
      json: async () => resp.json(),
      text: async () => resp.text?.() ?? "",
    };
  });
}

describe("createCloverOrder — atomic order flow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Mock setTimeout so sleep(2000) resolves instantly
    vi.stubGlobal("setTimeout", (fn: () => void) => { fn(); return 0; });
  });

  it("calls atomic_order endpoint and returns cloverOrderId", async () => {
    const fetchMock = makeFetchMock([
      // POST /atomic_order/orders
      { ok: true, json: () => ({ id: "CLV_ATOMIC_001" }) },
      // POST /print_event
      { ok: true, json: () => ({}) },
      // POST /orders/{id}/payments
      { ok: true, json: () => ({}) },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const result = await createCloverOrder(mockItems, 4697, "ORD-001", "John Doe");

    expect(result.cloverOrderId).toBe("CLV_ATOMIC_001");
    expect(result.printed).toBe(true);
    expect(result.paid).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("uses /atomic_order/orders endpoint (not /orders)", async () => {
    const fetchMock = makeFetchMock([
      { ok: true, json: () => ({ id: "CLV_ATOMIC_002" }) },
      { ok: true, json: () => ({}) },
      { ok: true, json: () => ({}) },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    await createCloverOrder(mockItems, 4697, "ORD-002", "Jane Smith");

    const firstCallUrl = (fetchMock.mock.calls[0] as any)[0];
    expect(firstCallUrl).toContain("/atomic_order/orders");
  });

  it("sends orderCart with lineItems, note, total, orderType, and employee", async () => {
    const fetchMock = makeFetchMock([
      { ok: true, json: () => ({ id: "CLV_ATOMIC_003" }) },
      { ok: true, json: () => ({}) },
      { ok: true, json: () => ({}) },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    await createCloverOrder(mockItems, 5000, "ORD-003", "Test User");

    const body = JSON.parse((fetchMock.mock.calls[0] as any)[1].body);
    expect(body.orderCart).toBeDefined();
    expect(body.orderCart.lineItems).toBeDefined();
    expect(body.orderCart.note).toContain("ORD-003");
    expect(body.orderCart.note).toContain("Test User");
    expect(body.orderCart.total).toBe(5000);
    expect(body.orderCart.orderType).toEqual({ id: "ORDER_TYPE_001" });
    expect(body.orderCart.employee).toEqual({ id: "EMP_001" });
  });

  it("expands items with quantity > 1 into multiple lineItem entries", async () => {
    const fetchMock = makeFetchMock([
      { ok: true, json: () => ({ id: "CLV_ATOMIC_004" }) },
      { ok: true, json: () => ({}) },
      { ok: true, json: () => ({}) },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    await createCloverOrder(mockItems, 4697, "ORD-004", "Test User");

    const body = JSON.parse((fetchMock.mock.calls[0] as any)[1].body);
    // qty 1 + qty 2 = 3 line items
    expect(body.orderCart.lineItems).toHaveLength(3);
  });

  it("includes modifications with modifier.id and amount in lineItems", async () => {
    const fetchMock = makeFetchMock([
      { ok: true, json: () => ({ id: "CLV_ATOMIC_005" }) },
      { ok: true, json: () => ({}) },
      { ok: true, json: () => ({}) },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    await createCloverOrder(mockItems, 4697, "ORD-005", "Test User");

    const body = JSON.parse((fetchMock.mock.calls[0] as any)[1].body);
    const firstItem = body.orderCart.lineItems[0];
    expect(firstItem.modifications).toHaveLength(1);
    expect(firstItem.modifications[0].modifier).toEqual({ id: "MOD001" });
    expect(firstItem.modifications[0].amount).toBe(200);
    expect(firstItem.modifications[0].name).toBe("Extra Cheese");
  });

  it("sends print_event to the correct device BEFORE payment", async () => {
    const callOrder: string[] = [];
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("atomic_order")) callOrder.push("atomic");
      else if (url.includes("print_event")) callOrder.push("print");
      else if (url.includes("payments")) callOrder.push("payment");
      return { ok: true, json: async () => ({ id: "CLV_ATOMIC_006" }), text: async () => "" };
    });
    vi.stubGlobal("fetch", fetchMock);

    await createCloverOrder(mockItems, 4697, "ORD-006", "Test User");

    expect(callOrder).toEqual(["atomic", "print", "payment"]);

    // Verify print_event payload
    const printCall = (fetchMock.mock.calls as any[]).find((c) => c[0].includes("print_event"));
    expect(printCall).toBeDefined();
    const printBody = JSON.parse(printCall[1].body);
    expect(printBody.orderRef.id).toBe("CLV_ATOMIC_006");
    expect(printBody.deviceRef.id).toBe("DEVICE_001");
  });

  it("sends payment with correct amount and tender ID", async () => {
    const fetchMock = makeFetchMock([
      { ok: true, json: () => ({ id: "CLV_ATOMIC_007" }) },
      { ok: true, json: () => ({}) },
      { ok: true, json: () => ({}) },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    await createCloverOrder(mockItems, 3999, "ORD-007", "Test User");

    const paymentCall = (fetchMock.mock.calls as any[])[2];
    expect(paymentCall[0]).toContain("/payments");
    const paymentBody = JSON.parse(paymentCall[1].body);
    expect(paymentBody.amount).toBe(3999);
    expect(paymentBody.tender.id).toBe("TENDER_001");
  });

  it("throws if atomic_order API returns non-ok", async () => {
    const fetchMock = makeFetchMock([
      { ok: false, json: () => ({}), text: () => "Unauthorized" },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createCloverOrder(mockItems, 4697, "ORD-FAIL", "Test User")
    ).rejects.toThrow("Clover API error");
  });

  it("throws if atomic_order does not return an order ID", async () => {
    const fetchMock = makeFetchMock([
      { ok: true, json: () => ({}) },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createCloverOrder(mockItems, 4697, "ORD-NOID", "Test User")
    ).rejects.toThrow("Clover atomic order did not return an order ID");
  });

  it("continues (printed=false) if print_event fails without throwing", async () => {
    const fetchMock = makeFetchMock([
      { ok: true, json: () => ({ id: "CLV_ATOMIC_008" }) },
      // print_event fails
      { ok: false, json: () => ({}), text: () => "Device not found" },
      // payment still succeeds
      { ok: true, json: () => ({}) },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const result = await createCloverOrder(mockItems, 4697, "ORD-PRINT-FAIL", "Test User");

    expect(result.cloverOrderId).toBe("CLV_ATOMIC_008");
    expect(result.printed).toBe(false);
    expect(result.paid).toBe(true);
  });
});
