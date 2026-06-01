/**
 * Catalog DB helpers — read-only queries for the admin dashboard.
 */

import { desc, eq, sql } from "drizzle-orm";
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
