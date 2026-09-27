import { useEffect, useRef, useState } from 'react';

import { communityClient } from '../../api/communityClient.js';
import { ImageIcon } from '../../components/icons/ImageIcon.jsx';
import { InfoIcon } from '../../components/icons/InfoIcon.jsx';
import { VideoIcon } from '../../components/icons/VideoIcon.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { TextAreaField } from '../../components/ui/Field.jsx';
import { ProgressBar } from '../mictcj/shared.jsx';
import { describeCommunityError } from '../../lib/communityErrorMessages.js';
import {
  captureVideoPoster,
  checkImageFile,
  checkVideoFile,
  compressImage,
  IMAGE_ACCEPT,
  MAX_POST_IMAGES,
  readVideoMeta,
  VIDEO_ACCEPT,
} from '../../lib/media.js';

const MINOR_NOTICE =
  'Solo publica fotos o videos de menores de edad si tienes autorización de su acudiente.';

function Preview({ item, onRemove }) {
  return (
    <li className="relative overflow-hidden rounded-lg border border-line bg-page">
      {item.kind === 'image' ? (
        <img src={item.previewUrl} alt="" className="aspect-square w-full object-cover" />
      ) : (
        <video
          src={item.previewUrl}
          preload="metadata"
          muted
          className="aspect-video w-full bg-navy-900 object-contain"
        />
      )}
      <div className="flex items-center justify-between gap-2 p-2">
        <span className="truncate text-body-sm text-ink-soft">
          {item.kind === 'video'
            ? `Video · ${Math.round(item.meta.durationSeconds)} s`
            : item.file.name}
        </span>
        <Button variant="ghost" onClick={onRemove}>
          Quitar
          <span className="sr-only"> {item.kind === 'video' ? 'el video' : item.file.name}</span>
        </Button>
      </div>
    </li>
  );
}

/**
 * "Publicar algo": text, plus up to 4 photos OR one video. Photos are
 * shrunk in the browser (max 1600 px) before uploading; the upload shows a
 * real progress bar. Minors' accounts only see the text box.
 */
