/**
 * Clover Catalog Sync Engine
 * Fetches categories, tags, modifier groups, modifiers, and items from the
 * Clover REST API and upserts them into the local database.
 */

import { eq, inArray, notInArray, sql } from "drizzle-orm";
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

// ─── Clover API Client ────────────────────────────────────────────────────────

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

async function cloverGet<T>(path: string): Promise<T> {
  const url = `${cloverBaseUrl()}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiToken()}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Clover API error ${res.status} for ${path}: ${body}`);
  }
  return res.json() as Promise<T>;
}

/** Paginate through all elements of a Clover collection endpoint. */
async function cloverGetAll<T>(basePath: string, limit = 200): Promise<T[]> {
  const results: T[] = [];
  let offset = 0;
  while (true) {
    const sep = basePath.includes("?") ? "&" : "?";
    const data = await cloverGet<{ elements?: T[] }>(`${basePath}${sep}limit=${limit}&offset=${offset}`);
    const elements = data.elements ?? [];
    results.push(...elements);
    if (elements.length < limit) break;
    offset += limit;
  }
  return results;
}

// ─── Clover API Types ─────────────────────────────────────────────────────────

interface CloverCategory {
  id: string;
  name: string;
  sortOrder?: number;
}

interface CloverTag {
  id: string;
  name: string;
  showInReporting?: boolean;
}

interface CloverModifier {
  id: string;
  name: string;
  price?: number;
  available?: boolean;
}

interface CloverModifierGroup {
  id: string;
  name: string;
  minRequired?: number;
  maxAllowed?: number;
  showByDefault?: boolean;
  modifiers?: { elements?: CloverModifier[] };
}

interface CloverItemImage {
  url?: string;
}

interface CloverItem {
  id: string;
  name: string;
  price?: number;
  cost?: number;
  description?: string;
  sku?: string;
  hidden?: boolean;
  available?: boolean;
  stockCount?: number;
  itemStock?: { stockCount?: number };
  categories?: { elements?: CloverCategory[] };
  tags?: { elements?: CloverTag[] };
  modifierGroups?: { elements?: CloverModifierGroup[] };
  imageFilename?: string;
  images?: { elements?: CloverItemImage[] };
}

// ─── Sync Runner ──────────────────────────────────────────────────────────────

export interface SyncResult {
  itemsSynced: number;
  categoriesSynced: number;
  tagsSynced: number;
  modifiersSynced: number;
}

