import { ROLE_CODES } from '@ctcj/shared';
import { useEffect, useId, useState } from 'react';

import { membershipClient } from '../../api/membershipClient.js';
import { SearchIcon } from '../../components/icons/SearchIcon.jsx';

/**
 * "Buscar jugador": type a name (or an e-mail, when `allowEmail`) and pick
 * from big result buttons. Calls onSelect({ id, firstName, lastName }).
 * @param {{ onSelect: (p: {id: string, firstName: string, lastName: string}) => void,
 *   allowEmail?: boolean, label?: string, className?: string }} props
 */
export function PlayerPicker({ onSelect, allowEmail = true, label = 'Buscar jugador', className }) {
  const [query, setQuery] = useState('');
  const [state, setState] = useState({ status: 'idle', results: [] });
  const id = useId();

  useEffect(() => {
    const q = query.trim();
    const isEmail = q.includes('@');
    if (q.length < 2 || (isEmail && !/^\S+@\S+\.\S+$/.test(q))) {
      setState({ status: 'idle', results: [] });
      return undefined;
    }
    if (isEmail && !allowEmail) {
      setState({ status: 'no-email', results: [] });
      return undefined;
    }
    let cancelled = false;
    setState((s) => ({ ...s, status: 'loading' }));
    const timer = setTimeout(() => {
      const job = isEmail
        ? membershipClient.lookupUser(q).then((u) => {
            // An e-mail can belong to any account; only players have notes.
            if (!(u.roleCodes ?? []).includes(ROLE_CODES.JUGADOR))
              throw Object.assign(new Error(), { notPlayer: true });
            return [u];
          })
        : membershipClient.searchPlayers(q).then((d) => d.players);
      job
        .then((results) => !cancelled && setState({ status: 'ready', results }))
        .catch((err) => {
          if (cancelled) return;
          const status = err?.notPlayer ? 'not-player' : err?.status === 404 ? 'ready' : 'error';
          setState({ status, results: [] });
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, allowEmail]);

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-2 block text-body font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" />
        <input
          id={id}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={allowEmail ? 'Nombre o correo' : 'Nombre del jugador'}
          autoComplete="off"
          aria-describedby={`${id}-status`}
          className="focus-ring block min-h-btn w-full rounded-lg border-2 border-line-strong bg-surface pl-12 pr-4 text-body text-ink placeholder:text-ink-soft"
        />
      </div>
      <div id={`${id}-status`} aria-live="polite" className="mt-2">
        {state.status === 'loading' && <p className="text-body text-ink-soft">Buscando…</p>}
        {state.status === 'error' && (
          <p className="text-body text-ink">No pudimos buscar. Intenta de nuevo.</p>
        )}
        {state.status === 'no-email' && <p className="text-body text-ink">Busca por nombre.</p>}
        {state.status === 'not-player' && (
          <p className="text-body text-ink">Esa cuenta no es de un jugador.</p>
        )}
        {state.status === 'ready' && state.results.length === 0 && (
          <p className="text-body text-ink">No encontramos a nadie con ese nombre.</p>
        )}
      </div>
      {state.status === 'ready' && state.results.length > 0 && (
        <ul className="mt-1 space-y-2" aria-label="Resultados">
          {state.results.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  onSelect({ id: p.id, firstName: p.firstName, lastName: p.lastName });
                  setQuery('');
                }}
                className="focus-ring flex min-h-btn w-full items-center rounded-lg border-2 border-line bg-surface px-4 text-left text-body font-semibold text-ink hover:border-navy-500 hover:bg-navy-50"
              >
                {p.firstName} {p.lastName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
