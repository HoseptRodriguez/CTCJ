/** Joins truthy class-name fragments with a space. Tiny clsx-equivalent -- not worth a dependency for this. */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
