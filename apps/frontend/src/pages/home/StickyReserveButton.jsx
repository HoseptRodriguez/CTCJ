import { useEffect, useState } from 'react';

import { CalendarIcon } from '../../components/icons/CalendarIcon.jsx';
import { Button } from '../../components/ui/Button.jsx';

/**
 * Phones only: a "Reservar cancha" bar fixed at the bottom of the home page.
 * It appears once the hero (which has its own button) has scrolled away and
 * hides again over the footer, so it never covers the club's details.
 *
 * @param {{ heroId: string }} props
 */
export function StickyReserveButton({ heroId }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById(heroId);
    const footer = document.querySelector('footer');
    if (!hero || typeof IntersectionObserver === 'undefined') return undefined;
    const seen = new Map();
    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) seen.set(e.target, e.isIntersecting);
      setVisible(!seen.get(hero) && !(footer && seen.get(footer)));
    });
    observer.observe(hero);
    if (footer) observer.observe(footer);
    return () => observer.disconnect();
  }, [heroId]);

  if (!visible) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-sticky border-t border-line bg-surface/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-lg md:hidden">
      <Button to="/canchas" size="lg" fullWidth icon={<CalendarIcon />}>
        Reservar cancha
      </Button>
    </div>
  );
}
