import { config as loadDotenv } from 'dotenv';

// Overrides .env with .env.test (DATABASE_URL -> ctcj_test, not ctcj_dev)
// before any test file's imports resolve src/config/env.js.
loadDotenv({ path: '.env.test', override: true });

// Integration tests deleteMany({}) real tables. If .env.test is missing (it's
// gitignored -- copy .env.test.example) the override above is a silent no-op
// and DATABASE_URL would still be .env's ctcj_dev, so refuse to run at all
// rather than wipe development data.
const databaseUrl = process.env.DATABASE_URL ?? '';
if (!databaseUrl.includes('_test')) {
  throw new Error(
    'Integration tests refuse to run: DATABASE_URL does not point at a test database ' +
      '(it must contain "_test", e.g. ctcj_test). Copy apps/backend/.env.test.example to ' +
      'apps/backend/.env.test -- see "Test" in the README.',
  );
}
