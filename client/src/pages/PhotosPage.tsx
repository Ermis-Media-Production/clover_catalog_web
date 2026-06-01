import { useState, useRef } from "react";
import { Link } from "wouter";
import {
  Image,
  ArrowLeft,
  Upload,
  Trash2,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";

function formatCents(cents: number) {
  if (!cents) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

type UploadState = "idle" | "uploading" | "done" | "error";

function ItemPhotoCard({ item }: { item: any }) {
  const utils = trpc.useUtils();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const currentImage = item.customImageUrl ?? item.imageUrl ?? null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show local preview immediately
    setPreviewUrl(URL.createObjectURL(file));
    setUploadState("uploading");

    try {
      const formData = new FormData();
      formData.append("image", file);

      const res = await fetch(`/api/items/${item.cloverId}/image`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Upload failed" }));
        throw new Error(err.error ?? "Upload failed");
      }

      setUploadState("done");
      toast.success(`Photo updated for "${item.name}"`);
      utils.catalog.getItems.invalidate();
    } catch (err: any) {
      setUploadState("error");
      setPreviewUrl(null);
      toast.error(err.message ?? "Upload failed");
    } finally {
      // Reset file input so same file can be re-selected
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!confirm(`Remove custom photo for "${item.name}"?`)) return;
    setRemoving(true);
    try {
      const res = await fetch(`/api/items/${item.cloverId}/image`, { method: "DELETE" });
      if (!res.ok) throw new Error("Remove failed");
      setPreviewUrl(null);
      setUploadState("idle");
      toast.success("Photo removed");
      utils.catalog.getItems.invalidate();
    } catch (err: any) {
      toast.error(err.message ?? "Remove failed");
    } finally {
      setRemoving(false);
    }
  };

  const displayImage = previewUrl ?? currentImage;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col group">
      {/* Image area */}
      <div className="relative aspect-square bg-muted overflow-hidden">
        {displayImage ? (
          <img
            src={displayImage}
            alt={item.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <Image className="w-10 h-10 opacity-30" />
            <span className="text-xs">No photo</span>
          </div>
        )}

        {/* Upload overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button
            size="sm"
            className="gap-1.5 shadow-lg"
            onClick={() => fileRef.current?.click()}
            disabled={uploadState === "uploading"}
          >
            {uploadState === "uploading" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Upload className="w-3.5 h-3.5" />
            )}
            {uploadState === "uploading" ? "Uploading…" : "Upload"}
          </Button>
          {(item.customImageUrl || previewUrl) && (
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5 shadow-lg"
              onClick={handleRemove}
              disabled={removing}
            >
              {removing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Remove
            </Button>
          )}
        </div>

        {/* Status badges */}
        {uploadState === "done" && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-green-500 text-white gap-1 text-xs">
              <CheckCircle2 className="w-3 h-3" />Updated
            </Badge>
          </div>
        )}
        {uploadState === "error" && (
          <div className="absolute top-2 right-2">
            <Badge variant="destructive" className="gap-1 text-xs">
              <X className="w-3 h-3" />Failed
            </Badge>
          </div>
        )}
        {item.customImageUrl && uploadState !== "done" && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-primary text-primary-foreground text-xs">Custom</Badge>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col gap-1">
        <p className="font-semibold text-foreground text-sm leading-snug line-clamp-2">{item.name}</p>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">{formatCents(item.priceCents)}</span>
          {item.categories?.[0] && (
            <span className="text-xs text-muted-foreground truncate max-w-[100px]">
              {item.categories[0].name}
            </span>
          )}
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}

export default function PhotosPage() {
  const { user, isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const { data: items, isLoading, error } = trpc.catalog.getItems.useQuery({});
  const { data: categories } = trpc.catalog.getCategories.useQuery();

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-10 h-10 text-destructive" />
        <p className="text-foreground font-semibold">Admin access required</p>
        <Link href="/admin"><Button variant="outline">Go to Admin</Button></Link>
      </div>
    );
  }

  const filtered = (items ?? []).filter((item: any) => {
    const matchSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.sku ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCategory =
      categoryFilter === "all" ||
      item.categories?.some((c: any) => c.cloverId === categoryFilter);
    return matchSearch && matchCategory;
  });

  const withCustom = filtered.filter((i: any) => i.customImageUrl).length;
  const withoutCustom = filtered.filter((i: any) => !i.customImageUrl).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center gap-3 sticky top-0 bg-background/80 backdrop-blur-sm z-10">
        <Link href="/admin">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Image className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-bold text-foreground text-lg leading-none">Item Photos</h1>
          <p className="text-muted-foreground text-xs">Upload custom photos for your menu items</p>
        </div>
        <div className="ml-auto flex items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            {withCustom} with photo
          </span>
          <span className="flex items-center gap-1">
            <Image className="w-4 h-4 opacity-40" />
            {withoutCustom} without
          </span>
        </div>
      </header>

      <div className="container py-6 max-w-7xl">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search items by name or SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">All Categories</option>
            {(categories ?? []).map((cat: any) => (
              <option key={cat.cloverId} value={cat.cloverId}>{cat.name}</option>
            ))}
          </select>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-destructive bg-destructive/10 border border-destructive/30 rounded-xl p-4">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">{error.message}</p>
          </div>
        )}

        {!isLoading && !error && (
          <>
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
                <Image className="w-12 h-12 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground font-medium">No items found</p>
                <p className="text-muted-foreground text-sm">Try a different search or category filter.</p>
              </div>
            ) : (
              <>
                <p className="text-muted-foreground text-sm mb-4">
                  Showing {filtered.length} items — hover over a card to upload or remove a photo
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filtered.map((item: any) => (
                    <ItemPhotoCard key={item.cloverId} item={item} />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
