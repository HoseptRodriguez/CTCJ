import { CommunityError } from './CommunityError.js';

/** Direct browser-to-Blob uploads need Vercel Blob; without it the video goes through the server. */
export class VideoUploadUnavailable extends CommunityError {
  constructor() {
    super('video_upload_unavailable', 'Direct video uploads are not available on this server.');
  }
}
