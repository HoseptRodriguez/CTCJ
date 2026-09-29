import { mapIdentityError } from './errorMapping.js';

function asyncHandler(fn) {
  return (req, res, next) => {
    fn(req, res, next).catch((err) => next(mapIdentityError(err)));
  };
}

const MEMBERSHIP_LABELS = {
  ACTIVE: 'Al día',
  PENDING: 'Pendiente',
  OVERDUE: 'Vencida',
  SUSPENDED: 'Suspendida',
  INACTIVE: 'Inactiva',
};
const HAND_LABELS = { RIGHT: 'Diestro', LEFT: 'Zurdo', AMBIDEXTROUS: 'Ambidiestro' };
const BACKHAND_LABELS = { ONE_HANDED: 'A una mano', TWO_HANDED: 'A dos manos' };
const yesNo = (v) => (v ? 'Sí' : 'No');
const BOM = String.fromCharCode(0xfeff);
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');

/**
 * One CSV cell. Quotes when needed, and neutralizes text that a
 * spreadsheet would run as a formula (=, +, -, @): CSV injection.
 */
export function csvCell(value) {
  let text = String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const COLUMNS = [
  ['Nombre', (r) => r.firstName],
  ['Apellido', (r) => r.lastName],
  ['Correo', (r) => r.email],
  ['Celular', (r) => r.phone],
  ['Jugador', (r) => yesNo(r.isJugador)],
  ['Categoría', (r) => r.categories.join(' / ')],
  [
    'Membresía',
    (r) => (r.membershipStatus ? MEMBERSHIP_LABELS[r.membershipStatus] : 'Sin membresía'),
  ],
  ['Mano dominante', (r) => HAND_LABELS[r.dominantHand] ?? ''],
  ['Revés', (r) => BACKHAND_LABELS[r.backhand] ?? ''],
  ['Menor de edad', (r) => yesNo(r.isMinor)],
  ['Pendiente de autorización del acudiente', (r) => yesNo(r.pendingGuardianAuthorization)],
  ['Cuenta', (r) => (r.active ? 'Activa' : 'Desactivada')],
  ['Último ingreso', (r) => day(r.lastLoginAt)],
  ['Registro', (r) => day(r.createdAt)],
];

export function directoryCsv(rows) {
  const lines = [
    COLUMNS.map(([h]) => csvCell(h)).join(','),
    ...rows.map((r) => COLUMNS.map(([, get]) => csvCell(get(r))).join(',')),
  ];
  // The BOM makes Excel read accents as UTF-8.
  return `${BOM}${lines.join('\r\n')}\r\n`;
}

/** @param {ReturnType<import('../compositionRoot.js').buildIdentityContainer>} container */
export function createStaffDirectoryController(container) {
  const actor = (req) => ({ userId: req.user.id, roles: req.user.roles ?? [] });

  return {
    list: asyncHandler(async (req, res) => {
      res
        .status(200)
        .json(await container.listDirectory({ viewerRoles: req.user.roles ?? [], ...req.query }));
    }),

    exportCsv: asyncHandler(async (req, res) => {
      const filters = { ...req.query };
      delete filters.page;
      const { tab, rows } = await container.exportDirectory({
        viewerRoles: req.user.roles ?? [],
        ...filters,
      });
      await container.recordDirectoryExport({
        actor: actor(req),
        filters: { ...filters, tab },
        rows: rows.length,
      });
      const date = new Date().toISOString().slice(0, 10);
      res.set('Content-Type', 'text/csv; charset=utf-8');
      res.set('Cache-Control', 'no-store');
      res.set(
        'Content-Disposition',
        `attachment; filename="${tab === 'all' ? 'usuarios' : 'jugadores'}-ctcj-${date}.csv"`,
      );
      res.status(200).send(directoryCsv(rows));
    }),

    getFile: asyncHandler(async (req, res) => {
      res
        .status(200)
        .json(
          await container.getUserFile({ viewerRoles: req.user.roles ?? [], userId: req.params.id }),
        );
    }),

    grantPlayer: asyncHandler(async (req, res) => {
      res
        .status(200)
        .json(
          await container.setPlayerRole({ actor: actor(req), userId: req.params.id, grant: true }),
        );
    }),

    revokePlayer: asyncHandler(async (req, res) => {
      res
        .status(200)
        .json(
          await container.setPlayerRole({ actor: actor(req), userId: req.params.id, grant: false }),
        );
    }),

    deactivate: asyncHandler(async (req, res) => {
      res.status(200).json(
        await container.setAccountActive({
          actor: actor(req),
          userId: req.params.id,
          active: false,
        }),
      );
    }),

    reactivate: asyncHandler(async (req, res) => {
      res.status(200).json(
        await container.setAccountActive({
          actor: actor(req),
          userId: req.params.id,
          active: true,
        }),
      );
    }),

    resendVerification: asyncHandler(async (req, res) => {
      res
        .status(200)
        .json(await container.resendVerification({ actor: actor(req), userId: req.params.id }));
    }),
  };
}
