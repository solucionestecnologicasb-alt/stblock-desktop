import { appAsset } from "@/lib/appBasePath";

export const LIBRARY_CACHE_NAME = "sketchforge-component-models-v2";
export const LIBRARY_CACHE_CHANGED_EVENT = "sketchforge:library-cache-changed";
export const LIBRARY_CACHE_MAX_BYTES = 512 * 1024 * 1024;
export type LibraryModelDescriptor = { id: string; modelFormat?: "stl" | "step"; modelUrl?: string; modelPath?: string; metadata?: { fileBytes?: number; sha256?: string } };
const inFlight = new Map<string, Promise<ArrayBuffer>>();

export function libraryModelRequestUrl(asset: LibraryModelDescriptor): string | null {
  if (asset.modelPath) return appAsset(asset.modelPath);
  return asset.modelUrl ?? null;
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string | null> {
  if (typeof crypto === "undefined" || !crypto.subtle) return null;
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function validate(asset: LibraryModelDescriptor, buffer: ArrayBuffer): Promise<void> {
  if (asset.metadata?.fileBytes != null && buffer.byteLength !== asset.metadata.fileBytes) throw new Error(`El modelo ${asset.id} está incompleto (${buffer.byteLength}/${asset.metadata.fileBytes} bytes)`);
  if (asset.metadata?.sha256) {
    const actual = await sha256Hex(buffer);
    if (actual && actual !== asset.metadata.sha256) throw new Error(`Falló la verificación SHA-256 del modelo ${asset.id}`);
  }
}

async function openCache(): Promise<Cache | null> {
  if (typeof caches === "undefined") return null;
  try { return await caches.open(LIBRARY_CACHE_NAME); } catch { return null; }
}

async function trimLibraryCache(cache: Cache, protectedUrl: string): Promise<void> {
  const keys = await cache.keys();
  const entries = await Promise.all(keys.map(async (request) => {
    const response = await cache.match(request);
    return {
      request,
      bytes: Number(response?.headers.get("X-SketchForge-Bytes") ?? response?.headers.get("Content-Length") ?? 0) || 0,
      accessed: Number(response?.headers.get("X-SketchForge-Accessed") ?? 0) || 0,
    };
  }));
  let total = entries.reduce((sum, entry) => sum + entry.bytes, 0);
  for (const entry of entries.sort((left, right) => left.accessed - right.accessed)) {
    if (total <= LIBRARY_CACHE_MAX_BYTES) break;
    if (entry.request.url === protectedUrl) continue;
    if (await cache.delete(entry.request)) total -= entry.bytes;
  }
}

function notifyCacheChanged(assetId?: string): void {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(LIBRARY_CACHE_CHANGED_EVENT, { detail: { assetId } }));
}

async function loadModel(asset: LibraryModelDescriptor): Promise<ArrayBuffer> {
  const url = libraryModelRequestUrl(asset);
  if (!url) throw new Error(`El componente ${asset.id} no tiene un modelo CAD asociado`);
  const cache = await openCache();
  if (cache) {
    const cached = await cache.match(url);
    if (cached) {
      const buffer = await cached.arrayBuffer();
      try { await validate(asset, buffer); return buffer; } catch { await cache.delete(url); }
    }
  }
  const response = await fetch(url, { cache: "no-store", mode: asset.modelUrl ? "cors" : "same-origin" });
  if (!response.ok) throw new Error(`No se pudo descargar ${asset.id}: HTTP ${response.status}`);
  const buffer = await response.arrayBuffer(); await validate(asset, buffer);
  if (cache) {
    const contentType = asset.modelFormat === "step" ? "model/step" : "model/stl";
    await cache.put(url, new Response(buffer.slice(0), { headers: {
      "Content-Type": contentType,
      "X-SketchForge-Asset": asset.id,
      "X-SketchForge-Bytes": String(buffer.byteLength),
      "X-SketchForge-Accessed": String(Date.now()),
    } }));
    await trimLibraryCache(cache, url);
    notifyCacheChanged(asset.id);
  }
  return buffer;
}

export function getLibraryModelBuffer(asset: LibraryModelDescriptor): Promise<ArrayBuffer> {
  const current = inFlight.get(asset.id); if (current) return current;
  const request = loadModel(asset).finally(() => inFlight.delete(asset.id)); inFlight.set(asset.id, request); return request;
}
export async function isLibraryModelCached(asset: LibraryModelDescriptor): Promise<boolean> {
  const url = libraryModelRequestUrl(asset); if (!url) return false;
  const cache = await openCache(); return Boolean(await cache?.match(url));
}
export async function clearLibraryModelCache(): Promise<void> {
  if (typeof caches !== "undefined") { await caches.delete("sketchforge-component-models-v1"); await caches.delete(LIBRARY_CACHE_NAME); }
  notifyCacheChanged();
}
