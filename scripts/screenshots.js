/* eslint-env node, browser */
/**
 * Capturas de pantalla para el manual de usuario.
 *
 *   node scripts/screenshots.js
 *
 * Requiere el frontend en http://localhost:5173 (o SCREENSHOTS_BASE_URL), el
 * backend activo y las cuentas de prueba creadas con:
 *   node apps/backend/prisma/seedTestUsers.js
 *
 * Guarda las capturas numeradas en docs/capturas/ y escribe
 * docs/capturas/indice.txt con lo que muestra cada una.
 *
 * /api/auth/login y /api/auth/mfa/verify comparten un límite de 10 intentos
 * cada 15 minutos por IP. El script no lo evita: cuando no quedan intentos,
 * espera a que la ventana se reinicie y sigue (la corrida puede tardar ~15 min).
 */
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const { chromium } = require('playwright');

// eslint-disable-next-line no-restricted-properties -- script local, fuera de la app
const BASE_URL = process.env.SCREENSHOTS_BASE_URL || 'http://localhost:5173';
const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'docs', 'capturas');
const VIEWPORT = { width: 1366, height: 768 };

const ROLE_LABELS = {
  usuario: 'Usuario (sin afiliación)',
  jugador: 'Jugador',
  padre: 'Padre/Tutor',
  entrenador: 'Entrenador',
  recepcion: 'Recepción',
  psicologo: 'Psicólogo',
  fisioterapeuta: 'Fisioterapeuta',
  admin: 'Administrador',
};
// NEUROPSICOLOGO ve exactamente las mismas pantallas que PSICOLOGO; se omite
// para no gastar dos intentos más del límite de login.
const ROLE_ORDER = Object.keys(ROLE_LABELS);

// Páginas de Mi CTCJ que no están en las pestañas (se abren desde el encabezado).
const MI_CTCJ_EXTRAS = [
  { href: '/mi-ctcj/perfil', label: 'Perfil' },
  { href: '/mi-ctcj/notificaciones', label: 'Notificaciones' },
  { href: '/mi-ctcj/privacidad', label: 'Privacidad' },
];

const index = [];
let counter = 0;
let cookiePolicyVersion = null;

/**
 * Contexto de navegador limpio. Con skipCookieBanner, el visitante ya eligió
 * «Solo necesarias» (para que el aviso de cookies no tape las capturas).
 */
async function newContext(browser, { skipCookieBanner = true } = {}) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    reducedMotion: 'reduce',
    locale: 'es-CO',
  });
  if (skipCookieBanner) {
    await context.addInitScript((version) => {
      if (window.localStorage.getItem('ctcj:cookie-consent')) return;
      window.localStorage.setItem(
        'ctcj:cookie-consent',
        JSON.stringify({
          version,
          decidedAt: new Date().toISOString(),
          preferences: false,
          analytics: false,
          recordedFor: null,
        }),
      );
    }, cookiePolicyVersion);
  }
  return context;
}
const rateLimit = { remaining: null, resetAt: 0 };

function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

function log(...args) {
  // eslint-disable-next-line no-console
  console.log(...args);
}

async function settle(page) {
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await page
    .waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 5_000 })
    .catch(() => {});
  await page.waitForTimeout(700);
}

async function shot(page, slug, description, { fullPage = false } = {}) {
  counter += 1;
  const file = `${String(counter).padStart(2, '0')}_${slug}.png`;
  await settle(page);
  await page.screenshot({ path: path.join(OUT_DIR, file), fullPage });
  index.push({ file, description });
  log(`  ${file}`);
}

async function open(page, href) {
  await page.goto(new URL(href, BASE_URL).href, { waitUntil: 'domcontentloaded' });
  await settle(page);
}

/** Lee los encabezados RateLimit-* de una respuesta de login/MFA. */
function trackRateLimit(response) {
  const h = response.headers();
  let remaining = h['ratelimit-remaining'];
  let reset = h['ratelimit-reset'];
  if (remaining === undefined && h.ratelimit) {
    remaining = /remaining=(\d+)/.exec(h.ratelimit)?.[1];
    reset = /reset=(\d+)/.exec(h.ratelimit)?.[1];
  }
  if (remaining !== undefined) rateLimit.remaining = Number(remaining);
  if (reset !== undefined) rateLimit.resetAt = Date.now() + (Number(reset) + 2) * 1000;
}

async function waitForAttempts(page, needed) {
  if (rateLimit.remaining === null || rateLimit.remaining >= needed) return;
  const ms = Math.max(0, rateLimit.resetAt - Date.now());
  log(`  (límite de login: quedan ${rateLimit.remaining}; esperando ${Math.ceil(ms / 1000)} s)`);
  await page.waitForTimeout(ms);
  rateLimit.remaining = null;
}

