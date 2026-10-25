/**
 * The "opens in another app or site" hint of a link: a small ↗ for sight
 * and a short text only for screen readers (not a repeated paragraph).
 */
export function ExternalLinkMark({ text = 'se abre en otra aplicación o sitio' }) {
  return (
    <>
      <span aria-hidden="true" className="ml-1 inline-block">
        ↗
      </span>
      <span className="sr-only"> ({text})</span>
    </>
  );
}
