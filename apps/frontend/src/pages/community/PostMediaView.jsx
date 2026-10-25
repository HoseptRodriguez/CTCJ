import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { ChevronLeftIcon } from '../../components/icons/ChevronLeftIcon.jsx';
import { ChevronRightIcon } from '../../components/icons/ChevronRightIcon.jsx';
import { CloseIcon } from '../../components/icons/CloseIcon.jsx';
import { cn } from '../../components/ui/cn.js';
import { trapTabKey, useModalPageEffects } from '../../lib/useModal.js';

/** Full-screen photo viewer: Escape or "Cerrar" closes, arrows move, focus stays inside. */
function Lightbox({ images, index, onClose, onMove }) {
  const ref = useRef(null);
  const closeRef = useRef(null);
  useModalPageEffects(true);
  useEffect(() => closeRef.current?.focus(), []);

  function onKeyDown(e) {
    if (e.key === 'Escape') onClose();
    else if (e.key === 'ArrowRight') onMove(1);
    else if (e.key === 'ArrowLeft') onMove(-1);
    else trapTabKey(e, ref.current);
  }
  const many = images.length > 1;
  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label={`Foto ${index + 1} de ${images.length}`}
      onKeyDown={onKeyDown}
      className="fixed inset-0 z-modal flex flex-col bg-navy-900/95"
    >
      <div className="flex items-center justify-between p-3 text-white">
        <p className="text-body font-semibold">
          {many ? `Foto ${index + 1} de ${images.length}` : 'Foto'}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="focus-ring inline-flex min-h-btn items-center gap-2 rounded-lg border-2 border-white px-4 text-body font-semibold"
        >
          <CloseIcon className="h-5 w-5" />
          Cerrar
        </button>
      </div>
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-3">
        <img src={images[index].url} alt="" className="max-h-full max-w-full object-contain" />
        {many && (
          <>
            <button
              type="button"
              onClick={() => onMove(-1)}
              aria-label="Foto anterior"
              className="focus-ring absolute left-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-navy-500"
            >
              <ChevronLeftIcon className="h-7 w-7" />
            </button>
            <button
              type="button"
              onClick={() => onMove(1)}
              aria-label="Foto siguiente"
              className="focus-ring absolute right-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-white text-navy-500"
            >
              <ChevronRightIcon className="h-7 w-7" />
            </button>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

// 1: full width; 2: side by side; 3: one tall + two; 4: 2x2.
const GRID = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2 grid-rows-2 [&>*:first-child]:row-span-2',
  4: 'grid-cols-2 grid-rows-2',
};

function PhotoGrid({ images }) {
  const [open, setOpen] = useState(null);
  const n = images.length;
  return (
    <>
      <ul
        aria-label={n === 1 ? 'Foto' : `${n} fotos`}
        className={cn(
          'grid gap-1 overflow-hidden rounded-xl',
          GRID[n],
          n === 1 ? 'aspect-[4/3]' : 'aspect-square sm:aspect-[4/3]',
        )}
      >
        {images.map((img, i) => (
          <li key={img.id} className="min-h-0">
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={
                n === 1
                  ? 'Ver la foto en pantalla completa'
                  : `Ver la foto ${i + 1} en pantalla completa`
              }
              className="focus-ring block h-full w-full bg-muted"
            >
              <img
                src={img.url}
                alt=""
                loading="lazy"
                decoding="async"
                width={img.width ?? undefined}
                height={img.height ?? undefined}
                className="h-full w-full object-cover"
              />
            </button>
          </li>
        ))}
      </ul>
      {open != null && (
        <Lightbox
          images={images}
          index={open}
          onClose={() => setOpen(null)}
          onMove={(step) => setOpen((i) => (i + step + n) % n)}
        />
      )}
    </>
  );
}

/**
 * A video with its cover: never autoplays, only reads its metadata, and the
 * <video> is created only when it gets near the screen (lazy).
 */
function VideoPlayer({ video }) {
  const box = useRef(null);
  const [near, setNear] = useState(typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (near || !box.current) return undefined;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: '400px' },
    );
    io.observe(box.current);
    return () => io.disconnect();
  }, [near]);

  const w = video.width || 16;
  const h = video.height || 9;
  return (
    <div
      ref={box}
      className="mx-auto overflow-hidden rounded-xl bg-navy-900"
      // Vertical clips: at most 70% of the screen tall, keeping their shape.
      style={{ aspectRatio: `${w} / ${h}`, width: `min(100%, calc(70vh * ${w / h}))` }}
    >
      {near ? (
        <video
          src={video.url}
          poster={video.posterUrl ?? undefined}
          controls
          preload="metadata"
          playsInline
          className="h-full w-full"
          aria-label={`Video de ${Math.round(video.durationSeconds ?? 0)} segundos`}
        />
      ) : video.posterUrl ? (
        <img src={video.posterUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : null}
    </div>
  );
}

/** The photos (grid + full-screen viewer) or the video of a post. */
export function PostMediaView({ media }) {
  if (!media?.length) return null;
  const video = media.find((m) => m.type === 'VIDEO');
  return (
    <div className="mt-4">
      {video ? (
        <VideoPlayer video={video} />
      ) : (
        <PhotoGrid images={media.filter((m) => m.type === 'IMAGE')} />
      )}
    </div>
  );
}