/** Envía un formulario y devuelve la respuesta de la API; si es 429, espera y reintenta. */
async function submitTo(page, apiPath, submit) {
  for (;;) {
    const responsePromise = page.waitForResponse(
      (r) => r.url().includes(apiPath) && r.request().method() === 'POST',
    );
    await submit();
    const response = await responsePromise;
    trackRateLimit(response);
    if (response.status() !== 429) return response;
    rateLimit.remaining = 0;
    await waitForAttempts(page, 1);
  }
}

async function fillLogin(page, email, password) {
  await open(page, '/login');
  await page.locator('input[name="email"]').fill(email);
  await page.locator('input[name="password"]').fill(password);
}

async function login(page, user, { password, totp }) {
  await waitForAttempts(page, user.mfa ? 2 : 1);
  await fillLogin(page, user.email, password);
  const response = await submitTo(page, '/api/auth/login', () =>
    page.locator('form button[type="submit"]').first().click(),
  );
  const body = await response.json().catch(() => ({}));
  if (!response.ok()) throw new Error(`Login falló para ${user.email}: ${response.status()}`);

  if (body.mfaRequired) {
    const step = totp.stepAt(new Date());
    const code = totp.totpForStep(totp.secret, step);
    const field = page.locator('input[inputmode="numeric"]').first();
    await field.waitFor();
    await field.fill(code);
    const verify = await submitTo(page, '/api/auth/mfa/verify', () =>
      page.locator('form button[type="submit"]').first().click(),
    );
    if (!verify.ok()) throw new Error(`MFA falló para ${user.email}: ${verify.status()}`);
  }
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15_000 });
  await settle(page);
}

async function navLinks(page, selector) {
  return page.$$eval(selector, (anchors) =>
    anchors.map((a) => ({
      href: a.getAttribute('href'),
      label: (a.getAttribute('aria-label') || a.textContent || '')
        .replace(/\d+\s*pendientes/i, '')
        .trim(),
    })),
  );
}

function dedupe(links, skip = new Set()) {
  const seen = new Set(skip);
  return links.filter((l) => {
    if (!l.href || seen.has(l.href)) return false;
    seen.add(l.href);
    return true;
  });
}

async function capturePublic(browser) {
  log('Sin sesión');
  const context = await newContext(browser, { skipCookieBanner: false });
  const page = await context.newPage();

  await open(page, '/');
  await shot(
    page,
    'landing',
    'Página de inicio pública (landing) tal como se ve la primera vez, con el aviso de cookies abajo.',
  );
  await page.getByRole('button', { name: 'Solo necesarias' }).click();
  await shot(
    page,
    'landing_completa',
    'Página de inicio pública completa (todas las secciones, desplazamiento completo).',
    {
      fullPage: true,
    },
  );
  await open(page, '/login');
  await shot(page, 'login', 'Formulario de inicio de sesión vacío.');
  await open(page, '/register');
  await shot(page, 'registro', 'Formulario de registro de cuenta nueva, vacío.');

  // Error de validación del registro (validación en el navegador, no envía nada).
  await page.locator('input[name="firstName"]').fill('María');
  await page.locator('input[name="email"]').fill('correo-invalido');
  await page.locator('input[name="password"]').fill('abc');
  await page.locator('form button[type="submit"]').first().click();
  await shot(
    page,
    'registro_error_validacion',
    'Registro con datos inválidos: mensajes de validación (apellido vacío, correo mal escrito, contraseña corta, aceptaciones sin marcar). Página completa.',
    { fullPage: true },
  );

  // Formulario lleno, listo para enviar (no se envía).
  await open(page, '/register');
  await page.locator('input[name="firstName"]').fill('María');
  await page.locator('input[name="lastName"]').fill('Gómez');
  await page.locator('input[name="email"]').fill('maria.gomez@ejemplo.com');
  await page.locator('input[name="password"]').fill('TenisCali2026');
  await page.locator('input[name="birthDate"]').fill('1995-04-12');
  await page.locator('input[name="acceptPrivacy"]').check();
  await page.locator('input[name="acceptTerms"]').check();
  await page.locator('input[name="password"]').blur();
  await shot(
    page,
    'registro_formulario_lleno',
    'Formulario de registro completamente diligenciado, antes de enviarlo. Página completa.',
    {
      fullPage: true,
    },
  );

  for (const [href, slug, description] of [
    ['/canchas', 'reserva_canchas_publica', 'Disponibilidad y reserva de canchas (vista pública).'],
    ['/el-club', 'el_club', 'Página pública «El club».'],
    ['/torneos', 'torneos_publicos', 'Listado público de torneos.'],
  ]) {
    await open(page, href);
    await shot(page, slug, description);
  }
  await context.close();
}

