// Storage cleanup for product deletion. DB rows cascade via FKs (options,
// variants, specs, reviews; order history is preserved via SET NULL) — this
// removes the product's media files from our storage buckets so nothing
// orphans. Best-effort: external/Instagram URLs are skipped, errors never
// block the deletion itself.

import { supabase } from '@/integrations/supabase/client';

interface MediaCarrier {
  media_url?: string | null;
  thumbnail_url?: string | null;
  media_gallery?: string[] | null;
}

/** Extract `{bucket, path}` from a Supabase public-storage URL; null for external URLs. */
const parseStorageUrl = (url: string | null | undefined): { bucket: string; path: string } | null => {
  if (!url) return null;
  const m = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?|$)/);
  return m ? { bucket: m[1], path: decodeURIComponent(m[2]) } : null;
};

/** Delete all storage files referenced by the given products' media fields. */
export const deleteProductMedia = async (products: MediaCarrier[]): Promise<void> => {
  const byBucket = new Map<string, Set<string>>();
  for (const p of products) {
    const urls = [p.media_url, p.thumbnail_url, ...(p.media_gallery ?? [])];
    for (const url of urls) {
      const parsed = parseStorageUrl(url);
      if (!parsed) continue;
      if (!byBucket.has(parsed.bucket)) byBucket.set(parsed.bucket, new Set());
      byBucket.get(parsed.bucket)!.add(parsed.path);
    }
  }
  await Promise.all(
    Array.from(byBucket.entries()).map(async ([bucket, paths]) => {
      const { error } = await supabase.storage.from(bucket).remove(Array.from(paths));
      if (error) console.warn(`[productCleanup] couldn't remove ${paths.size} file(s) from ${bucket}:`, error.message);
    })
  );
};
