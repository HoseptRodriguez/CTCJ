import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { Footer } from './Footer.jsx';
import { Header } from './Header.jsx';
import { RouteLoading } from './RouteLoading.jsx';

export function PublicLayout() {
  const location = useLocation();

  // React Router doesn't auto-scroll to an in-page anchor on navigation the
  // way a full page load does -- do it ourselves whenever the hash changes
  // (links point at "/#clases" from other routes, "#clases" from home).
  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0 });
      return;
    }
    const el = document.getElementById(location.hash.slice(1));
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }, [location.pathname, location.hash]);

  return (
    <div className="flex min-h-screen flex-col bg-page">
      <a
        href="#contenido"
        className="focus-ring sr-only z-toast rounded-lg bg-lime px-4 py-3 font-semibold text-navy-500 focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>
      <Header />
      <main id="contenido" className="flex-1">
        <Suspense fallback={<RouteLoading />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
