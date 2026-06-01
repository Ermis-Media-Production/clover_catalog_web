/**
 * Tests for the Clover Orders integration helper.
 * Uses vi.stubGlobal to mock fetch so no real HTTP calls are made.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Set required env vars before importing the module
process.env.CLOVER_API_BASE_URL = "https://api.clover.com";
process.env.CLOVER_MERCHANT_ID = "TEST_MERCHANT";
process.env.CLOVER_API_TOKEN = "TEST_TOKEN";

import { createCloverOrder } from "./cloverOrders";

const mockItems = [
  {
    itemCloverId: "ITEM001",
    itemName: "Pepperoni Pizza",
    unitPriceCents: 1599,
    quantity: 1,
    modifiers: [{ name: "Extra Cheese", priceCents: 200 }],
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

describe("createCloverOrder", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("creates an order and returns the cloverOrderId", async () => {
    const fetchMock = makeFetchMock([
      // POST /orders → returns order with id
      { ok: true, json: () => ({ id: "CLV_ORDER_001" }) },
      // POST /bulk_line_items → success
      { ok: true, json: () => ({ items: [] }) },
      // POST /orders/{id} → update total/state
      { ok: true, json: () => ({ id: "CLV_ORDER_001", state: "locked" }) },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const result = await createCloverOrder(mockItems, 4697, "ORD-TESTREF1", "John Doe");

    expect(result.cloverOrderId).toBe("CLV_ORDER_001");
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("sends correct order body with note and total", async () => {
    const fetchMock = makeFetchMock([
      { ok: true, json: () => ({ id: "CLV_ORDER_002" }) },
      { ok: true, json: () => ({}) },
      { ok: true, json: () => ({}) },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    await createCloverOrder(mockItems, 5000, "ORD-TESTREF2", "Jane Smith");

    const firstCallBody = JSON.parse((fetchMock.mock.calls[0] as any)[1].body);
    expect(firstCallBody.state).toBe("open");
    expect(firstCallBody.total).toBe(5000);
    expect(firstCallBody.note).toContain("ORD-TESTREF2");
    expect(firstCallBody.note).toContain("Jane Smith");
  });

  it("expands items with quantity > 1 into multiple line item entries", async () => {
    const fetchMock = makeFetchMock([
      { ok: true, json: () => ({ id: "CLV_ORDER_003" }) },
      { ok: true, json: () => ({}) },
      { ok: true, json: () => ({}) },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    await createCloverOrder(mockItems, 4697, "ORD-TESTREF3", "Test User");

    // Second call is bulk_line_items
    const bulkCallBody = JSON.parse((fetchMock.mock.calls[1] as any)[1].body);
    // mockItems has qty 1 + qty 2 = 3 line item entries
    expect(bulkCallBody.items).toHaveLength(3);
  });

  it("includes modifier price in unit price for line items", async () => {
    const fetchMock = makeFetchMock([
      { ok: true, json: () => ({ id: "CLV_ORDER_004" }) },
      { ok: true, json: () => ({}) },
      { ok: true, json: () => ({}) },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    await createCloverOrder(mockItems, 4697, "ORD-TESTREF4", "Test User");

    const bulkCallBody = JSON.parse((fetchMock.mock.calls[1] as any)[1].body);
    // First item: 1599 + 200 modifier = 1799
    expect(bulkCallBody.items[0].price).toBe(1799);
    // Second item (Buffalo Wings, no modifiers): 1299
    expect(bulkCallBody.items[1].price).toBe(1299);
  });

  it("throws if Clover API returns non-ok on order creation", async () => {
    const fetchMock = makeFetchMock([
      { ok: false, json: () => ({}), text: () => "Unauthorized" },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createCloverOrder(mockItems, 4697, "ORD-FAIL", "Test User")
    ).rejects.toThrow("Clover API error");
  });

  it("throws if Clover does not return an order ID", async () => {
    const fetchMock = makeFetchMock([
      // Returns empty object without id
      { ok: true, json: () => ({}) },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createCloverOrder(mockItems, 4697, "ORD-NOID", "Test User")
    ).rejects.toThrow("Clover did not return an order ID");
  });
});
