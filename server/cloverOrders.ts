/**
 * Clover Orders Integration — Atomic Order Flow
 *
 * Correct order of operations (from WordPress reference integration):
 *   1. POST /atomic_order/orders  — create order with all items + modifications in one payload
 *   2. sleep(2s)                  — Clover processes atomic orders asynchronously; firing
 *                                   print_event immediately races against Clover's internal write
 *   3. POST /print_event          — trigger kitchen/KDS printer BEFORE marking paid
 *                                   (a paid/closed order only prints a payment receipt)
 *   4. POST /orders/{id}/payments — create payment record to mark order as paid externally
 *
 * Required env vars:
 *   CLOVER_API_BASE_URL        — e.g. https://api.clover.com
 *   CLOVER_MERCHANT_ID         — Clover merchant ID
 *   CLOVER_API_TOKEN           — Bearer token
 *   CLOVER_PRINTER_DEVICE_ID   — Device ID of the kitchen printer/KDS (required for print_event)
 *   CLOVER_PAYMENT_TENDER_ID   — Tender ID for marking orders as paid (e.g. "Check", custom online tender)
 *   CLOVER_ORDER_TYPE_ID       — (optional) Default order type ID
 *   CLOVER_EMPLOYEE_ID         — (optional) Employee ID to assign to orders
 */

export interface CloverLineItemInput {
  itemCloverId: string;
  itemName: string;
  unitPriceCents: number;
  quantity: number;
  modifiers?: Array<{ cloverId?: string; name: string; priceCents: number }>;
}

export interface CloverOrderResult {
  cloverOrderId: string;
  printed: boolean;
  paid: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Create a Clover order using the atomic order endpoint, trigger kitchen printing,
 * and mark the order as paid via a payment record.
 *
 * @param items         Cart items with optional modifier Clover IDs
 * @param totalCents    Final total (after discount) in cents
 * @param reference     Local order reference (used in the order note)
 * @param customerName  Customer full name (used in the order note)
 * @returns             Clover order ID, whether print was sent, whether payment was recorded
 */
export async function createCloverOrder(
  items: CloverLineItemInput[],
  totalCents: number,
  reference: string,
  customerName: string,
  specialInstructions?: string,
  customerPhone?: string
): Promise<CloverOrderResult> {
  const mId = merchantId();

  // ── Step 1: Build lineItems for the atomic order payload ──────────────────
  // Each item with qty > 1 is repeated N times (Clover atomic order convention)
  const lineItems: Array<Record<string, unknown>> = [];

  for (const item of items) {
    // Build modifications array — include Clover modifier ID when available
    const modifications: Array<Record<string, unknown>> = [];
    for (const mod of item.modifiers ?? []) {
      const entry: Record<string, unknown> = {
        name: mod.name,
        amount: mod.priceCents,
      };
      if (mod.cloverId) {
        entry.modifier = { id: mod.cloverId };
      }
      modifications.push(entry);
    }

    const lineItem: Record<string, unknown> = {
      name: item.itemName,
      price: item.unitPriceCents,
    };

    // Link to Clover catalog item so it appears on kitchen ticket
    if (item.itemCloverId) {
      lineItem.item = { id: item.itemCloverId };
    }

    if (modifications.length > 0) {
      lineItem.modifications = modifications;
    }

    // Repeat for quantity
    for (let i = 0; i < item.quantity; i++) {
      lineItems.push(lineItem);
    }
  }

  // ── Step 2: Build orderCart ───────────────────────────────────────────────
  // Build a rich note so kitchen staff can immediately identify web orders
  const noteParts: string[] = [
    `🌐 ONLINE ORDER — casadepizzawingslv.com`,
    `Ref: ${reference}`,
    `Cliente: ${customerName}`,
  ];
  if (customerPhone && customerPhone.trim()) {
    noteParts.push(`Tel: ${customerPhone.trim()}`);
  }
  if (specialInstructions && specialInstructions.trim()) {
    noteParts.push(`Nota: ${specialInstructions.trim()}`);
  }
  const note = noteParts.join(" | ");

  const orderCart: Record<string, unknown> = {
    lineItems,
    note,
    total: totalCents,
  };

  // Optional: assign order type
  const orderTypeId = process.env.CLOVER_ORDER_TYPE_ID ?? "";
  if (orderTypeId) {
    orderCart.orderType = { id: orderTypeId };
  }

  // Optional: assign employee
  const employeeId = process.env.CLOVER_EMPLOYEE_ID ?? "";
  if (employeeId) {
    orderCart.employee = { id: employeeId };
  }

  // ── Step 3: POST /atomic_order/orders ─────────────────────────────────────
  const atomicResponse = await cloverPost<{ id?: string }>(
    `/v3/merchants/${mId}/atomic_order/orders`,
    { orderCart }
  );

  const cloverOrderId = atomicResponse.id;
  if (!cloverOrderId) {
    throw new Error("Clover atomic order did not return an order ID");
  }

  console.log(`[Clover] Atomic order created: ${cloverOrderId} for ${reference}`);

  // ── Step 4: Wait 2 seconds ────────────────────────────────────────────────
  // Clover processes atomic orders asynchronously. Firing print_event immediately
  // can race against Clover's internal write — the device receives the job before
  // the ticket is fully renderable and silently drops it.
  await sleep(2000);

  // ── Step 5: POST /print_event — BEFORE marking as paid ───────────────────
  // A paid/closed order only prints a payment receipt (shows only first item).
  // Printing while the order is still open guarantees all line items appear on
  // the kitchen ticket.
  let printed = false;
  const printerDeviceId = process.env.CLOVER_PRINTER_DEVICE_ID ?? "";

  if (printerDeviceId) {
    try {
      const printPayload: Record<string, unknown> = {
        orderRef: { id: cloverOrderId },
        deviceRef: { id: printerDeviceId },
      };

      await cloverPost(`/v3/merchants/${mId}/print_event`, printPayload);
      printed = true;
      console.log(`[Clover] print_event sent for order ${cloverOrderId} to device ${printerDeviceId}`);
    } catch (err) {
      // Non-fatal: log but continue to payment step
      console.error(`[Clover] print_event failed for ${cloverOrderId}:`, err);
    }
  } else {
    console.warn(`[Clover] CLOVER_PRINTER_DEVICE_ID not set — print_event skipped for ${cloverOrderId}`);
  }

  // ── Step 6: POST /orders/{id}/payments — mark as paid ────────────────────
  let paid = false;
  const tenderId = process.env.CLOVER_PAYMENT_TENDER_ID ?? "";

  if (tenderId) {
    try {
      await cloverPost(`/v3/merchants/${mId}/orders/${cloverOrderId}/payments`, {
        amount: totalCents,
        tender: { id: tenderId },
      });
      paid = true;
      console.log(`[Clover] Order ${cloverOrderId} marked as paid (tender: ${tenderId})`);
    } catch (err) {
      // Non-fatal: log but don't fail the checkout
      console.error(`[Clover] Payment record failed for ${cloverOrderId}:`, err);
    }
  } else {
    console.warn(`[Clover] CLOVER_PAYMENT_TENDER_ID not set — order ${cloverOrderId} will be UNPAID in Clover`);
  }

  return { cloverOrderId, printed, paid };
}