export function MediaComposer({ userId, onPublished }) {
  const [caps, setCaps] = useState(null);
  const [content, setContent] = useState('');
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null); // null | 0..100
  const imageInput = useRef(null);
  const videoInput = useRef(null);

  useEffect(() => {
    communityClient
      .getMediaCapabilities()
      .then(setCaps)
      .catch(() => setCaps({ canUploadMedia: false }));
  }, []);
  // Release preview URLs on removal (below) and when leaving the page.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => () => itemsRef.current.forEach((i) => URL.revokeObjectURL(i.previewUrl)), []);
  function removeItem(item) {
    URL.revokeObjectURL(item.previewUrl);
    setItems((prev) => prev.filter((i) => i.id !== item.id));
  }

  const hasVideo = items.some((i) => i.kind === 'video');
  const imageCount = items.filter((i) => i.kind === 'image').length;
  const busy = progress != null;

  function addImages(fileList) {
    setError(null);
    const files = [...fileList];
    if (hasVideo) return setError('Publica fotos o un video, no los dos a la vez.');
    if (imageCount + files.length > MAX_POST_IMAGES)
      return setError('Puedes publicar hasta 4 fotos a la vez.');
    for (const file of files) {
      const problem = checkImageFile(file);
      if (problem) return setError(problem);
    }
    setItems((prev) => [
      ...prev,
      ...files.map((file) => ({
        id: crypto.randomUUID(),
        kind: 'image',
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  }

  async function addVideo(file) {
    setError(null);
    if (imageCount > 0) return setError('Publica fotos o un video, no los dos a la vez.');
    let meta;
    try {
      meta = await readVideoMeta(file);
    } catch {
      return setError('No pudimos leer ese video. Prueba con un MP4.');
    }
    const problem = checkVideoFile(file, meta.durationSeconds);
    if (problem) return setError(problem);
    setItems([
      { id: crypto.randomUUID(), kind: 'video', file, meta, previewUrl: URL.createObjectURL(file) },
    ]);
  }

  async function publish(e) {
    e.preventDefault();
    if (!content.trim() && items.length === 0) {
      return setError('Escribe algo o agrega una foto o un video antes de publicar.');
    }
    setError(null);
    try {
      if (items.length === 0) {
        setProgress(0);
        await communityClient.createPost({ content: content.trim() });
      } else {
        setProgress(0);
        const form = new FormData();
        form.append('content', content.trim());
        const video = items.find((i) => i.kind === 'video');
        if (video) {
          const poster = await captureVideoPoster(video.file);
          if (caps?.videoUpload === 'direct') {
            // 50 MB go straight to storage; our server only signs the upload.
            const blob = await communityClient.uploadVideoDirect(video.file, {
              userId,
              durationSeconds: video.meta.durationSeconds,
              onProgress: (p) => setProgress(Math.round(p * 0.9)),
            });
            form.append(
              'video',
              JSON.stringify({
                url: blob.url,
                durationSeconds: video.meta.durationSeconds,
                width: video.meta.width,
                height: video.meta.height,
              }),
            );
          } else {
            form.append('video', video.file, video.file.name);
            form.append('videoMeta', JSON.stringify(video.meta));
          }
          if (poster) form.append('poster', poster, 'portada.jpg');
        } else {
          for (const item of items) {
            const small = await compressImage(item.file);
            form.append(
              'images',
              small,
              item.file.name.replace(/\.[^.]+$/, '') + (small === item.file ? '' : '.jpg'),
            );
          }
        }
        const direct = video && caps?.videoUpload === 'direct';
        await communityClient.createMediaPost(form, (p) =>
          setProgress(direct ? 90 + Math.round(p / 10) : p),
        );
      }
      setContent('');
      items.forEach((i) => URL.revokeObjectURL(i.previewUrl));
      setItems([]);
      onPublished();
    } catch (err) {
      setError(describeCommunityError(err));
    } finally {
      setProgress(null);
    }
  }

  return (
    <form onSubmit={publish} className="space-y-4" noValidate>
      <TextAreaField
        label="Publicar algo"
        rows={3}
        maxLength={1000}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        hint="Máximo 1.000 caracteres. Todos los jugadores del club lo verán."
      />

      {caps?.canUploadMedia && (
        <>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              size="lg"
              icon={<ImageIcon />}
              disabled={busy || hasVideo || imageCount >= MAX_POST_IMAGES}
              onClick={() => imageInput.current?.click()}
            >
              Agregar fotos
            </Button>
            <Button
              variant="secondary"
              size="lg"
              icon={<VideoIcon />}
              disabled={busy || imageCount > 0 || hasVideo}
              onClick={() => videoInput.current?.click()}
            >
              Agregar video
            </Button>
            <input
              ref={imageInput}
              type="file"
              accept={IMAGE_ACCEPT}
              multiple
              className="hidden"
              aria-label="Elegir fotos"
              onChange={(e) => {
                addImages(e.target.files);
                e.target.value = '';
              }}
            />
            <input
              ref={videoInput}
              type="file"
              accept={VIDEO_ACCEPT}
              className="hidden"
              aria-label="Elegir video"
              onChange={(e) => {
                if (e.target.files[0]) addVideo(e.target.files[0]);
                e.target.value = '';
              }}
            />
          </div>
          <p className="text-body-sm text-ink-soft">
            Hasta 4 fotos (máximo 10 MB cada una) o 1 video MP4/WebM de hasta 60 segundos y 50 MB.
          </p>
          <p className="flex items-start gap-3 rounded-lg bg-amber-soft p-4 text-body font-semibold text-amber-dark">
            <InfoIcon className="mt-0.5 h-6 w-6 shrink-0" />
            {MINOR_NOTICE}
          </p>
        </>
      )}
      {caps && !caps.canUploadMedia && caps.isMinor && (
        <p className="rounded-lg bg-page p-4 text-body text-ink">
          Tu cuenta es de menor de edad: puedes publicar texto, pero no fotos ni videos.
        </p>
      )}

      {items.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Archivos elegidos">
          {items.map((item) => (
            <Preview key={item.id} item={item} onRemove={() => removeItem(item)} />
          ))}
        </ul>
      )}

      {busy && items.length > 0 && (
        <ProgressBar percent={progress} label={`Subiendo… ${progress} %`} />
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-status-overdue-bg p-3 text-body font-semibold text-status-overdue-fg"
        >
          {error}
        </p>
      )}
      <Button type="submit" loading={busy} loadingText="Publicando…">
        Publicar
      </Button>
    </form>
  );
}

export { MINOR_NOTICE };
