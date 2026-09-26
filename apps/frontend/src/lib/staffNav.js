import { ROLE_CODES } from '@ctcj/shared';

import { resolvePostLoginRoute } from './postLoginRoute.js';

const {
  ADMINISTRADOR: ADMIN,
  RECEPCION: RECEP,
  ENTRENADOR: COACH,
  PSICOLOGO,
  NEUROPSICOLOGO,
  FISIOTERAPEUTA,
} = ROLE_CODES;

export const ALL_STAFF = [ADMIN, RECEP, COACH, PSICOLOGO, NEUROPSICOLOGO, FISIOTERAPEUTA];
export const CLINICAL_ROLES = [ADMIN, RECEP, PSICOLOGO, NEUROPSICOLOGO, FISIOTERAPEUTA];

/**
 * Staff console links, grouped as the sidebar shows them. `roles` mirrors
 * the RequireRole guards in App.jsx EXACTLY (same matrix as before the
 * redesign) -- the sidebar only hides what the router would refuse anyway,
 * and the backend stays the only real security. `counter` names a pending
 * count shown in amber (see useStaffCounters).
 */
export const STAFF_NAV = [
  {
    group: 'Día a día',
    items: [
      { key: 'inicio', label: 'Inicio', icon: 'home', roles: ALL_STAFF },
      {
        key: 'cobros',
        to: '/staff/pagos',
        label: 'Cobros',
        icon: 'wallet',
        roles: [ADMIN, RECEP],
        counter: 'unpaid',
      },
      {
        key: 'entrenador',
        to: '/staff/panel-entrenador',
        label: 'Clases de hoy',
        icon: 'calendar',
        roles: [ADMIN, COACH],
      },
      {
        key: 'clinico',
        to: '/staff/clinico',
        label: 'Salud y bienestar',
        icon: 'heart',
        roles: CLINICAL_ROLES,
      },
    ],
  },
  {
    group: 'Jugadores',
    items: [
      {
        key: 'membresias',
        to: '/staff/membresias',
        label: 'Membresías',
        icon: 'users',
        roles: [ADMIN, RECEP],
      },
      {
        key: 'solicitudes',
        to: '/staff/solicitudes',
        label: 'Solicitudes',
        icon: 'clipboard',
        roles: [ADMIN],
        counter: 'requests',
      },
      {
        key: 'notas',
        to: '/staff/notas',
        label: 'Notas y rendimiento',
        icon: 'note',
        roles: [ADMIN, COACH],
      },
    ],
  },
  {
    group: 'Competencia',
    items: [
      {
        key: 'competicion',
        to: '/staff/competicion',
        label: 'Ranking y partidos',
        icon: 'trophy',
        roles: ALL_STAFF,
      },
      { key: 'torneos', to: '/staff/torneos', label: 'Torneos', icon: 'trophy', roles: ALL_STAFF },
    ],
  },
  {
    group: 'Administración',
    items: [
      { key: 'finanzas', to: '/staff/finanzas', label: 'Finanzas', icon: 'chart', roles: [ADMIN] },
      { key: 'planes', to: '/staff/planes', label: 'Planes', icon: 'tag', roles: [ADMIN] },
      {
        key: 'precios',
        to: '/staff/precios',
        label: 'Precios de canchas',
        icon: 'tag',
        roles: [ADMIN],
      },
      {
        key: 'comunidad',
        to: '/staff/comunidad',
        label: 'Moderar comunidad',
        icon: 'shield',
        roles: [ADMIN, RECEP],
        counter: 'reports',
      },
    ],
  },
];

/** The sidebar for these roles: groups with only allowed items; "Inicio" goes to the role's own panel. */
export function staffNavFor(roles = []) {
  const allowed = (item) => item.roles.some((role) => roles.includes(role));
  const home = resolvePostLoginRoute(roles);
  return STAFF_NAV.map(({ group, items }) => ({
    group,
    items: items
      .filter(allowed)
      .map((item) => (item.key === 'inicio' ? { ...item, to: home } : item))
      // A coach's "Inicio" already IS their class panel -- don't list it twice.
      .filter(
        (item, _i, list) =>
          !(item.key === 'entrenador' && list.some((x) => x.key === 'inicio' && x.to === item.to)),
      ),
  })).filter((g) => g.items.length > 0);
}

/** Phone bottom bar: the first 4 allowed destinations; the rest go under "Más". */
export function splitForBottomBar(groups) {
  const flat = groups.flatMap((g) => g.items);
  return { primary: flat.slice(0, 4), more: flat.slice(4) };
}
