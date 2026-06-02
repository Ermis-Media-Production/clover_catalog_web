/**
 * Catalog DB helpers — read-only queries for the admin dashboard.
 */

import { desc, eq, sql, count, inArray } from "drizzle-orm";
import { getDb } from "./db";
import {
  cloverCategories,
  cloverItems,
  cloverItemCategories,
  cloverItemModifierGroups,
  cloverItemTags,
  cloverModifierGroups,
  cloverModifiers,
  cloverTags,
  syncLogs,
  orderItems,
} from "../drizzle/schema";

export async function getAllCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cloverCategories).orderBy(cloverCategories.sortOrder, cloverCategories.name);
}

export async function getAllTags() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cloverTags).orderBy(cloverTags.name);
}

export async function getAllModifierGroups() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(cloverModifierGroups).orderBy(cloverModifierGroups.name);
}

export async function getModifiersByGroupId(groupCloverId: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(cloverModifiers)
    .where(eq(cloverModifiers.modifierGroupId, groupCloverId))
    .orderBy(cloverModifiers.name);
}

/** Returns items with their associated category/tag/modifierGroup clover IDs plus modifier details. */
export async function getItemsWithAssociations(opts?: { categoryId?: string; search?: string }) {
  const db = await getDb();
  if (!db) return [];

  // Fetch all items
  const items = await db.select().from(cloverItems).orderBy(cloverItems.name);

  // Fetch all join rows and reference data in bulk
  const [catRows, tagRows, mgRows, allTags, allMgs, allMods] = await Promise.all([
    db.select().from(cloverItemCategories),
    db.select().from(cloverItemTags),
    db.select().from(cloverItemModifierGroups),
    db.select().from(cloverTags),
    db.select().from(cloverModifierGroups),
    db.select().from(cloverModifiers),
  ]);

  // Index by itemCloverId
  const catMap = new Map<string, string[]>();
  for (const r of catRows) {
    if (!catMap.has(r.itemCloverId)) catMap.set(r.itemCloverId, []);
    catMap.get(r.itemCloverId)!.push(r.categoryCloverId);
  }
  const tagIdMap = new Map<string, string[]>();
  for (const r of tagRows) {
    if (!tagIdMap.has(r.itemCloverId)) tagIdMap.set(r.itemCloverId, []);
    tagIdMap.get(r.itemCloverId)!.push(r.tagCloverId);
  }
  const mgIdMap = new Map<string, string[]>();
  for (const r of mgRows) {
    if (!mgIdMap.has(r.itemCloverId)) mgIdMap.set(r.itemCloverId, []);
    mgIdMap.get(r.itemCloverId)!.push(r.modifierGroupCloverId);
  }

  // Build lookup maps for tags and modifier groups
  const tagLookup = new Map(allTags.map((t) => [t.cloverId, t]));
  const mgLookup = new Map(allMgs.map((mg) => [mg.cloverId, mg]));
  // Group modifiers by their group ID
  const modsByGroup = new Map<string, typeof allMods>();
  for (const mod of allMods) {
    if (!modsByGroup.has(mod.modifierGroupId)) modsByGroup.set(mod.modifierGroupId, []);
    modsByGroup.get(mod.modifierGroupId)!.push(mod);
  }

  let result = items.map((item) => {
    const mgIds = mgIdMap.get(item.cloverId) ?? [];
    const modifierGroups = mgIds.map((mgId) => {
      const mg = mgLookup.get(mgId);
      const modifiers = (modsByGroup.get(mgId) ?? []).map((m) => ({
        cloverId: m.cloverId,
        name: m.name,
        price: m.price,
        available: m.available,
      }));
      return {
        cloverId: mgId,
        name: mg?.name ?? mgId,
        minRequired: mg?.minRequired ?? 0,
        maxAllowed: mg?.maxAllowed ?? 0,
        modifiers,
      };
    });

    const tagIdsForItem = tagIdMap.get(item.cloverId) ?? [];
    const tags = tagIdsForItem.map((tid) => ({
      cloverId: tid,
      name: tagLookup.get(tid)?.name ?? tid,
    }));

    return {
      ...item,
      categoryIds: catMap.get(item.cloverId) ?? [],
      tagIds: tagIdsForItem,
      tags,
      modifierGroupIds: mgIds,
      modifierGroups,
    };
  });

  // Filter by category if requested
  if (opts?.categoryId) {
    result = result.filter((i) => i.categoryIds.includes(opts.categoryId!));
  }

  // Filter by search term
  if (opts?.search) {
    const q = opts.search.toLowerCase();
    result = result.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        (i.description ?? "").toLowerCase().includes(q) ||
        (i.sku ?? "").toLowerCase().includes(q)
    );
  }

  return result;
}