export async function runCloverSync(): Promise<SyncResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const mId = merchantId();

  // ── 1. Categories ──────────────────────────────────────────────────────────
  const rawCategories = await cloverGetAll<CloverCategory>(`/v3/merchants/${mId}/categories`);
  for (const cat of rawCategories) {
    await db
      .insert(cloverCategories)
      .values({
        cloverId: cat.id,
        name: cat.name,
        sortOrder: cat.sortOrder ?? 0,
      })
      .onDuplicateKeyUpdate({
        set: { name: cat.name, sortOrder: cat.sortOrder ?? 0 },
      });
  }

  // ── 2. Tags ────────────────────────────────────────────────────────────────
  const rawTags = await cloverGetAll<CloverTag>(`/v3/merchants/${mId}/tags`);
  for (const tag of rawTags) {
    await db
      .insert(cloverTags)
      .values({
        cloverId: tag.id,
        name: tag.name,
        showInReporting: tag.showInReporting ?? false,
      })
      .onDuplicateKeyUpdate({
        set: { name: tag.name, showInReporting: tag.showInReporting ?? false },
      });
  }

  // ── 3. Modifier Groups + Modifiers ─────────────────────────────────────────
  const rawModGroups = await cloverGetAll<CloverModifierGroup>(
    `/v3/merchants/${mId}/modifier_groups?expand=modifiers`
  );
  let modifiersSynced = 0;
  for (const mg of rawModGroups) {
    await db
      .insert(cloverModifierGroups)
      .values({
        cloverId: mg.id,
        name: mg.name,
        minRequired: mg.minRequired ?? 0,
        maxAllowed: mg.maxAllowed ?? 0,
        showByDefault: mg.showByDefault ?? false,
      })
      .onDuplicateKeyUpdate({
        set: {
          name: mg.name,
          minRequired: mg.minRequired ?? 0,
          maxAllowed: mg.maxAllowed ?? 0,
          showByDefault: mg.showByDefault ?? false,
        },
      });

    const modifiers = mg.modifiers?.elements ?? [];
    for (const mod of modifiers) {
      await db
        .insert(cloverModifiers)
        .values({
          cloverId: mod.id,
          modifierGroupId: mg.id,
          name: mod.name,
          price: mod.price ?? 0,
          available: mod.available ?? true,
        })
        .onDuplicateKeyUpdate({
          set: {
            name: mod.name,
            price: mod.price ?? 0,
            available: mod.available ?? true,
          },
        });
      modifiersSynced++;
    }
  }

  // ── 4. Items with all expansions ───────────────────────────────────────────
  const rawItems = await cloverGetAll<CloverItem>(
    `/v3/merchants/${mId}/items?expand=categories&expand=tags&expand=modifierGroups&expand=itemStock&expand=images`
  );

  const seenItemIds: string[] = [];

  for (const item of rawItems) {
    const imageUrl =
      item.images?.elements?.[0]?.url ??
      (item.imageFilename ? `https://www.clover.com/img/${item.imageFilename}` : null);

    const stockCount =
      item.itemStock?.stockCount ?? item.stockCount ?? null;

    await db
      .insert(cloverItems)
      .values({
        cloverId: item.id,
        name: item.name,
        price: item.price ?? 0,
        cost: item.cost ?? 0,
        description: item.description ?? null,
        sku: item.sku ?? null,
        hidden: item.hidden ?? false,
        available: item.available ?? true,
        stockCount,
        imageUrl,
      })
      .onDuplicateKeyUpdate({
        set: {
          name: item.name,
          price: item.price ?? 0,
          cost: item.cost ?? 0,
          description: item.description ?? null,
          sku: item.sku ?? null,
          hidden: item.hidden ?? false,
          available: item.available ?? true,
          stockCount,
          imageUrl,
        },
      });

    seenItemIds.push(item.id);

    // ── Item ↔ Category associations ─────────────────────────────────────────
    await db.delete(cloverItemCategories).where(eq(cloverItemCategories.itemCloverId, item.id));
    const cats = item.categories?.elements ?? [];
    for (const cat of cats) {
      await db
        .insert(cloverItemCategories)
        .values({ itemCloverId: item.id, categoryCloverId: cat.id })
        .onDuplicateKeyUpdate({ set: { itemCloverId: item.id } });
    }

    // ── Item ↔ Tag associations ───────────────────────────────────────────────
    await db.delete(cloverItemTags).where(eq(cloverItemTags.itemCloverId, item.id));
    const tags = item.tags?.elements ?? [];
    for (const tag of tags) {
      await db
        .insert(cloverItemTags)
        .values({ itemCloverId: item.id, tagCloverId: tag.id })
        .onDuplicateKeyUpdate({ set: { itemCloverId: item.id } });
    }

    // ── Item ↔ Modifier Group associations ────────────────────────────────────
    await db.delete(cloverItemModifierGroups).where(eq(cloverItemModifierGroups.itemCloverId, item.id));
    const mgs = item.modifierGroups?.elements ?? [];
    for (const mg of mgs) {
      await db
        .insert(cloverItemModifierGroups)
        .values({ itemCloverId: item.id, modifierGroupCloverId: mg.id })
        .onDuplicateKeyUpdate({ set: { itemCloverId: item.id } });
    }
  }

  return {
    itemsSynced: rawItems.length,
    categoriesSynced: rawCategories.length,
    tagsSynced: rawTags.length,
    modifiersSynced,
  };
}

// ─── Sync with Log ────────────────────────────────────────────────────────────

export async function runCloverSyncWithLog(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Create a running log entry
  const [inserted] = await db.insert(syncLogs).values({
    status: "running",
  });
  const logId = (inserted as any).insertId as number;

  try {
    const result = await runCloverSync();
    await db
      .update(syncLogs)
      .set({
        status: "success",
        finishedAt: new Date(),
        itemsSynced: result.itemsSynced,
        categoriesSynced: result.categoriesSynced,
        tagsSynced: result.tagsSynced,
        modifiersSynced: result.modifiersSynced,
      })
      .where(eq(syncLogs.id, logId));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await db
      .update(syncLogs)
      .set({
        status: "error",
        finishedAt: new Date(),
        errorMessage: msg,
      })
      .where(eq(syncLogs.id, logId));
    throw err;
  }
}
