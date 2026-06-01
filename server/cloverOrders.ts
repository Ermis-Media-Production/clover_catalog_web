/**
 * Clover Orders Integration
 *
 * Creates an order in the Clover POS system after a successful payment.
 * Uses the Clover REST API v3:
 *   POST /v3/merchants/{mId}/orders          — create order (state: open)
 *   POST /v3/merchants/{mId}/orders/{id}/bulk_line_items — add all items
 *   POST /v3/merchants/{mId}/orders/{id}     — update total & mark paid
 */

interface CloverLineItemInput {
  itemCloverId: string;
  itemName: string;
  unitPriceCents: number;
  quantity: number;
  modifiers?: Array<{ name: string; priceCents: number }>;
}

interface CloverOrderResult {
  cloverOrderId: string;
}

function cloverBaseUrl(): string {
  return (process.env.CLOVER_API_BASE_URL ?? "https://api.clover.com").replace(/\/$/, "");
}

function merchantId(): string {
  const mid = process.env.CLOVER_MERCHANT_ID ?? "";
  if (!mid) throw new Error("CLOVER_MERCHANT_ID is not set");
  return mid;
}

function apiToken(): string {
  const token = process.env.CLOVER_API_TOKEN ?? "";
  if (!token) throw new Error("CLOVER_API_TOKEN is not set");
  return token;
}

async function cloverPost<T>(path: string, body: unknown): Promise<T> {
  const url = `${cloverBaseUrl()}${path}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Clover API error ${res.status} for POST ${path}: ${text}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Create a Clover order with all line items and mark it as paid.
 *
 * @param items         Cart items with modifiers
 * @param totalCents    Final total (after discount) in cents
 * @param reference     Local order reference (used as note)
 * @param customerName  Customer full name (used as order note)
 * @returns             The Clover order ID
 */
export async function createCloverOrder(
  items: CloverLineItemInput[],
  totalCents: number,
  reference: string,
  customerName: string
): Promise<CloverOrderResult> {
  const mId = merchantId();

  // Step 1: Create the order in "open" state
  const orderBody: Record<string, unknown> = {
    state: "open",
    currency: "USD",
    total: totalCents,
    note: `Online order ${reference} — ${customerName}`,
    manualTransaction: false,
  };

  const createdOrder = await cloverPost<{ id: string }>(
    `/v3/merchants/${mId}/orders`,
    orderBody
  );

  const cloverOrderId = createdOrder.id;
  if (!cloverOrderId) {
    throw new Error("Clover did not return an order ID");
  }

  // Step 2: Add all line items using bulk_line_items
  // Each item with quantity > 1 is expanded into individual entries
  // because Clover's bulk endpoint expects one entry per unit
  const lineItemEntries: Array<Record<string, unknown>> = [];

  for (const item of items) {
    // Build modifier note string if any modifiers exist
    const modNote =
      item.modifiers && item.modifiers.length > 0
        ? item.modifiers.map((m) => m.name).join(", ")
        : undefined;

    // Calculate the unit price including modifiers
    const modifierTotal = (item.modifiers ?? []).reduce(
      (sum, m) => sum + m.priceCents,
      0
    );
    const unitPriceWithMods = item.unitPriceCents + modifierTotal;

    for (let i = 0; i < item.quantity; i++) {
      const entry: Record<string, unknown> = {
        name: item.itemName,
        price: unitPriceWithMods,
        unitQty: 1,
      };

      // If the item has a Clover inventory ID, reference it
      if (item.itemCloverId && item.itemCloverId.length > 0) {
        entry.item = { id: item.itemCloverId };
      }

      if (modNote) {
        entry.note = modNote;
      }

      lineItemEntries.push(entry);
    }
  }

  if (lineItemEntries.length > 0) {
    await cloverPost(
      `/v3/merchants/${mId}/orders/${cloverOrderId}/bulk_line_items`,
      { items: lineItemEntries }
    );
  }

  // Step 3: Update the order total and mark it as paid
  // We set manualTransaction=true to indicate this was paid externally (via Authorize.net)
  await cloverPost(`/v3/merchants/${mId}/orders/${cloverOrderId}`, {
    state: "locked",
    total: totalCents,
    manualTransaction: true,
  });

  return { cloverOrderId };
}
