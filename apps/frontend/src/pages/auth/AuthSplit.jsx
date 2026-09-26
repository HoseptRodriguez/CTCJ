import { ClubPhoto } from '../../components/ui/ClubPhoto.jsx';

/**
 * Split screen for every account page (login, register, password, email
 * confirmation): a real club photo on the left -- no crest, no big title,
 * at most one short `tagline` -- and the form on the right. On phones the
 * photo shrinks to a band above the form.
 */
export function AuthSplit({ title, description, children, photo = 'accion-espera', tagline }) {
  return (
    <div className="grid min-h-[calc(100svh-84px)] bg-page lg:grid-cols-2">
      <div className="relative isolate flex min-h-[12rem] items-end overflow-hidden bg-navy-500 lg:min-h-0">
        <ClubPhoto
          name={photo}
          alt=""
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="absolute inset-0 -z-20 h-full w-full"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-t from-navy-500 via-navy-500/60 to-navy-500/20"
        />
        {tagline && (
          <p className="p-6 font-display text-h2 font-bold leading-tight text-white md:p-10">
            {tagline}
          </p>
        )}
      </div>

      <div className="flex items-start justify-center px-4 py-10 md:px-8 lg:items-center">
        <div className="w-full max-w-lg">
          <h1 className="font-display text-title font-bold text-ink md:text-title-lg">{title}</h1>
          {description && <p className="mt-3 text-lead text-ink-soft">{description}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Error box at the top of a form: what happened and how to fix it. */
export function FormError({ children }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="mb-6 rounded-lg border-2 border-danger bg-danger-soft p-4 text-body text-ink"
    >
      {children}
    </div>
  );
}
