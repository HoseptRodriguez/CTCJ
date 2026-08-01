/**
 * Real CTCJ design tokens, ported verbatim from the already-audited and
 * club-confirmed token source (`design/tokens/tokens.json` in the v7
 * checkout, backed by `design/AUDITORIA-DE-MARCA.md`). No literal color
 * values should be written in component code -- use these token classes
 * (`bg-navy-500`, `text-secondary`, `bg-action`, etc.) so changing the brand
 * later means changing this file, not hunting through components.
 *
 * Two things remain genuinely unresolved by the club (not this project's
 * call to make): a vector logo source, and horizontal hero photography.
 * Everything else here (colors, typography, spacing) is real and confirmed.
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#E8ECF3',
          100: '#C9D2E2',
          200: '#93A3C3',
          300: '#5D74A4',
          400: '#2E4881',
          500: '#001A4D', // official navy
          600: '#001642',
          700: '#001236',
          800: '#000D28',
          900: '#00081A',
        },
        green: {
          50: '#F2FBEC',
          100: '#E1F6D4',
          200: '#C6EEAC',
          300: '#9EE67C', // official green -- action color, NEVER white text on it (1.49:1 fails)
          400: '#7FD455',
          500: '#63B93B',
          600: '#4C942E',
          700: '#3A7024',
        },
        neutral: {
          0: '#FFFFFF',
          50: '#F9FAFA',
          100: '#F2F3F4',
          200: '#E5E6E7',
          300: '#CFD1D4',
          400: '#ADB0B5',
          500: '#8D9198',
          600: '#6B7079',
          700: '#5A606A',
          800: '#434A55',
          900: '#303744',
          950: '#252C3A',
        },
        // Semantic aliases -- what components actually write.
        action: '#9EE67C', // primary button fill; pair with text-on-action, never text-white
        'on-action': '#001A4D',
        canvas: '#FFFFFF',
        raised: '#F9FAFA',
        sunken: '#F2F3F4',
        inverse: '#001A4D',
        'inverse-raised': '#001642',
        primary: '#001A4D', // text-primary, 16.73:1 on white
        secondary: '#5A606A', // text-secondary, 6.33:1 on white
        tertiary: '#6B7079', // text-tertiary, 4.98:1 -- lightest allowed for text on white
        'on-inverse': '#FFFFFF',
        'on-inverse-muted': '#C9D2E2',
        success: '#4C942E', // readable-on-white green; brand green (#9EE67C) is not
        error: '#E20000',
        warning: '#996300', // brand orange darkened 40% -- raw #FFA500 fails at 1.97:1 as text
        'warning-fill': '#FFA500', // fill only, paired with navy text, never text-on-white
        info: '#2E4881',
        court: {
          clay: '#B25B3C', // editorial/public-site use only, pending club approval
          clayLight: '#D98F72',
        },
        // Booking status tokens -- must match apps/backend's RESERVATION_STATUS
        // exactly (see packages/shared/src/constants/reservations.js). Every
        // state also carries a text label in the UI, never color alone
        // (accessibility rule) -- non-bookable states additionally get a
        // diagonal stripe pattern, see src/lib/bookingTokens.js.
        booking: {
          'available-fill': '#FFFFFF',
          'available-border': '#CFD1D4',
          'available-text': '#001A4D',
          'occupied-fill': '#E5E6E7',
          'occupied-border': '#CFD1D4',
          'occupied-text': '#5A606A',
          'mine-fill': '#9EE67C',
          'mine-border': '#4C942E',
          'mine-text': '#001A4D',
          'class-fill': '#E8ECF3',
          'class-border': '#93A3C3',
          'class-text': '#001A4D',
          'tournament-fill': '#C9D2E2',
          'tournament-border': '#5D74A4',
          'tournament-text': '#001A4D',
          'maintenance-fill': '#F2F3F4',
          'maintenance-border': '#ADB0B5',
          'maintenance-text': '#5A606A',
          'blocked-fill': '#F2F3F4',
          'blocked-border': '#ADB0B5',
          'blocked-text': '#5A606A',
        },
        // Back-compat aliases so the existing Register/Login/VerifyEmail
        // pages keep working unmodified -- see tokens.css and the Phase 3
        // plan for why these aren't renamed in this phase.
        brand: {
          DEFAULT: '#001A4D',
          accent: '#9EE67C',
        },
      },
      fontFamily: {
        display: ['"Archivo Narrow"', '"Helvetica Neue Condensed"', '"Arial Narrow"', 'sans-serif'],
        sans: ['Archivo', '"Helvetica Neue"', 'Arial', 'sans-serif'],
      },
      fontSize: {
        xs: '0.8125rem',
        sm: '0.875rem',
        base: '1rem',
        lg: '1.125rem',
        xl: '1.375rem',
        '2xl': '1.75rem',
        '3xl': '2.25rem',
        '4xl': '3rem',
        '5xl': '4rem',
        '6xl': '5.5rem',
      },
      lineHeight: {
        tight: '1.05',
        snug: '1.2',
        normal: '1.55',
        relaxed: '1.7',
      },
      letterSpacing: {
        tighter: '-0.02em',
        tight: '-0.01em',
        normal: '0',
        wide: '0.04em',
        eyebrow: '0.14em',
      },
      // Tailwind's default spacing scale (1=0.25rem, 2=0.5rem, ... 40=10rem)
      // already matches the token spacing scale exactly -- no override needed.
      borderRadius: {
        none: '0',
        sm: '2px',
        md: '4px',
        lg: '8px',
        full: '9999px',
      },
      boxShadow: {
        none: 'none',
        sm: '0 1px 2px rgba(0, 26, 77, 0.06)',
        md: '0 2px 8px rgba(0, 26, 77, 0.08)',
        lg: '0 8px 24px rgba(0, 26, 77, 0.10)',
      },
      // Tailwind's default screens (640/768/1024/1280/1536) already match
      // the token breakpoints exactly -- no override needed.
      zIndex: {
        base: '0',
        raised: '10',
        sticky: '100',
        header: '200',
        dropdown: '300',
        overlay: '400',
        modal: '500',
        toast: '600',
      },
      transitionDuration: {
        instant: '80ms',
        fast: '150ms',
        normal: '240ms',
        slow: '400ms',
        editorial: '700ms',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
        entrance: 'cubic-bezier(0, 0, 0, 1)',
        exit: 'cubic-bezier(0.3, 0, 1, 1)',
      },
      minHeight: {
        touch: '44px',
        court: '48px', // touch target for on-court, one-handed, in-sunlight use
      },
      maxWidth: {
        container: '1280px',
        editorial: '1440px',
      },
    },
  },
  plugins: [],
};
