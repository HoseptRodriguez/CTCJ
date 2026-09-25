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
 *
 * REDESIGN (2026-09, "rediseno" branch): the tokens under "Design system v2"
 * below are the accessible-for-adults system used by src/components/ui/*.
 * The older tokens further down stay only until each existing page is
 * migrated -- new code uses the v2 names. See src/styles/tokens.css for the
 * measured contrast of every pair.
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // --- Design system v2 ------------------------------------------------
        // Every text/background pair used by the v2 components meets WCAG AA
        // (ratios measured, see tokens.css). Brand colors are the club's.
        page: '#F4F6F9', // app background
        muted: '#E3E7EE', // skeletons, neutral tracks
        surface: '#FFFFFF', // cards, dialogs, inputs
        ink: {
          DEFAULT: '#0E1A33', // body text -- 15.97:1 on page, 17.29:1 on surface
          soft: '#4A5363', // secondary text -- 7.16:1 on page
        },
        line: {
          DEFAULT: '#D5DBE4', // decorative dividers/card borders only
          strong: '#8A93A3', // form field borders -- 3.10:1, the non-text minimum
        },
        lime: {
          DEFAULT: '#9EE67C', // primary button on navy + active selection; navy text only (11.21:1)
          hover: '#8AD968',
        },
        clay: {
          DEFAULT: '#B8532A', // free courts, accents, fills -- 4.87:1 with white; only 4.50 on page, so use clay-dark for text
          soft: '#F3E1D6',
          dark: '#8A3A17',
        },
        amber: {
          DEFAULT: '#F5B44A', // notices, notification counters -- navy text (9.17:1)
          soft: '#FFF1CC',
          dark: '#6B4600',
        },
        danger: {
          DEFAULT: '#B3261E', // irreversible actions -- 6.54:1 with white
          hover: '#9A2019',
          soft: '#FBE9E7',
        },
        // Membership/payment states -- ALWAYS rendered with a text label
        // (StatusBadge), never color alone.
        status: {
          'ok-bg': '#E4F7DA',
          'ok-fg': '#2C5E17', // 6.84:1
          'pending-bg': '#FFF1CC',
          'pending-fg': '#6B4600', // 7.48:1
          'overdue-bg': '#F3E1D6',
          'overdue-fg': '#8A3A17', // 6.13:1
          'suspended-bg': '#E3E7EE',
          'suspended-fg': '#4A5363', // 6.25:1
        },
        // --- Legacy tokens (pre-redesign pages) ------------------------------
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
          clay: '#B8532A', // aligned with the v2 brand clay
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
        // v2 semantic sizes (18px body; nothing under 16px). Rem-based, so
        // FontSizeToggle's 115% root scale enlarges all of them together.
        'body-sm': ['1rem', { lineHeight: '1.5' }], // 16px -- the floor
        body: ['1.125rem', { lineHeight: '1.6' }], // 18px -- default text
        lead: ['1.25rem', { lineHeight: '1.55' }], // 20px -- lg buttons, intros
        h3: ['1.5rem', { lineHeight: '1.25' }], // 24px
        h2: ['2rem', { lineHeight: '1.15' }], // 32px
        title: ['3rem', { lineHeight: '1.05' }], // 48px -- page title (mobile). Not 'page': that's a color, and text-page would set both
        'title-lg': ['3.5rem', { lineHeight: '1.05' }], // 56px -- page title (md+)
        stat: ['2.75rem', { lineHeight: '1' }], // big numbers in StatCard
        // Legacy scale
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
        xl: '12px', // v2 cards and dialogs
        full: '9999px',
      },
      boxShadow: {
        none: 'none',
        sm: '0 1px 2px rgba(0, 26, 77, 0.06)',
        md: '0 2px 8px rgba(0, 26, 77, 0.08)',
        lg: '0 8px 24px rgba(0, 26, 77, 0.10)',
        // v2 keyboard focus: 3px lime ring + 2px navy outer ring. Lime alone
        // is only 1.49:1 on white (focus indicators need 3:1); the navy edge
        // (16.73:1) makes it visible on light surfaces, the lime on navy.
        focus: '0 0 0 3px #9EE67C, 0 0 0 5px #001A4D',
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
        btn: '48px', // v2 minimum for every control
        'btn-lg': '64px', // v2 primary actions
        touch: '44px',
        court: '48px', // touch target for on-court, one-handed, in-sunlight use
      },
      minWidth: {
        btn: '48px',
      },
      maxWidth: {
        prose: '68ch',
        container: '1280px',
        editorial: '1440px',
      },
    },
  },
  plugins: [],
};
