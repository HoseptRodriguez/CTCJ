import { useState } from 'react';

import { Badge } from '../../components/ui/Badge.jsx';
import { cn } from '../../components/ui/cn.js';
import { Section } from '../../components/ui/Section.jsx';

// No ranking schema exists yet anywhere in @ctcj/shared or the backend, so
// categories are numbered placeholders, never invented names. This section
// must never render player names or table rows -- see Ranking.test.jsx.
const CATEGORIES = ['Categoría 1', 'Categoría 2', 'Categoría 3', 'Categoría 4'];
const MODALITIES = [
  { value: 'singles', label: 'Singles' },
  { value: 'dobles', label: 'Dobles' },
];

export function Ranking() {
  const [modality, setModality] = useState('singles');
  const [category, setCategory] = useState(CATEGORIES[0]);

  return (
    <Section
      id="ranking"
      background="inverse"
      heading={{
        eyebrow: 'Competición CTCJ',
        title: 'Ranking interno del club',
        lede: 'Singles y dobles, cuatro categorías, dos temporadas al año y un Master al cierre de cada una. Sigue tu posición, tu camino al Master y la historia competitiva del club.',
      }}
    >
      <div className="mt-10 rounded-lg bg-canvas p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-200 pb-6">
          <div className="flex gap-2" role="tablist" aria-label="Modalidad">
            {MODALITIES.map((m) => (
              <button
                key={m.value}
                type="button"
                role="tab"
                aria-selected={modality === m.value}
                onClick={() => setModality(m.value)}
                className={cn(
                  'rounded-full px-4 py-2 font-display text-sm font-semibold uppercase tracking-wide transition-colors duration-fast',
                  modality === m.value ? 'bg-navy-500 text-on-inverse' : 'bg-sunken text-secondary',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-secondary">
            Temporada
            <select
              className="rounded-md border border-neutral-300 bg-canvas px-3 py-1.5 text-sm"
              disabled
              defaultValue="none"
            >
              <option value="none">Sin temporada activa</option>
            </select>
          </label>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              aria-pressed={category === cat}
              className={cn(
                'rounded-full border px-4 py-1.5 text-sm font-medium transition-colors duration-fast',
                category === cat
                  ? 'border-navy-500 bg-navy-50 text-primary'
                  : 'border-neutral-200 text-secondary',
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-dashed border-neutral-300 bg-raised p-10 text-center">
          <Badge />
          <p className="mt-4 font-display text-lg font-semibold text-primary">
            Todavía no hay una temporada activa
          </p>
          <p className="mx-auto mt-2 max-w-md text-secondary">
            El ranking se activa con la primera temporada del club. Vuelve pronto para ver la tabla
            de {category.toLowerCase()} en {modality === 'singles' ? 'singles' : 'dobles'}.
          </p>
        </div>
      </div>
    </Section>
  );
}
