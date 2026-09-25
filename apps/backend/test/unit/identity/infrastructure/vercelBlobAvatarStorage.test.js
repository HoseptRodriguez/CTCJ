import { describe, expect, it } from 'vitest';

import { createVercelBlobAvatarStorage } from '../../../../src/modules/identity/infrastructure/storage/vercelBlobAvatarStorage.js';

describe('vercelBlobAvatarStorage', () => {
  it('uploads under avatars/<uuid>.<ext> as a public blob and returns its URL', async () => {
    const calls = [];
    const putBlob = async (pathname, body, options) => {
      calls.push({ pathname, body, options });
      return { url: `https://store.public.blob.vercel-storage.com/${pathname}` };
    };
    const storage = createVercelBlobAvatarStorage({ token: 'rw-token', putBlob });
    const buffer = Buffer.from([1, 2, 3]);

    const url = await storage.save(buffer, 'image/png');

    expect(calls).toHaveLength(1);
    expect(calls[0].pathname).toMatch(/^avatars\/[0-9a-f-]{36}\.png$/);
    expect(calls[0].body).toBe(buffer);
    expect(calls[0].options).toEqual({
      access: 'public',
      contentType: 'image/png',
      token: 'rw-token',
    });
    expect(url).toBe(`https://store.public.blob.vercel-storage.com/${calls[0].pathname}`);
  });

  it('never reuses a filename across uploads', async () => {
    const paths = [];
    const putBlob = async (pathname) => {
      paths.push(pathname);
      return { url: pathname };
    };
    const storage = createVercelBlobAvatarStorage({ token: 't', putBlob });

    await storage.save(Buffer.from([1]), 'image/jpeg');
    await storage.save(Buffer.from([1]), 'image/jpeg');

    expect(paths[0]).not.toBe(paths[1]);
    expect(paths[0]).toMatch(/\.jpg$/);
  });
});
