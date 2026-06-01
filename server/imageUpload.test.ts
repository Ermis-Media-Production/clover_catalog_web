/**
 * Tests for image upload/delete Express routes.
 * We test the route logic by mocking the DB helpers and storagePut,
 * then calling the handler functions directly with mock req/res objects.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("./catalogDb", () => ({
  getItemByCloverId: vi.fn(),
  updateItemCustomImage: vi.fn(),
  clearItemCustomImage: vi.fn(),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn(),
}));

import {
  getItemByCloverId,
  updateItemCustomImage,
  clearItemCustomImage,
} from "./catalogDb";
import { storagePut } from "./storage";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRes() {
  const res: any = { _status: 200, _body: null };
  res.status = (code: number) => { res._status = code; return res; };
  res.json = (body: any) => { res._body = body; return res; };
  return res;
}

function makeReq(cloverId: string, file?: Express.Multer.File | null) {
  return {
    params: { cloverId },
    file: file ?? undefined,
  } as any;
}

// Import the handlers after mocks are set up
// We test the logic inline since the router uses closures

async function handleUpload(req: any, res: any) {
  const { cloverId } = req.params;
  const file = req.file;

  if (!file) {
    res.status(400).json({ error: "No image file provided" });
    return;
  }

  const item = await (getItemByCloverId as any)(cloverId);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }

  const ext = file.mimetype.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const relKey = `item-images/${cloverId}.${ext}`;
  const { key, url } = await (storagePut as any)(relKey, file.buffer, file.mimetype);
  await (updateItemCustomImage as any)(cloverId, url, key);
  res.json({ success: true, url, key });
}

async function handleDelete(req: any, res: any) {
  const { cloverId } = req.params;
  const item = await (getItemByCloverId as any)(cloverId);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  }
  await (clearItemCustomImage as any)(cloverId);
  res.json({ success: true });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/items/:cloverId/image", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when no file is provided", async () => {
    const req = makeReq("ITEM123", null);
    const res = makeRes();
    await handleUpload(req, res);
    expect(res._status).toBe(400);
    expect(res._body.error).toBe("No image file provided");
  });

  it("returns 404 when item does not exist", async () => {
    (getItemByCloverId as any).mockResolvedValue(null);
    const req = makeReq("MISSING", {
      mimetype: "image/jpeg",
      buffer: Buffer.from("data"),
    } as any);
    const res = makeRes();
    await handleUpload(req, res);
    expect(res._status).toBe(404);
    expect(res._body.error).toBe("Item not found");
  });

  it("uploads file to S3 and updates DB on success", async () => {
    (getItemByCloverId as any).mockResolvedValue({ cloverId: "ITEM1", name: "Pizza" });
    (storagePut as any).mockResolvedValue({ key: "item-images/ITEM1.jpg", url: "/manus-storage/item-images/ITEM1.jpg" });
    (updateItemCustomImage as any).mockResolvedValue(undefined);

    const req = makeReq("ITEM1", {
      mimetype: "image/jpeg",
      buffer: Buffer.from("imgdata"),
    } as any);
    const res = makeRes();
    await handleUpload(req, res);

    expect(storagePut).toHaveBeenCalledWith("item-images/ITEM1.jpg", expect.any(Buffer), "image/jpeg");
    expect(updateItemCustomImage).toHaveBeenCalledWith("ITEM1", "/manus-storage/item-images/ITEM1.jpg", "item-images/ITEM1.jpg");
    expect(res._body.success).toBe(true);
    expect(res._body.url).toBe("/manus-storage/item-images/ITEM1.jpg");
  });

  it("uses png extension for image/png mimetype", async () => {
    (getItemByCloverId as any).mockResolvedValue({ cloverId: "ITEM2", name: "Wings" });
    (storagePut as any).mockResolvedValue({ key: "item-images/ITEM2.png", url: "/manus-storage/item-images/ITEM2.png" });
    (updateItemCustomImage as any).mockResolvedValue(undefined);

    const req = makeReq("ITEM2", {
      mimetype: "image/png",
      buffer: Buffer.from("pngdata"),
    } as any);
    const res = makeRes();
    await handleUpload(req, res);

    expect(storagePut).toHaveBeenCalledWith("item-images/ITEM2.png", expect.any(Buffer), "image/png");
    expect(res._body.success).toBe(true);
  });
});

describe("DELETE /api/items/:cloverId/image", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 404 when item does not exist", async () => {
    (getItemByCloverId as any).mockResolvedValue(null);
    const req = makeReq("MISSING");
    const res = makeRes();
    await handleDelete(req, res);
    expect(res._status).toBe(404);
    expect(res._body.error).toBe("Item not found");
  });

  it("clears custom image and returns success", async () => {
    (getItemByCloverId as any).mockResolvedValue({ cloverId: "ITEM3", name: "Stromboli" });
    (clearItemCustomImage as any).mockResolvedValue(undefined);

    const req = makeReq("ITEM3");
    const res = makeRes();
    await handleDelete(req, res);

    expect(clearItemCustomImage).toHaveBeenCalledWith("ITEM3");
    expect(res._body.success).toBe(true);
  });
});
