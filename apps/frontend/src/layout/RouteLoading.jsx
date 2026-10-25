import { ClubMark } from '../components/ui/ClubMark.jsx';
import { Skeleton, SkeletonGroup } from '../components/ui/Skeleton.jsx';

/** Shown inside a layout while the next screen's code downloads. */
export function RouteLoading() {
  return (
    <SkeletonGroup
      label="Cargando…"
      className="mx-auto max-w-container space-y-4 px-4 py-10 md:px-8"
    >
      <ClubMark tone="light" size="sm" className="opacity-80" />
      <Skeleton className="h-12 w-2/3 max-w-md" />
      <Skeleton className="h-6 w-full max-w-xl" />
      <Skeleton className="mt-6 h-48 w-full" />
    </SkeletonGroup>
  );
}
