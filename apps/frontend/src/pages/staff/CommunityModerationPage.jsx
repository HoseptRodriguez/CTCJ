import { useEffect, useState } from 'react';

import { communityAdminClient } from '../../api/communityAdminClient.js';
import { Button } from '../../components/ui/Button.jsx';
import { describeCommunityError } from '../../lib/communityErrorMessages.js';

const DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});
const TARGET_TYPE_LABELS = { POST: 'Publicación', COMMENT: 'Comentario' };

function ReportRow({ report, onResolved }) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState(null);

  async function handleDismiss() {
    setWorking(true);
    setError(null);
    try {
      await communityAdminClient.dismissReport(report.id);
      onResolved(report.id);
    } catch (err) {
      setError(describeCommunityError(err));
    } finally {
      setWorking(false);
    }
  }

  async function handleDeleteContent() {
    setWorking(true);
    setError(null);
    try {
      if (report.targetType === 'POST') {
        await communityAdminClient.deletePost(report.targetId);
      } else {
        await communityAdminClient.deleteComment(report.targetId);
      }
      onResolved(report.id);
    } catch (err) {
      setError(describeCommunityError(err));
    } finally {
      setWorking(false);
    }
  }

  const authorLabel = report.targetAuthor
    ? `${report.targetAuthor.firstName} ${report.targetAuthor.lastName}`
    : 'Jugador';
  const reporterLabel = report.reporter
    ? `${report.reporter.firstName} ${report.reporter.lastName}`
    : 'Jugador';

  return (
    <li className="rounded-md border border-neutral-200 bg-canvas p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-tertiary">
            {TARGET_TYPE_LABELS[report.targetType] ?? report.targetType} de {authorLabel}
          </p>
          <p className="mt-1 text-sm text-primary">
            {report.targetContent ?? <em className="text-tertiary">Contenido ya eliminado</em>}
          </p>
          <p className="mt-2 text-xs text-tertiary">
            Reportado por {reporterLabel} · {DATE_FORMATTER.format(new Date(report.createdAt))}
          </p>
          {report.reason ? (
            <p className="mt-1 text-sm text-secondary">&ldquo;{report.reason}&rdquo;</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={handleDeleteContent}
            disabled={working || !report.targetContent}
          >
            {working ? 'Guardando...' : 'Eliminar contenido'}
          </Button>
          <Button variant="outline" onClick={handleDismiss} disabled={working}>
            Descartar reporte
          </Button>
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-error">{error}</p> : null}
    </li>
  );
}

export function CommunityModerationPage() {
  const [reports, setReports] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    communityAdminClient
      .listReports()
      .then((data) => {
        if (!cancelled) setReports(data.reports);
      })
      .catch((err) => {
        if (!cancelled) setError(describeCommunityError(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function handleResolved(reportId) {
    setReports((prev) => (prev ? prev.filter((r) => r.id !== reportId) : prev));
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-primary">Comunidad</h1>
      <p className="mt-1 text-secondary">
        Publicaciones y comentarios reportados por jugadores, pendientes de revisión.
      </p>

      {error ? <p className="mt-4 text-sm text-error">{error}</p> : null}
      {!error && reports === null ? (
        <p className="mt-4 text-sm text-secondary">Cargando...</p>
      ) : null}
      {reports?.length === 0 ? (
        <p className="mt-4 text-sm text-secondary">No hay reportes pendientes.</p>
      ) : null}
      {reports?.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {reports.map((report) => (
            <ReportRow key={report.id} report={report} onResolved={handleResolved} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
