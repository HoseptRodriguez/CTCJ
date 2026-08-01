import { config as loadDotenv } from 'dotenv';

// Overrides .env with .env.test (DATABASE_URL -> ctcj_test, not ctcj_dev)
// before any test file's imports resolve src/config/env.js.
loadDotenv({ path: '.env.test', override: true });
