import { beforeEach, describe, expect, it } from 'vitest';

import { createCreatePost } from '../../../../src/modules/community/application/useCases/createPost.js';
import { createAuthorizeVideoUpload } from '../../../../src/modules/community/application/useCases/authorizeVideoUpload.js';
import { createGetMediaCapabilities } from '../../../../src/modules/community/application/useCases/getMediaCapabilities.js';
import { createDeleteMyPost } from '../../../../src/modules/community/application/useCases/deleteMyPost.js';
import { createDeleteContentAsStaff } from '../../../../src/modules/community/application/useCases/deleteContentAsStaff.js';
import { MediaNotAllowedForMinor } from '../../../../src/modules/community/application/errors/MediaNotAllowedForMinor.js';
import { DailyMediaLimitReached } from '../../../../src/modules/community/application/errors/DailyMediaLimitReached.js';
import { VideoUploadUnavailable } from '../../../../src/modules/community/application/errors/VideoUploadUnavailable.js';
import { fakeJpeg, jpegBytes, mp4Bytes } from '../mediaSamples.js';

import {
  createFakeClock,
  createFakeImageProcessor,
  createFakeMediaStorage,
  createFakeMinorStatusProvider,
  createFakePlayerEligibilityProvider,
  createFakePostRepository,
} from './fakes.js';

const NOW = new Date('2026-09-27T15:00:00Z'); // 10:00 in Fusagasugá
const MB = 1024 * 1024;
const photo = (sizeBytes = 2 * MB, buffer = jpegBytes()) => ({ buffer, sizeBytes });

function setup({ minors = [], mode = 'local' } = {}) {
  const deps = {
    postRepository: createFakePostRepository(),
    playerEligibilityProvider: createFakePlayerEligibilityProvider(new Set(['ana', 'nino'])),
    clock: createFakeClock(NOW),
    minorStatusProvider: createFakeMinorStatusProvider(new Set(minors)),
    mediaStorage: createFakeMediaStorage({ mode }),
    imageProcessor: createFakeImageProcessor(),
  };
  return { deps, createPost: createCreatePost(deps) };
}

const reasonOf = (promise) =>
  promise.then(
    () => 'ok',
    (err) => err.code,
  );

describe('createPost with photos and videos', () => {
  it('stores each photo as WebP (never the raw upload) and saves the post with its media', async () => {
    const { deps, createPost } = setup();
    const post = await createPost({ authorUserId: 'ana', content: '', images: [photo(), photo()] });

    expect(post.content).toBe('');
    expect(post.media.map((m) => [m.type, m.sortOrder, m.width])).toEqual([
      ['IMAGE', 0, 1600],
      ['IMAGE', 1, 1600],
    ]);
    expect(
      deps.mediaStorage.saved.every(
        (f) => f.contentType === 'image/webp' && f.key.startsWith('community/ana/'),
      ),
    ).toBe(true);
  });

  it('a video through the server keeps its type and the duration read from its own header', async () => {
    const { createPost } = setup();
    const post = await createPost({
      authorUserId: 'ana',
      content: 'Mi saque',
      video: { buffer: mp4Bytes(42), sizeBytes: 12 * MB, durationSeconds: 5 },
    });
    expect(post.media).toEqual([
      expect.objectContaining({
        type: 'VIDEO',
        durationSeconds: 42,
        url: expect.stringMatching(/\.mp4$/),
      }),
    ]);
  });

  it.each([
    ['5 photos', { images: Array.from({ length: 5 }, () => photo()) }, 'media_too_many_images'],
    [
      'photos and a video together',
      { images: [photo()], video: { buffer: mp4Bytes(), sizeBytes: MB, durationSeconds: 5 } },
      'media_images_and_video',
    ],
    ['nothing at all', { content: '   ' }, 'media_empty_post'],
    ['a photo over 10 MB', { images: [photo(11 * MB)] }, 'media_image_too_large'],
    ['a ".jpg" that is really text', { images: [photo(MB, fakeJpeg())] }, 'media_unsupported_type'],
    [
      'a video over 50 MB',
      { video: { buffer: mp4Bytes(20), sizeBytes: 51 * MB, durationSeconds: 20 } },
      'media_video_too_large',
    ],
    [
      'a video over 60 seconds',
      { video: { buffer: mp4Bytes(75), sizeBytes: 10 * MB, durationSeconds: 30 } },
      'media_video_too_long',
    ],
    [
      'a video that is really a photo',
      { video: { buffer: jpegBytes(), sizeBytes: MB, durationSeconds: 5 } },
      'media_unsupported_type',
    ],
  ])('rejects %s', async (_label, input, code) => {
    const { deps, createPost } = setup();
    expect(await reasonOf(createPost({ authorUserId: 'ana', content: '', ...input }))).toBe(code);
    expect(deps.mediaStorage.saved).toHaveLength(0);
  });

  it('a photo that cannot be decoded is rejected, and anything already stored is deleted again', async () => {
    const { deps, createPost } = setup();
    const broken = Buffer.concat([jpegBytes(64), Buffer.from('BROKEN')]);
    expect(
      await reasonOf(createPost({ authorUserId: 'ana', images: [photo(), photo(MB, broken)] })),
    ).toBe('media_unreadable_image');
    expect(deps.mediaStorage.saved).toHaveLength(1);
    expect(deps.mediaStorage.deleted).toEqual([deps.mediaStorage.saved[0].url]);
  });

  it('minors can only post text', async () => {
    const { deps, createPost } = setup({ minors: ['nino'] });
    await expect(createPost({ authorUserId: 'nino', images: [photo()] })).rejects.toBeInstanceOf(
      MediaNotAllowedForMinor,
    );
    expect(deps.mediaStorage.saved).toHaveLength(0);
    const text = await createPost({ authorUserId: 'nino', content: '¡Gané mi primer partido!' });
    expect(text.media).toEqual([]);
  });

  it('at most 10 posts with media per player per club day; text posts do not count', async () => {
    const { createPost } = setup();
    for (let i = 0; i < 10; i += 1) await createPost({ authorUserId: 'ana', images: [photo()] });
    await createPost({ authorUserId: 'ana', content: 'Solo texto sigue funcionando' });
    await expect(createPost({ authorUserId: 'ana', images: [photo()] })).rejects.toBeInstanceOf(
      DailyMediaLimitReached,
    );
  });

  it('a video uploaded straight to Blob must be the caller own file, of a real video type', async () => {
    const { deps, createPost } = setup({ mode: 'blob' });
    const own = 'https://x.public.blob.vercel-storage.com/community/ana/v-1.mp4';
    const other = 'https://x.public.blob.vercel-storage.com/community/luis/v-2.mp4';
    const disguised = 'https://x.public.blob.vercel-storage.com/community/ana/v-3.mp4';
    deps.mediaStorage.files.set(own, mp4Bytes(30));
    deps.mediaStorage.files.set(other, mp4Bytes(30));
    deps.mediaStorage.files.set(disguised, fakeJpeg());

    expect(
      await reasonOf(
        createPost({ authorUserId: 'ana', video: { url: other, durationSeconds: 30 } }),
      ),
    ).toBe('media_video_not_owned');
    expect(
      await reasonOf(
        createPost({ authorUserId: 'ana', video: { url: disguised, durationSeconds: 30 } }),
      ),
    ).toBe('media_unsupported_type');
    const post = await createPost({
      authorUserId: 'ana',
      video: { url: own, durationSeconds: 30 },
    });
    expect(post.media[0]).toMatchObject({ type: 'VIDEO', url: own, durationSeconds: 30 });
  });
});

