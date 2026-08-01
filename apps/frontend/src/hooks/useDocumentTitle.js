import { useEffect } from 'react';

const SUFFIX = ' · Club de Tenis Ciudad Jardín';

/** Sets document.title for the lifetime of the calling route, restoring whatever it was before on unmount. */
export function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title}${SUFFIX}`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
