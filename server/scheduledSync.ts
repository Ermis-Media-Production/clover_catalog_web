/**
 * Scheduled sync handler — called by the Manus Heartbeat cron job every 30 min.
 * Mounted at POST /api/scheduled/clover-sync
 */

import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { sdk } from "./_core/sdk";
import { runCloverSyncWithLog } from "./cloverSync";
import { getDb } from "./db";
import { appSettings } from "../drizzle/schema";

const SYNC_SCHEDULE_KEY = "clover_sync_task_uid";

export async function scheduledSyncHandler(req: Request, res: Response) {
  let taskUid: string | null = null;
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }
    taskUid = user.taskUid;

    // Validate the task UID matches our stored job — prevents orphan retries
    const db = await getDb();
    if (db) {
      const rows = await db.select().from(appSettings)
        .where(eq(appSettings.key, SYNC_SCHEDULE_KEY)).limit(1);
      const storedUid = rows[0]?.value ?? null;
      if (storedUid && storedUid !== taskUid) {
        // This is a stale/orphaned cron — acknowledge with 2xx so forge stops retrying
        return res.json({ ok: true, skipped: "orphan", taskUid });
      }
    }

    await runCloverSyncWithLog();

    return res.json({ ok: true, taskUid });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[scheduled-sync] error:", message);
    return res.status(500).json({
      error: message,
      stack,
      context: { url: req.url, taskUid },
      timestamp: new Date().toISOString(),
    });
  }
}
