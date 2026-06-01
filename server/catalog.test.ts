import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("./catalogDb", () => ({
  getAllCategories: vi.fn().mockResolvedValue([
    { id: 1, cloverId: "CAT1", name: "Drinks", sortOrder: 0 },
  ]),
  getAllTags: vi.fn().mockResolvedValue([
    { id: 1, cloverId: "TAG1", name: "Vegan", showInReporting: true },
  ]),
  getAllModifierGroups: vi.fn().mockResolvedValue([
    { id: 1, cloverId: "MG1", name: "Size", minRequired: 1, maxAllowed: 1 },
  ]),
  getModifiersByGroupId: vi.fn().mockResolvedValue([
    { id: 1, cloverId: "MOD1", modifierGroupId: "MG1", name: "Large", price: 100 },
  ]),
  getItemsWithAssociations: vi.fn().mockResolvedValue([
    {
      id: 1,
      cloverId: "ITEM1",
      name: "Latte",
      price: 500,
      cost: 150,
      description: "Espresso with milk",
      sku: "LAT-001",
      hidden: false,
      available: true,
      stockCount: null,
      imageUrl: null,
      categoryIds: ["CAT1"],
      tagIds: ["TAG1"],
      modifierGroupIds: ["MG1"],
    },
  ]),
  getSyncLogs: vi.fn().mockResolvedValue([
    {
      id: 1,
      startedAt: new Date("2026-01-01T10:00:00Z"),
      finishedAt: new Date("2026-01-01T10:00:05Z"),
      status: "success",
      itemsSynced: 10,
      categoriesSynced: 3,
      tagsSynced: 2,
      modifiersSynced: 5,
      errorMessage: null,
    },
  ]),
  getLastSuccessfulSync: vi.fn().mockResolvedValue({
    id: 1,
    startedAt: new Date("2026-01-01T10:00:00Z"),
    finishedAt: new Date("2026-01-01T10:00:05Z"),
    status: "success",
    itemsSynced: 10,
    categoriesSynced: 3,
    tagsSynced: 2,
    modifiersSynced: 5,
    errorMessage: null,
  }),
}));

vi.mock("./cloverSync", () => ({
  runCloverSyncWithLog: vi.fn().mockResolvedValue(undefined),
}));

// ── Context helpers ────────────────────────────────────────────────────────────

function makeCtx(role: "admin" | "user" | null = null): TrpcContext {
  const user =
    role === null
      ? null
      : {
          id: 1,
          openId: "test-user",
          email: "test@example.com",
          name: "Test User",
          loginMethod: "manus",
          role,
          createdAt: new Date(),
          updatedAt: new Date(),
          lastSignedIn: new Date(),
        };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("catalog.getCategories", () => {
  it("returns categories for public access", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    const result = await caller.catalog.getCategories();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Drinks");
  });
});

describe("catalog.getTags", () => {
  it("returns tags for public access", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    const result = await caller.catalog.getTags();
    expect(result[0].name).toBe("Vegan");
  });
});

describe("catalog.getItems", () => {
  it("returns items with associations", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    const result = await caller.catalog.getItems({});
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Latte");
    expect(result[0].categoryIds).toContain("CAT1");
    expect(result[0].tagIds).toContain("TAG1");
    expect(result[0].modifierGroupIds).toContain("MG1");
  });
});

describe("catalog.getSyncLogs", () => {
  it("returns sync log entries", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    const result = await caller.catalog.getSyncLogs({ limit: 10 });
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("success");
    expect(result[0].itemsSynced).toBe(10);
  });
});

describe("catalog.syncNow", () => {
  it("allows admin to trigger sync", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.catalog.syncNow();
    expect(result.ok).toBe(true);
  });

  it("rejects non-admin users", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.catalog.syncNow()).rejects.toThrow(TRPCError);
  });

  it("rejects unauthenticated access", async () => {
    const caller = appRouter.createCaller(makeCtx(null));
    await expect(caller.catalog.syncNow()).rejects.toThrow(TRPCError);
  });
});
