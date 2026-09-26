import { ROLE_CODES } from '@ctcj/shared';
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { membershipClient } from '../api/membershipClient.js';
import { SearchIcon } from '../components/icons/SearchIcon.jsx';
import { CLINICAL_ROLES } from '../lib/staffNav.js';

const LOOKUP_ROLES = [ROLE_CODES.ADMINISTRADOR, ROLE_CODES.RECEPCION, ROLE_CODES.ENTRENADOR];

/**
 * "Buscar jugador por nombre o correo". An e-mail finds the full account
 * (staff lookup); a name finds players (the name search never returns
 * e-mails, by design). Each result links only to the pages this role may
 * open, pre-selecting that person there.
 */
export function StaffSearch({ roles }) {
  const has = (list) => list.some((r) => roles.includes(r));
  const canDesk = has([ROLE_CODES.ADMINISTRADOR, ROLE_CODES.RECEPCION]);
  const canNotes = has([ROLE_CODES.ADMINISTRADOR, ROLE_CODES.ENTRENADOR]);
  const canClinical = has(CLINICAL_ROLES);
  const canLookup = has(LOOKUP_ROLES);

  const [query, setQuery] = useState('');
  const [state, setState] = useState({ status: 'idle', results: [] });
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const listId = useId();

  useEffect(() => {
    const q = query.trim();
    const isEmail = q.includes('@');
    if (q.length < 2 || (isEmail && !/^\S+@\S+\.\S+$/.test(q))) {
      setState({ status: 'idle', results: [] });
      return undefined;
    }
    if (isEmail && !canLookup) {
      setState({ status: 'no-permission', results: [] });
      return undefined;
    }
    let cancelled = false;
    setState((s) => ({ ...s, status: 'loading' }));
    const timer = setTimeout(() => {
      const job = isEmail
        ? membershipClient
            .lookupUser(q)
            .then((u) => [
              { id: u.id, firstName: u.firstName, lastName: u.lastName, email: u.email },
            ])
        : membershipClient.searchPlayers(q).then((d) => d.players);
      job
        .then((results) => !cancelled && setState({ status: 'ready', results }))
        .catch(
          (err) =>
            !cancelled &&
            setState({ status: err?.status === 404 ? 'ready' : 'error', results: [] }),
        );
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, canLookup]);

  useEffect(() => {
    function close(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const show = open && state.status !== 'idle';

  function links(person) {
    const params = `jugador=${person.id}&nombre=${encodeURIComponent(`${person.firstName} ${person.lastName}`)}`;
    return [
      canDesk &&
        person.email && {
          to: `/staff/membresias?correo=${encodeURIComponent(person.email)}`,
          label: 'Membresía',
        },
      canNotes && { to: `/staff/notas?${params}`, label: 'Notas' },
      canClinical && { to: `/staff/clinico?${params}`, label: 'Salud' },
    ].filter(Boolean);
  }

  return (
    <div
      ref={boxRef}
      className="relative max-w-xl"
      onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
    >
      <label className="sr-only" htmlFor={`${listId}-input`}>
        Buscar jugador por nombre o correo
      </label>
      <SearchIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-soft" />
      <input
        id={`${listId}-input`}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar jugador por nombre o correo"
        aria-expanded={show}
        aria-controls={listId}
        autoComplete="off"
        className="focus-ring block min-h-btn w-full rounded-lg border-2 border-line-strong bg-surface pl-12 pr-4 text-body text-ink placeholder:text-ink-soft"
      />
      {show && (
        <div
          id={listId}
          role="region"
          aria-label="Resultados de la búsqueda"
          aria-live="polite"
          className="absolute left-0 right-0 z-dropdown mt-2 max-h-[70vh] overflow-y-auto rounded-xl border border-line bg-surface p-2 shadow-lg"
        >
          {state.status === 'loading' && <p className="p-3 text-body text-ink-soft">Buscando…</p>}
          {state.status === 'error' && (
            <p className="p-3 text-body text-ink">No pudimos buscar. Revisa tu conexión.</p>
          )}
          {state.status === 'no-permission' && (
            <p className="p-3 text-body text-ink">
              Tu rol no puede buscar por correo. Escribe el nombre del jugador.
            </p>
          )}
          {state.status === 'ready' && state.results.length === 0 && (
            <p className="p-3 text-body text-ink">
              No encontramos a nadie. Revisa cómo está escrito.
            </p>
          )}
          {state.status === 'ready' && state.results.length > 0 && (
            <ul className="space-y-1">
              {state.results.map((person) => (
                <li key={person.id} className="rounded-lg p-3 hover:bg-page">
                  <p className="text-body font-semibold text-ink">
                    {person.firstName} {person.lastName}
                  </p>
                  {person.email && <p className="text-body-sm text-ink-soft">{person.email}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {links(person).map((l) => (
                      <Link
                        key={l.to}
                        to={l.to}
                        onClick={() => {
                          setOpen(false);
                          setQuery('');
                        }}
                        className="focus-ring inline-flex min-h-btn items-center rounded-lg border-2 border-navy-500 px-3 text-body-sm font-semibold text-navy-500 hover:bg-navy-50"
                      >
                        {l.label}
                      </Link>
                    ))}
                  </div>
                  {!person.email && canDesk && (
                    <p className="mt-2 text-body-sm text-ink-soft">
                      Para ver su membresía, búscalo por correo.
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
