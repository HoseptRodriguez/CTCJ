import { del, put } from '@vercel/blob';

const BLOB_HOST_SUFFIX = '.public.blob.vercel-storage.com';

/**
 * Production storage: Vercel Blob (public files on its CDN). Photos are put
 * here by the server; videos are uploaded by the browser directly (signed by
 * handleUpload) and only inspected here -- their first bytes are read with an
 * HTTP Range request to confirm the real type, never the whole 50 MB.
 *
 * @param {{ token: string, putBlob?: typeof put, delBlob?: typeof del, fetchImpl?: typeof fetch }} options
 * @returns {import('../../application/ports/MediaStorage.js').MediaStorage}
 */
export function createVercelBlobMediaStorage({
  token,
  putBlob = put,
  delBlob = del,
  fetchImpl = fetch,
}) {
  const parse = (url) => {
    try {
      const u = new URL(url);
      return u.protocol === 'https:' && u.hostname.endsWith(BLOB_HOST_SUFFIX) ? u : null;
    } catch {
      return null;
    }
  };

  return {
    get mode() {
      return 'blob';
    },

    async save(key, buffer, contentType) {
      const blob = await putBlob(key, buffer, {
        access: 'public',
        contentType,
        token,
        addRandomSuffix: false,
      });
      return blob.url;
    },

    ownsUrl(url, userId) {
      const u = parse(url);
      return Boolean(
        u && u.pathname.startsWith(`/community/${userId}/`) && !u.pathname.includes('..'),
      );
    },

    async inspect(url, bytes) {
      if (!parse(url)) return null;
      const res = await fetchImpl(url, { headers: { Range: `bytes=0-${bytes - 1}` } });
      if (!res.ok) return null;
      const head = Buffer.from(await res.arrayBuffer());
      // 206: "Content-Range: bytes 0-N/TOTAL"; 200 (no range support): whole body.
      const range = res.headers.get('content-range');
      const total = range
        ? Number(range.split('/')[1])
        : Number(res.headers.get('content-length') ?? head.length);
      return {
        sizeBytes: Number.isFinite(total) ? total : head.length,
        head: head.subarray(0, bytes),
      };
    },

    async deleteMany(urls) {
      const own = urls.filter((u) => parse(u));
      if (own.length === 0) return;
      await delBlob(own, { token }).catch(() => {});
    },
  };
}
