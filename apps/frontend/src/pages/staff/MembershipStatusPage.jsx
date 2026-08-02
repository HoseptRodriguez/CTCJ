import { useEffect, useState } from 'react';
import { MEMBERSHIP_STATUS, ROLE_CODES, ROLE_DEFINITIONS } from '@ctcj/shared';

import { membershipClient } from '../../api/membershipClient.js';
import { Button } from '../../components/ui/Button.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { describeIdentityError } from '../../lib/identityErrorMessages.js';
import { describeBookingError } from '../../lib/bookingErrorMessages.js';
import {
  MEMBERSHIP_STATUS_DISPLAY,
  describeMembershipStatus,
} from '../../lib/membershipStatusLabels.js';

const STATUS_OPTIONS = [null, ...Object.values(MEMBERSHIP_STATUS)];

function StatusBadge({ status }) {
  const display = MEMBERSHIP_STATUS_DISPLAY[status];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
        display ? display.className : 'border-neutral-200 bg-neutral-100 text-secondary'
      }`}
    >
      {describeMembershipStatus(status)}
    </span>
  );
}

function LookupForm({ onFound }) {
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setSearching(true);
    setError(null);
    try {
      const user = await membershipClient.lookupUser(email.trim());
      onFound(user);
    } catch (err) {
      setError(describeIdentityError(err));
      onFound(null);
    } finally {
      setSearching(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="lookup-email" className="block text-sm font-semibold text-primary">
          Correo del jugador
        </label>
        <input
          id="lookup-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jugador@correo.com"
          className="mt-1 w-72 rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
        />
      </div>
      <Button type="submit" variant="primary" disabled={searching || !email}>
        {searching ? 'Buscando...' : 'Buscar'}
      </Button>
      {error ? <p className="w-full text-sm text-error">{error}</p> : null}
    </form>
  );
}

function UserMembershipCard({ user, canEdit, onUpdated }) {
  const [status, setStatus] = useState(user.membershipStatus);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const result = await membershipClient.setMembershipStatus(user.id, status);
      onUpdated(result.membershipStatus);
      setSaved(true);
    } catch (err) {
      setError(describeIdentityError(err));
    } finally {
      setSaving(false);
    }
  }

  const roleNames = user.roleCodes.map(
    (code) => ROLE_DEFINITIONS.find((role) => role.code === code)?.name ?? code,
  );

  return (
    <div className="mt-6 rounded-md border border-neutral-200 bg-canvas p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display font-semibold text-primary">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-sm text-secondary">{user.email}</p>
          <p className="mt-1 text-xs text-tertiary">Rol: {roleNames.join(', ')}</p>
        </div>
        <StatusBadge status={user.membershipStatus} />
      </div>

      {canEdit ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="membership-status-select">
            Estado de membresía
          </label>
          <select
            id="membership-status-select"
            value={status ?? ''}
            onChange={(e) => {
              setStatus(e.target.value || null);
              setSaved(false);
            }}
            disabled={saving}
            className="rounded-md border border-neutral-300 bg-canvas px-3 py-2 text-sm"
          >
            {STATUS_OPTIONS.map((value) => (
              <option key={value ?? 'none'} value={value ?? ''}>
                {describeMembershipStatus(value)}
              </option>
            ))}
          </select>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </div>
      ) : null}
      {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}
      {saved ? <p className="mt-2 text-sm text-success">Estado actualizado.</p> : null}
    </div>
  );
}

function OverduePolicyCard() {
  const [enabled, setEnabled] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    membershipClient
      .getOverduePolicy()
      .then((data) => {
        if (!cancelled) setEnabled(data.enabled);
      })
      .catch((err) => {
        if (!cancelled) setError(describeBookingError(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleToggle() {
    const next = !enabled;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const result = await membershipClient.setOverduePolicy(next);
      setEnabled(result.enabled);
      setSaved(true);
    } catch (err) {
      setError(describeBookingError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-8 rounded-md border border-neutral-200 bg-canvas p-4">
      <h2 className="font-display text-lg font-semibold text-primary">
        Bloqueo de reservas por mora
      </h2>
      <p className="mt-1 text-sm text-secondary">
        Cuando está activo, los jugadores con estado Vencido, Inactivo o Suspendido no pueden crear
        nuevas reservas de cancha. Nunca afecta el acceso a información deportiva ni clínica.
      </p>

      {error ? <p className="mt-3 text-sm text-error">{error}</p> : null}

      {enabled === null && !error ? (
        <p className="mt-3 text-sm text-secondary">Cargando...</p>
      ) : (
        <div className="mt-3 flex items-center gap-3">
          <Button variant={enabled ? 'danger' : 'primary'} onClick={handleToggle} disabled={saving}>
            {saving ? 'Guardando...' : enabled ? 'Desactivar bloqueo' : 'Activar bloqueo'}
          </Button>
          <span className="text-sm text-secondary">
            Estado actual: <strong>{enabled ? 'Activo' : 'Desactivado'}</strong>
          </span>
        </div>
      )}
      {saved ? <p className="mt-2 text-sm text-success">Política actualizada.</p> : null}
    </div>
  );
}

export function MembershipStatusPage() {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes(ROLE_CODES.ADMINISTRADOR);
  const [foundUser, setFoundUser] = useState(null);

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-primary">Membresías</h1>
      <p className="mt-1 text-secondary">
        {isAdmin
          ? 'Consulta y actualiza el estado de membresía de un jugador. Este estado es independiente de su rol en la plataforma.'
          : 'Consulta el estado de membresía de un jugador. Solo un administrador puede modificarlo.'}
      </p>

      <div className="mt-6">
        <LookupForm onFound={setFoundUser} />
      </div>

      {foundUser ? (
        <UserMembershipCard
          key={foundUser.id}
          user={foundUser}
          canEdit={isAdmin}
          onUpdated={(membershipStatus) =>
            setFoundUser((prev) => (prev ? { ...prev, membershipStatus } : prev))
          }
        />
      ) : null}

      {isAdmin ? <OverduePolicyCard /> : null}
    </div>
  );
}
