import { AlertTriangleIcon } from '../icons/AlertTriangleIcon.jsx';
import { RefreshIcon } from '../icons/RefreshIcon.jsx';

import { Button } from './Button.jsx';
import { cn } from './cn.js';

/**
 * Something failed. Say what happened in plain words (`title`) and how to
 * fix it (`description`) -- never a raw error code. With `onRetry`, offers
 * "Intentar de nuevo". Announced to screen readers when it appears.
 */
export function ErrorState({
  title = 'No pudimos cargar esta información',
  description = 'Revisa tu conexión a internet e intenta de nuevo. Si el problema sigue, avisa en recepción.',
  onRetry,
  retryLabel = 'Intentar de nuevo',
  retrying = false,
  className,
}) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-start gap-4 rounded-xl border-2 border-danger bg-danger-soft p-6 sm:flex-row',
        className,
      )}
    >
      <AlertTriangleIcon className="h-8 w-8 shrink-0 text-danger" />
      <div className="flex-1">
        <h2 className="font-display text-h3 font-bold text-ink">{title}</h2>
        <p className="mt-1 text-body text-ink">{description}</p>
        {onRetry && (
          <Button
            className="mt-4"
            variant="secondary"
            icon={<RefreshIcon />}
            onClick={onRetry}
            loading={retrying}
            loadingText="Intentando…"
          >
            {retryLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