describe('authorizeVideoUpload (signs the direct browser -> Blob upload)', () => {
  let deps;
  beforeEach(() => {
    deps = setup({ minors: ['nino'], mode: 'blob' }).deps;
  });
  const request = { contentType: 'video/mp4', sizeBytes: 20 * MB, durationSeconds: 40 };

  it('signs an MP4 of up to 50 MB into the caller own folder', async () => {
    const authorize = createAuthorizeVideoUpload(deps);
    const options = await authorize({ userId: 'ana', pathname: 'community/ana/clip.mp4', request });
    expect(options).toMatchObject({
      allowedContentTypes: ['video/mp4'],
      maximumSizeInBytes: 50 * MB,
      addRandomSuffix: true,
    });
    expect(options.validUntil).toBeGreaterThan(NOW.getTime());
  });

  it.each([
    [
      'a minor',
      { userId: 'nino', pathname: 'community/nino/c.mp4', request },
      'minor_media_not_allowed',
    ],
    [
      'another player folder',
      { userId: 'ana', pathname: 'community/luis/c.mp4', request },
      'media_video_not_owned',
    ],
    [
      'path traversal',
      { userId: 'ana', pathname: 'community/ana/../luis/c.mp4', request },
      'media_video_not_owned',
    ],
    [
      'a MOV',
      {
        userId: 'ana',
        pathname: 'community/ana/c.mov',
        request: { ...request, contentType: 'video/quicktime' },
      },
      'media_unsupported_type',
    ],
    [
      'over 50 MB',
      {
        userId: 'ana',
        pathname: 'community/ana/c.mp4',
        request: { ...request, sizeBytes: 60 * MB },
      },
      'media_video_too_large',
    ],
    [
      'over 60 s',
      {
        userId: 'ana',
        pathname: 'community/ana/c.mp4',
        request: { ...request, durationSeconds: 90 },
      },
      'media_video_too_long',
    ],
  ])('refuses %s', async (_label, input, code) => {
    expect(await reasonOf(createAuthorizeVideoUpload(deps)(input))).toBe(code);
  });

  it('is not available without Vercel Blob (the video goes through the server)', async () => {
    const local = setup({ mode: 'local' }).deps;
    await expect(
      createAuthorizeVideoUpload(local)({
        userId: 'ana',
        pathname: 'community/ana/c.mp4',
        request,
      }),
    ).rejects.toBeInstanceOf(VideoUploadUnavailable);
  });
});

describe('capabilities and deleting', () => {
  it('tells the composer whether media is allowed and what is left today', async () => {
    const { deps, createPost } = setup({ minors: ['nino'] });
    await createPost({ authorUserId: 'ana', images: [photo()] });
    const get = createGetMediaCapabilities(deps);
    expect(await get({ userId: 'ana' })).toMatchObject({
      canUploadMedia: true,
      videoUpload: 'server',
      remainingMediaPostsToday: 9,
    });
    expect(await get({ userId: 'nino' })).toMatchObject({ canUploadMedia: false, isMinor: true });
  });

  it('deleting a post (author or staff) also deletes its files, poster included', async () => {
    const { deps, createPost } = setup();
    const withVideo = await createPost({
      authorUserId: 'ana',
      video: { buffer: mp4Bytes(10), sizeBytes: MB, durationSeconds: 10 },
      poster: photo(),
    });
    const withPhotos = await createPost({ authorUserId: 'ana', images: [photo(), photo()] });

    await createDeleteMyPost(deps)({ userId: 'ana', postId: withVideo.id });
    expect(deps.mediaStorage.deleted).toEqual([
      withVideo.media[0].url,
      withVideo.media[0].posterUrl,
    ]);

    await createDeleteContentAsStaff({ ...deps, commentRepository: {} })({
      targetType: 'POST',
      targetId: withPhotos.id,
    });
    expect(deps.mediaStorage.deleted).toHaveLength(4);
  });
});
