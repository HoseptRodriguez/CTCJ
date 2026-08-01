import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { Footer } from './Footer.jsx';
import { Header } from './Header.jsx';

export function PublicLayout() {
  const location = useLocation();

  // React Router doesn't auto-scroll to an in-page anchor on navigation the
  // way a full page load does -- do it ourselves whenever the hash changes
  // (nav links point at "/#club" from non-home routes, "#club" from home).
  useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0 });
      return;
    }
    const id = location.hash.slice(1);
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [location.pathname, location.hash]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