/** Update the custom image fields for a single item */
export async function updateItemCustomImage(
  cloverId: string,
  customImageUrl: string,
  customImageKey: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(cloverItems)
    .set({ customImageUrl, customImageKey })
    .where(eq(cloverItems.cloverId, cloverId));
}

/** Clear the custom image fields for a single item */
export async function clearItemCustomImage(cloverId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const rows = await db
    .select({ customImageKey: cloverItems.customImageKey })
    .from(cloverItems)
    .where(eq(cloverItems.cloverId, cloverId))
    .limit(1);
  const key = rows[0]?.customImageKey ?? null;
  await db
    .update(cloverItems)
    .set({ customImageUrl: null, customImageKey: null })
    .where(eq(cloverItems.cloverId, cloverId));
  return key;
}

/** Get a single item by Clover ID */
export async function getItemByCloverId(cloverId: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(cloverItems)
    .where(eq(cloverItems.cloverId, cloverId))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Returns the most frequently ordered items (by order count).
 * Falls back to the top `limit` available items by price if no order history exists.
 */
export async function getPopularItems(limit = 6) {
  const db = await getDb();
  if (!db) return [];

  // Aggregate order_items by itemCloverId to find most ordered
  const popularRows = await db
    .select({
      itemCloverId: orderItems.itemCloverId,
      orderCount: count(orderItems.id).as("orderCount"),
    })
    .from(orderItems)
    .groupBy(orderItems.itemCloverId)
    .orderBy(desc(count(orderItems.id)))
    .limit(limit * 4); // fetch extra to account for hidden/unavailable items

  let popularCloverIds = popularRows.map((r) => r.itemCloverId);

  // If no order history, fall back to top-priced available items
  if (popularCloverIds.length === 0) {
    const fallback = await db
      .select({ cloverId: cloverItems.cloverId })
      .from(cloverItems)
      .where(eq(cloverItems.available, true))
      .orderBy(desc(cloverItems.price))
      .limit(limit * 4);
    popularCloverIds = fallback.map((r) => r.cloverId);
  }

  if (popularCloverIds.length === 0) return [];

  // Fetch full item details
  const items = await db
    .select()
    .from(cloverItems)
    .where(inArray(cloverItems.cloverId, popularCloverIds));

  // Filter out hidden/unavailable, then sort by original popularity order
  const visible = items.filter((i) => !i.hidden && i.available !== false);

  // Sort by original popularity order
  const orderMap = new Map(popularCloverIds.map((id, idx) => [id, idx]));
  visible.sort((a, b) => (orderMap.get(a.cloverId) ?? 999) - (orderMap.get(b.cloverId) ?? 999));

  return visible.slice(0, limit).map((item) => ({
    cloverId: item.cloverId,
    name: item.name,
    price: item.price ?? 0,
    description: item.description ?? null,
    imageUrl: item.customImageUrl ?? item.imageUrl ?? null,
  }));
}

export async function getSyncLogs(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(syncLogs).orderBy(desc(syncLogs.startedAt)).limit(limit);
}

export async function getLastSuccessfulSync() {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(syncLogs)
    .where(eq(syncLogs.status, "success"))
    .orderBy(desc(syncLogs.startedAt))
    .limit(1);
  return rows[0] ?? null;
}
