/** Stroke icon (24px grid). Decorative: always rendered next to visible text. */
export function CheckIcon(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
