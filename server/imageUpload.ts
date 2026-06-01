/**
 * Image upload handler for admin — POST /api/items/:cloverId/image
 * Accepts a multipart file upload (field name: "image"), stores it in S3,
 * and updates the clover_items row with the new URL and key.
 *
 * DELETE /api/items/:cloverId/image — removes the custom image.
 */

import { Request, Response, Router } from "express";
import multer from "multer";
import { storagePut } from "./storage";
import { clearItemCustomImage, getItemByCloverId, updateItemCustomImage } from "./catalogDb";

// Store uploads in memory (max 8 MB per file)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

export function registerImageUploadRoutes(router: Router) {
  // Upload or replace a custom image for an item
  router.post(
    "/api/items/:cloverId/image",
    upload.single("image"),
    async (req: Request, res: Response) => {
      try {
        const { cloverId } = req.params;
        const file = req.file;

        if (!file) {
          res.status(400).json({ error: "No image file provided" });
          return;
        }

        // Verify item exists
        const item = await getItemByCloverId(cloverId);
        if (!item) {
          res.status(404).json({ error: "Item not found" });
          return;
        }

        // Determine extension from mimetype
        const ext = file.mimetype.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
        const relKey = `item-images/${cloverId}.${ext}`;

        // Upload to S3
        const { key, url } = await storagePut(relKey, file.buffer, file.mimetype);

        // Persist to DB
        await updateItemCustomImage(cloverId, url, key);

        res.json({ success: true, url, key });
      } catch (err: any) {
        console.error("[ImageUpload] Error:", err);
        res.status(500).json({ error: err?.message ?? "Upload failed" });
      }
    }
  );

  // Remove custom image for an item
  router.delete("/api/items/:cloverId/image", async (req: Request, res: Response) => {
    try {
      const { cloverId } = req.params;

      const item = await getItemByCloverId(cloverId);
      if (!item) {
        res.status(404).json({ error: "Item not found" });
        return;
      }

      await clearItemCustomImage(cloverId);
      res.json({ success: true });
    } catch (err: any) {
      console.error("[ImageUpload] Delete error:", err);
      res.status(500).json({ error: err?.message ?? "Delete failed" });
    }
  });
}
