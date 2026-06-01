import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { getDb } from "./db";
import { orders, orderItems } from "../drizzle/schema";
import type { InsertOrder, InsertOrderItem } from "../drizzle/schema";

export interface CartItem {
  itemCloverId: string;
  itemName: string;
  unitPriceCents: number;
  quantity: number;
  modifiers?: Array<{ name: string; priceCents: number }>;
}

/** Generate a short human-readable order reference */
function generateReference(): string {
  return `ORD-${nanoid(8).toUpperCase()}`;
}

/** Create a new pending order with its line items. Returns the order id and reference. */
export async function createPendingOrder(
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  },
  items: CartItem[]
): Promise<{ id: number; reference: string; totalCents: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const totalCents = items.reduce(
    (sum, item) =>
      sum +
      item.unitPriceCents * item.quantity +
      (item.modifiers ?? []).reduce((ms, m) => ms + m.priceCents, 0) * item.quantity,
    0
  );

  const reference = generateReference();

  const orderValues: InsertOrder = {
    reference,
    status: "pending",
    totalCents,
    customerFirstName: customer.firstName,
    customerLastName: customer.lastName,
    customerEmail: customer.email,
    customerPhone: customer.phone ?? null,
  };

  const [result] = await db.insert(orders).values(orderValues);
  const orderId = (result as any).insertId as number;

  const lineItems: InsertOrderItem[] = items.map((item) => ({
    orderId,
    itemCloverId: item.itemCloverId,
    itemName: item.itemName,
    unitPriceCents: item.unitPriceCents,
    quantity: item.quantity,
    modifiersJson: item.modifiers ? JSON.stringify(item.modifiers) : null,
  }));

  if (lineItems.length > 0) {
    await db.insert(orderItems).values(lineItems);
  }

  return { id: orderId, reference, totalCents };
}

/** Mark an order as paid with Authorize.net transaction details. */
export async function markOrderPaid(
  orderId: number,
  transactionId: string,
  authCode: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(orders)
    .set({ status: "paid", authnetTransactionId: transactionId, authnetAuthCode: authCode })
    .where(eq(orders.id, orderId));
}

/** Mark an order as failed with an error message. */
export async function markOrderFailed(orderId: number, errorMessage: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(orders)
    .set({ status: "failed", paymentError: errorMessage })
    .where(eq(orders.id, orderId));
}

/** Fetch a full order with its line items by reference. */
export async function getOrderByReference(reference: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const orderRows = await db
    .select()
    .from(orders)
    .where(eq(orders.reference, reference))
    .limit(1);

  if (orderRows.length === 0) return null;

  const order = orderRows[0];
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id));

  return {
    ...order,
    items: items.map((item) => ({
      ...item,
      modifiers: item.modifiersJson ? JSON.parse(item.modifiersJson) : [],
    })),
  };
}
