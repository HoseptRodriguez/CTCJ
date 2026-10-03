import { ROLE_CODES } from '@ctcj/shared';
import { useState } from 'react';

import { directoryClient } from '../../api/directoryClient.js';
import { Card } from '../../components/ui/Card.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { Switch } from '../../components/ui/Switch.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { describeIdentityError } from '../../lib/identityErrorMessages.js';

/** The staff roles Administración gives and takes, in the order people think of them. */
export const STAFF_ROLES = [
  {
    code: ROLE_CODES.ENTRENADOR,
    label: 'Entrenador',
    text: 'Ve a sus jugadores, escribe notas y evaluaciones, y registra resultados.',
  },
  {
    code: ROLE_CODES.RECEPCION,
    label: 'Recepción',
    text: 'Cobros, reservas, membresías, solicitudes y moderación.',
  },
  {
    code: ROLE_CODES.PSICOLOGO,
    label: 'Psicología',
    text: 'Atiende y registra citas y notas de psicología (datos de salud).',
    mfa: true,
  },
  {
    code: ROLE_CODES.NEUROPSICOLOGO,
    label: 'Neuropsicología',
    text: 'Atiende y registra citas y notas de neuropsicología (datos de salud).',
    mfa: true,
  },
  {
    code: ROLE_CODES.FISIOTERAPEUTA,
    label: 'Fisioterapia',
    text: 'Atiende y registra fisioterapia y aptitud física (datos de salud).',
    mfa: true,
  },
  {
    code: ROLE_CODES.ADMINISTRADOR,
    label: 'Administración',
    text: 'Acceso total a la consola: precios, finanzas, roles y datos personales.',
    mfa: true,
  },
];

/**
 * "Roles del personal" in a person's file (Administración only). Each
 * change is confirmed and recorded in the audit log. Not shown on one's own
 * file: nobody changes their own roles.
 *
 * @param {{ file: { id: string, firstName: string, roles: string[], active: boolean,
 *   emailVerified: boolean }, onChanged: () => void }} props
 */
export function StaffRolesCard({ file, onChanged }) {
  const toast = useToast();
  const [pending, setPending] = useState(null); // { role, grant }
  const [busy, setBusy] = useState(false);
  const canGrant = file.active && file.emailVerified;

  async function run() {
    setBusy(true);
    try {
      await directoryClient.setStaffRole(file.id, pending.role.code, pending.grant);
      toast({
        title: pending.grant
          ? `${file.firstName} ahora tiene el rol de ${pending.role.label}`
          : `${file.firstName} ya no tiene el rol de ${pending.role.label}`,
        tone: 'success',
      });
      onChanged();
    } catch (err) {
      toast({
        title: 'No se pudo cambiar',
        description: describeIdentityError(err),
        tone: 'error',
      });
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  return (
    <Card className="mb-6">
      <h2 id="roles-personal" className="font-display text-h3 font-bold text-ink">
        Roles del personal
      </h2>
      <p className="mt-1 text-body text-ink-soft">
        Dale a esta persona acceso a la consola del club. Cada cambio queda registrado.
        {!canGrant && ' Para dar un rol, la cuenta debe estar activa y con el correo confirmado.'}
      </p>
      <ul className="mt-4 divide-y divide-line">
        {STAFF_ROLES.map((role) => {
          const has = file.roles.includes(role.code);
          return (
            <li key={role.code} className="py-3">
              <Switch
                label={role.label}
                description={role.text}
                checked={has}
                disabled={busy || (!has && !canGrant)}
                onChange={(grant) => setPending({ role, grant })}
              />
            </li>
          );
        })}
      </ul>
      <ConfirmDialog
        open={pending != null}
        tone={pending?.grant ? 'primary' : 'danger'}
        title={
          pending
            ? pending.grant
              ? `¿Darle a ${file.firstName} el rol de ${pending.role.label}?`
              : `¿Quitarle a ${file.firstName} el rol de ${pending.role.label}?`
            : ''
        }
        description={
          pending
            ? pending.grant
              ? `${pending.role.text}${
                  pending.role.mfa
                    ? ' La próxima vez que entre, se le pedirá activar la verificación en dos pasos.'
                    : ''
                }`
              : 'Deja de tener ese acceso desde su próxima acción. Su cuenta y sus datos se conservan.'
            : ''
        }
        confirmLabel={pending?.grant ? 'Sí, dar el rol' : 'Sí, quitar el rol'}
        loading={busy}
        onConfirm={run}
        onCancel={() => setPending(null)}
      />
    </Card>
  );
}
