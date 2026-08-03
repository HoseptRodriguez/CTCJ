import { useEffect, useState } from 'react';

import { affiliationClient } from '../../api/affiliationClient.js';
import { guardianshipClient } from '../../api/guardianshipClient.js';
import { Button } from '../../components/ui/Button.jsx';
import { describeIdentityError } from '../../lib/identityErrorMessages.js';

const DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function AffiliationRequestRow({ request, onDecided }) {
  const [deciding, setDeciding] = useState(false);
  const [error, setError] = useState(null);

  async function decide(decision) {
    setDeciding(true);
    setError(null);
    try {
      await affiliationClient.decideRequest(request.id, { decision });
      onDecided(request.id);
    } catch (err) {
      setError(describeIdentityError(err));
    } finally {
      setDeciding(false);
    }
  }

  return (
    <li className="rounded-md border border-neutral-200 bg-canvas p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display font-semibold text-primary">
            {request.userFirstName} {request.userLastName}
          </p>
          <p className="text-sm text-secondary">{request.userEmail}</p>
          <p className="mt-1 text-xs text-tertiary">
            Solicitado: {DATE_FORMATTER.format(new Date(request.requestedAt))}
          </p>
          {request.notes ? (
            <p className="mt-2 text-sm text-secondary">&ldquo;{request.notes}&rdquo;</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={() => decide('APPROVED')} disabled={deciding}>
            {deciding ? 'Guardando...' : 'Aprobar'}
          </Button>
          <Button variant="outline" onClick={() => decide('REJECTED')} disabled={deciding}>
            Rechazar
          </Button>
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}
    </li>
  );
}

function GuardianshipRow({ guardianship, onDecided }) {
  const [deciding, setDeciding] = useState(false);
  const [error, setError] = useState(null);

  async function decide(decision) {
    setDeciding(true);
    setError(null);
    try {
      await guardianshipClient.decideGuardianship(guardianship.id, { decision });
      onDecided(guardianship.id);
    } catch (err) {
      setError(describeIdentityError(err));
    } finally {
      setDeciding(false);
    }
  }

  const permissions = [
    guardianship.canBook ? 'reservar' : null,
    guardianship.canPay ? 'pagar' : null,
  ].filter(Boolean);

  return (
    <li className="rounded-md border border-neutral-200 bg-canvas p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display font-semibold text-primary">
            {guardianship.guardianEmail}
            <span className="mx-2 text-tertiary">→</span>
            {guardianship.minorEmail}
          </p>
          <p className="mt-1 text-xs text-tertiary">
            Permisos solicitados: {permissions.length > 0 ? permissions.join(', ') : 'ninguno'}
          </p>
          <p className="mt-1 text-xs text-tertiary">
            Solicitado: {DATE_FORMATTER.format(new Date(guardianship.requestedAt))}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={() => decide('APPROVED')} disabled={deciding}>
            {deciding ? 'Guardando...' : 'Aprobar'}
          </Button>
          <Button variant="outline" onClick={() => decide('REJECTED')} disabled={deciding}>
            Rechazar
          </Button>
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}
    </li>
  );
}

export function RequestsPage() {
  const [affiliationRequests, setAffiliationRequests] = useState(null);
  const [affiliationError, setAffiliationError] = useState(null);
  const [guardianships, setGuardianships] = useState(null);
  const [guardianshipError, setGuardianshipError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    affiliationClient
      .listRequests('PENDING')
      .then((data) => {
        if (!cancelled) setAffiliationRequests(data.requests);
      })
      .catch((err) => {
        if (!cancelled) setAffiliationError(describeIdentityError(err));
      });
    guardianshipClient
      .listGuardianships('PENDING')
      .then((data) => {
        if (!cancelled) setGuardianships(data.guardianships);
      })
      .catch((err) => {
        if (!cancelled) setGuardianshipError(describeIdentityError(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleAffiliationDecided(id) {
    setAffiliationRequests((prev) => (prev ? prev.filter((r) => r.id !== id) : prev));
  }

  function handleGuardianshipDecided(id) {
    setGuardianships((prev) => (prev ? prev.filter((g) => g.id !== id) : prev));
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-primary">Solicitudes</h1>
      <p className="mt-1 text-secondary">
        Solicitudes de afiliación (Usuario → Jugador) y de vinculación familiar pendientes de
        revisión.
      </p>

      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold text-primary">
          Solicitudes de afiliación
        </h2>
        {affiliationError ? <p className="mt-2 text-sm text-error">{affiliationError}</p> : null}
        {!affiliationError && affiliationRequests === null ? (
          <p className="mt-2 text-sm text-secondary">Cargando...</p>
        ) : null}
        {affiliationRequests?.length === 0 ? (
          <p className="mt-2 text-sm text-secondary">No hay solicitudes pendientes.</p>
        ) : null}
        {affiliationRequests?.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {affiliationRequests.map((request) => (
              <AffiliationRequestRow
                key={request.id}
                request={request}
                onDecided={handleAffiliationDecided}
              />
            ))}
          </ul>
        ) : null}
      </section>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold text-primary">
          Vinculaciones familiares
        </h2>
        {guardianshipError ? <p className="mt-2 text-sm text-error">{guardianshipError}</p> : null}
        {!guardianshipError && guardianships === null ? (
          <p className="mt-2 text-sm text-secondary">Cargando...</p>
        ) : null}
        {guardianships?.length === 0 ? (
          <p className="mt-2 text-sm text-secondary">No hay vinculaciones pendientes.</p>
        ) : null}
        {guardianships?.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {guardianships.map((guardianship) => (
              <GuardianshipRow
                key={guardianship.id}
                guardianship={guardianship}
                onDecided={handleGuardianshipDecided}
              />
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
