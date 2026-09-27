import { randomUUID } from 'node:crypto';

import { COMMUNITY_MEDIA_LIMITS, POST_MEDIA_TYPE } from '@ctcj/shared';

import { detectFileType, probeVideoDuration } from '../../domain/services/fileSniffing.js';
import { DailyMediaLimitReached } from '../errors/DailyMediaLimitReached.js';
import { InvalidMedia } from '../errors/InvalidMedia.js';
import { MediaNotAllowedForMinor } from '../errors/MediaNotAllowedForMinor.js';
import { PlayerNotEligible } from '../errors/PlayerNotEligible.js';
import { startOfClubDay } from '../services/clubDay.js';
import { assertImage, assertPostShape, assertVideo } from '../services/mediaPolicy.js';

const { MAX_IMAGE_EDGE, MAX_MEDIA_POSTS_PER_DAY } = COMMUNITY_MEDIA_LIMITS;
const POSTER_EDGE = 960;
const EXTENSION = { 'video/mp4': 'mp4', 'video/webm': 'webm' };

/**
 * A post: text, and optionally up to 4 photos OR 1 video.
 *
 * Photos come through the server: their real type is read from their bytes,
 * then they are re-encoded as WebP (max 1600 px, no EXIF/GPS) and stored.
 * A video either comes through the server too (local storage) or was
 * uploaded by the browser straight to Blob; then only its URL arrives here,
 * and the server checks that it's the caller's own file and reads its first
 * bytes to confirm its real type, size and (when the header allows) duration.
 *
 * Minors' accounts can only post text. At most 10 posts with media per
 * player per club day. If anything fails after files were stored, they are
 * deleted again so nothing is left orphaned.
 *
 * @param {{
 *   postRepository: import('../ports/PostRepository.js').PostRepository,
 *   playerEligibilityProvider: import('../ports/PlayerEligibilityProvider.js').PlayerEligibilityProvider,
 *   clock: import('../ports/Clock.js').Clock,
 *   minorStatusProvider?: import('../ports/MinorStatusProvider.js').MinorStatusProvider,
 *   mediaStorage?: import('../ports/MediaStorage.js').MediaStorage,
 *   imageProcessor?: import('../ports/ImageProcessor.js').ImageProcessor,
 * }} deps
 */
export function createCreatePost({
  postRepository,
  playerEligibilityProvider,
  clock,
  minorStatusProvider,
  mediaStorage,
  imageProcessor,
}) {
  /**
   * @param {{ authorUserId: string, content?: string,
   *   images?: { buffer: Buffer, sizeBytes: number }[],
   *   video?: { url?: string, buffer?: Buffer, sizeBytes?: number, durationSeconds: number,
   *     width?: number, height?: number } | null,
   *   poster?: { buffer: Buffer, sizeBytes: number } | null }} input
   */
  return async function createPost({
    authorUserId,
    content = '',
    images = [],
    video = null,
    poster = null,
  }) {
    const eligible = await playerEligibilityProvider.isEligiblePlayer(authorUserId);
    if (!eligible) {
      throw new PlayerNotEligible();
    }
    assertPostShape({ content, imageCount: images.length, hasVideo: Boolean(video) });

    const now = clock.now();
    const post = {
      id: randomUUID(),
      authorId: authorUserId,
      content: content.trim(),
      createdAt: now,
    };
    if (images.length === 0 && !video) {
      return postRepository.create(post);
    }

    if (await minorStatusProvider.isMinor(authorUserId)) {
      throw new MediaNotAllowedForMinor();
    }
    const today = await postRepository.countMediaPostsSince(authorUserId, startOfClubDay(now));
    if (today >= MAX_MEDIA_POSTS_PER_DAY) {
      throw new DailyMediaLimitReached();
    }

    // Validate everything before storing anything.
    for (const image of images) {
      assertImage({ sizeBytes: image.sizeBytes, detectedType: detectFileType(image.buffer) });
    }
    let videoFile = null;
    if (video) {
      videoFile = await inspectVideo(video, authorUserId);
      assertVideo(videoFile);
    }

    const stored = [];
    const keyFor = (ext) => `community/${authorUserId}/${randomUUID()}.${ext}`;
    const saveWebp = async (buffer, maxEdge) => {
      let out;
      try {
        out = await imageProcessor.toWebp(buffer, maxEdge);
      } catch {
        throw new InvalidMedia('unreadable_image');
      }
      const url = await mediaStorage.save(keyFor('webp'), out.buffer, out.contentType);
      stored.push(url);
      return { url, width: out.width, height: out.height };
    };

    try {
      const media = [];
      for (const [i, image] of images.entries()) {
        const saved = await saveWebp(image.buffer, MAX_IMAGE_EDGE);
        media.push({
          id: randomUUID(),
          type: POST_MEDIA_TYPE.IMAGE,
          url: saved.url,
          width: saved.width,
          height: saved.height,
          sortOrder: i,
        });
      }
      if (videoFile) {
        let url = video.url;
        if (!url) {
          url = await mediaStorage.save(
            keyFor(EXTENSION[videoFile.detectedType]),
            video.buffer,
            videoFile.detectedType,
          );
        }
        stored.push(url);
        const cover = poster ? await saveWebp(poster.buffer, POSTER_EDGE) : null;
        media.push({
          id: randomUUID(),
          type: POST_MEDIA_TYPE.VIDEO,
          url,
          posterUrl: cover?.url ?? null,
          width: video.width ?? cover?.width ?? null,
          height: video.height ?? cover?.height ?? null,
          durationSeconds: Math.round(videoFile.durationSeconds * 100) / 100,
          sortOrder: 0,
        });
      }
      return await postRepository.create({ ...post, media });
    } catch (err) {
      await mediaStorage.deleteMany(stored);
      throw err;
    }
  };

  /** Size, real type and duration of the video, wherever it is. */
  async function inspectVideo(video, authorUserId) {
    if (video.buffer) {
      const detectedType = detectFileType(video.buffer);
      return {
        sizeBytes: video.sizeBytes,
        detectedType,
        durationSeconds: probeVideoDuration(video.buffer, detectedType) ?? video.durationSeconds,
      };
    }
    // Uploaded by the browser straight to Blob: must be the caller's own file.
    if (!mediaStorage.ownsUrl(video.url, authorUserId)) {
      throw new InvalidMedia('video_not_owned');
    }
    const file = await mediaStorage.inspect(video.url, 64 * 1024);
    if (!file) {
      throw new InvalidMedia('video_not_owned');
    }
    const detectedType = detectFileType(file.head);
    return {
      sizeBytes: file.sizeBytes,
      detectedType,
      durationSeconds: probeVideoDuration(file.head, detectedType) ?? video.durationSeconds,
    };
  }
}