async function captureLoginError(browser, user) {
  log('Error de login');
  const context = await newContext(browser);
  const page = await context.newPage();
  await waitForAttempts(page, 1);
  await fillLogin(page, user.email, 'ClaveEquivocada123');
  await shot(
    page,
    'login_formulario_lleno',
    'Formulario de inicio de sesión diligenciado (correo y contraseña).',
  );
  await submitTo(page, '/api/auth/login', () =>
    page.locator('form button[type="submit"]').first().click(),
  );
  await shot(
    page,
    'login_error_contrasena',
    'Inicio de sesión con contraseña incorrecta: mensaje de error.',
  );
  await context.close();
}

async function captureRole(browser, key, user, auth) {
  const roleLabel = ROLE_LABELS[key];
  log(`Rol: ${roleLabel} (${user.email})`);
  const context = await newContext(browser);
  const page = await context.newPage();
  await login(page, user, auth);

  const landing = new URL(page.url()).pathname;
  await shot(
    page,
    `${key}_dashboard`,
    `${roleLabel}: pantalla principal tras iniciar sesión (${landing}).`,
  );

  const isStaff = landing.startsWith('/staff');
  const links = isStaff
    ? dedupe(
        await navLinks(page, 'nav[aria-label="Consola del club"] a[href^="/staff"]'),
        new Set([landing]),
      )
    : dedupe(
        [
          ...(await navLinks(page, 'nav[aria-label="Mi CTCJ"] a[href^="/mi-ctcj"]')),
          ...MI_CTCJ_EXTRAS,
        ],
        new Set([landing]),
      );

  for (const link of links) {
    await open(page, link.href);
    if (new URL(page.url()).pathname !== link.href) continue; // sin acceso: redirigido
    await shot(
      page,
      `${key}_${slugify(link.label || link.href)}`,
      `${roleLabel}: módulo «${link.label}» (${link.href}).`,
    );

    if (link.href === '/staff/jugadores') {
      const file = page.locator('a[href^="/staff/jugadores/"]').first();
      if (await file.count()) {
        await file.click();
        await page.waitForURL(/\/staff\/jugadores\/.+/).catch(() => {});
        await shot(
          page,
          `${key}_ficha_jugador`,
          `${roleLabel}: ficha de un jugador (${new URL(page.url()).pathname}).`,
        );
      }
    }
  }

  if (isStaff) {
    await open(page, '/mi-ctcj/perfil');
    if (new URL(page.url()).pathname === '/mi-ctcj/perfil') {
      await shot(page, `${key}_perfil`, `${roleLabel}: perfil personal (/mi-ctcj/perfil).`);
    }
  }
  await context.close();
}

async function main() {
  const backend = path.join(ROOT, 'apps', 'backend');
  const { TEST_USERS, TEST_PASSWORD, TEST_TOTP_SECRET } = await import(
    pathToFileURL(path.join(backend, 'prisma', 'testUsers.js')).href
  );
  const totp = await import(
    pathToFileURL(path.join(backend, 'src', 'modules', 'identity', 'domain', 'services', 'totp.js'))
      .href
  );
  cookiePolicyVersion = (await import('@ctcj/shared')).COOKIES_POLICY.version;
  const auth = { password: TEST_PASSWORD, totp: { ...totp, secret: TEST_TOTP_SECRET } };
  const users = Object.fromEntries(TEST_USERS.map((u) => [u.key, u]));

  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const f of fs.readdirSync(OUT_DIR))
    if (f.endsWith('.png')) fs.unlinkSync(path.join(OUT_DIR, f));

  const browser = await chromium.launch();
  try {
    await capturePublic(browser);
    await captureLoginError(browser, users.usuario);
    for (const key of ROLE_ORDER) await captureRole(browser, key, users[key], auth);
  } finally {
    await browser.close();
    const lines = [
      'Capturas de pantalla de la plataforma CTCJ para el manual de usuario',
      `Generadas: ${new Date().toISOString()}  |  Viewport: ${VIEWPORT.width}x${VIEWPORT.height}  |  ${BASE_URL}`,
      'Cuentas de prueba (isDemo) creadas con apps/backend/prisma/seedTestUsers.js.',
      '',
      ...index.map(({ file, description }) => `${file.padEnd(48)} ${description}`),
      '',
    ];
    fs.writeFileSync(path.join(OUT_DIR, 'indice.txt'), lines.join('\n'), 'utf8');
    log(`\n${index.length} capturas en ${path.relative(ROOT, OUT_DIR)}`);
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});
