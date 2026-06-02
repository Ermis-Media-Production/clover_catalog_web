import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { parse as parseCookie } from "cookie";
import { COOKIE_NAME } from "@shared/const";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  getAllCategories,
  getAllTags,
  getAllModifierGroups,
  getModifiersByGroupId,
  getItemsWithAssociations,
  getSyncLogs,
  getLastSuccessfulSync,
  getPopularItems,
} from "../catalogDb";
import { runCloverSyncWithLog } from "../cloverSync";
import { createHeartbeatJob, deleteHeartbeatJob } from "../_core/heartbeat";
import { getDb } from "../db";
import { appSettings } from "../../drizzle/schema";

const SYNC_SCHEDULE_KEY = "clover_sync_task_uid";

async function getSyncTaskUid(): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(appSettings).where(eq(appSettings.key, SYNC_SCHEDULE_KEY)).limit(1);
  return rows[0]?.value ?? null;
}

async function setSyncTaskUid(uid: string | null): Promise<void> {
  const db = await getDb();
  if (!db) return;
  if (uid === null) {
    await db.delete(appSettings).where(eq(appSettings.key, SYNC_SCHEDULE_KEY));
  } else {
    await db.insert(appSettings).values({ key: SYNC_SCHEDULE_KEY, value: uid })
      .onDuplicateKeyUpdate({ set: { value: uid } });
  }
}

export const catalogRouter = router({
  /** List all categories */
  getCategories: publicProcedure.query(() => getAllCategories()),

  /** Most popular items based on order frequency (with fallback to top-priced items) */
  getPopularItems: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(12).default(6) }).optional())
    .query(({ input }) => getPopularItems(input?.limit ?? 6)),

  /** List all tags */
  getTags: publicProcedure.query(() => getAllTags()),

  /** List all modifier groups */
  getModifierGroups: publicProcedure.query(() => getAllModifierGroups()),

  /** Modifiers for a specific group */
  getModifiers: publicProcedure
    .input(z.object({ groupCloverId: z.string() }))
    .query(({ input }) => getModifiersByGroupId(input.groupCloverId)),

  /** Items with optional category filter and search */
  getItems: publicProcedure
    .input(
      z.object({
        categoryId: z.string().optional(),
        search: z.string().optional(),
      })
    )
    .query(({ input }) => getItemsWithAssociations(input)),

  /** Sync logs (last N entries) */
  getSyncLogs: publicProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(20) }))
    .query(({ input }) => getSyncLogs(input.limit)),

  /** Last successful sync summary */
  getLastSync: publicProcedure.query(() => getLastSuccessfulSync()),

  /** Whether a scheduled sync is currently active */
  getScheduleStatus: publicProcedure.query(async () => {
    const uid = await getSyncTaskUid();
    return { active: uid !== null, taskUid: uid };
  }),

  /** Trigger a manual sync — admin only */
  syncNow: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    await runCloverSyncWithLog();
    return { ok: true };
  }),

  /** Enable automatic scheduled sync every 30 minutes — admin only */
  setupScheduledSync: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    // Cancel any existing job first
    const existing = await getSyncTaskUid();
    if (existing) {
      const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
      try {
        await deleteHeartbeatJob(existing, sessionToken);
      } catch {
        // Ignore if already gone
      }
    }
    const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
    const job = await createHeartbeatJob(
      {
        name: "clover-catalog-sync",
        cron: "0 */30 * * * *", // every 30 minutes
        path: "/api/scheduled/clover-sync",
        payload: {},
        description: "Automatic Clover catalog sync every 30 minutes",
      },
      sessionToken
    );
    await setSyncTaskUid(job.taskUid);
    return { ok: true, taskUid: job.taskUid };
  }),

  /** Disable automatic scheduled sync — admin only */
  cancelScheduledSync: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
    }
    const uid = await getSyncTaskUid();
    if (!uid) return { ok: true, skipped: true };
    const sessionToken = parseCookie(ctx.req.headers.cookie ?? "")[COOKIE_NAME] ?? "";
    await deleteHeartbeatJob(uid, sessionToken);
    await setSyncTaskUid(null);
    return { ok: true, skipped: false };
  }),
});
