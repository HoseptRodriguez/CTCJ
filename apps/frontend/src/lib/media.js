import { COMMUNITY_MEDIA_LIMITS } from '@ctcj/shared';

const { MAX_IMAGE_EDGE, MAX_IMAGE_BYTES, MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS, MAX_POST_IMAGES } =
  COMMUNITY_MEDIA_LIMITS;

export const IMAGE_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';
export const VIDEO_ACCEPT = 'video/mp4,video/webm';
export { MAX_POST_IMAGES };

/**
 * Shrinks a photo in the browser (max 1600 px, JPEG) before uploading, to
 * save mobile data. If the browser can't decode it (e.g. HEIC outside
 * Safari), the original file is sent and the server decides.
 * @returns {Promise<Blob>}
 */
export async function compressImage(file) {
  if (typeof createImageBitmap !== 'function') return file;
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return file;
  }
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
  return blob && blob.size < file.size ? blob : file;
}

/** Duration and size of a video, read by the browser. @returns {Promise<{durationSeconds:number,width:number,height:number}>} */
export function readVideoMeta(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.preload = 'metadata';
    video.muted = true;
    video.onloadedmetadata = () => {
      resolve({
        durationSeconds: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
      });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('unreadable'));
    };
    video.src = url;
  });
}

/** A still frame (at ~0.5 s) to use as the video's cover. @returns {Promise<Blob|null>} */
export function captureVideoPoster(file) {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    const done = (blob) => {
      URL.revokeObjectURL(url);
      resolve(blob);
    };
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    video.onloadeddata = () => {
      video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
    };
    video.onseeked = () => {
      const scale = Math.min(1, 960 / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => done(blob), 'image/jpeg', 0.82);
    };
    video.onerror = () => done(null);
    video.src = url;
  });
}

/** Human checks before uploading (the server checks everything again). @returns {string|null} message */
export function checkImageFile(file) {
  const ok =
    /^image\/(jpeg|png|webp|heic|heif)$/.test(file.type) || /\.(heic|heif)$/i.test(file.name);
  if (!ok) return `"${file.name}" no es una foto JPG, PNG, WebP o HEIC.`;
  if (file.size > MAX_IMAGE_BYTES)
    return `"${file.name}" pesa más de 10 MB. Elige una foto más liviana.`;
  return null;
}

/** @returns {string|null} message */
export function checkVideoFile(file, durationSeconds) {
  if (!['video/mp4', 'video/webm'].includes(file.type)) return 'El video debe ser MP4 o WebM.';
  if (file.size > MAX_VIDEO_BYTES)
    return 'El video pesa más de 50 MB. Recórtalo o elige uno más corto.';
  if (durationSeconds > MAX_VIDEO_SECONDS + 0.5) {
    return 'El video dura más de 60 segundos. Recórtalo o elige uno más corto.';
  }
  return null;
}
