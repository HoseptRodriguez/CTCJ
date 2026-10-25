-- One-off cleanup of ctcj_dev (2026-09-27), confirmed by the owner:
--   * "Ema Test" (masmemoriaparahosept@gmail.com), a test account, with
--     everything that depends on it: 6 reservations (none paid, no payments),
--     1 goal, 1 affiliation request, roles, sessions and email verification.
--     It has no memberships, so no invoices.
--   * "Temporada Walkthrough", a test season with no matches left.
-- One transaction; it aborts if any count differs from the reviewed one.
-- audit_logs is never deleted; each deletion leaves a trace there.
--
-- Run (after a pg_dump backup):
--   docker exec -i ctcj-postgres psql -U ctcj -d ctcj_dev -v ON_ERROR_STOP=1 < this file

\set ON_ERROR_STOP on
SET client_encoding = 'UTF8';
BEGIN;

CREATE TEMP TABLE ema ON COMMIT DROP AS
  SELECT id FROM users WHERE email = 'masmemoriaparahosept@gmail.com';
CREATE TEMP TABLE deleted (what text, n int) ON COMMIT DROP;

-- Payments of Ema's reservations (reviewed: none), then the reservations
-- (created_by blocks deleting the user), then the goal (blocks too).
WITH d AS (DELETE FROM payments WHERE id IN (
             SELECT payment_id FROM reservations
              WHERE payment_id IS NOT NULL
                AND (created_by IN (SELECT id FROM ema) OR holder_user_id IN (SELECT id FROM ema)))
           RETURNING 1)
INSERT INTO deleted SELECT 'payments', count(*) FROM d;
WITH d AS (DELETE FROM reservations
            WHERE created_by IN (SELECT id FROM ema) OR holder_user_id IN (SELECT id FROM ema)
           RETURNING 1)
INSERT INTO deleted SELECT 'reservations', count(*) FROM d;
WITH d AS (DELETE FROM invoices WHERE membership_id IN (
             SELECT id FROM memberships WHERE player_id IN (SELECT id FROM ema)) RETURNING 1)
INSERT INTO deleted SELECT 'invoices', count(*) FROM d;
WITH d AS (DELETE FROM goals WHERE player_id IN (SELECT id FROM ema) RETURNING 1)
INSERT INTO deleted SELECT 'goals', count(*) FROM d;
-- The account; cascades: user_roles, refresh_tokens, email_verifications,
-- affiliation_requests (and memberships, notifications... none here).
WITH d AS (DELETE FROM users WHERE id IN (SELECT id FROM ema) RETURNING 1)
INSERT INTO deleted SELECT 'users', count(*) FROM d;

-- The test season, only if it still has no matches.
WITH d AS (DELETE FROM competition_seasons s
            WHERE s.name = 'Temporada Walkthrough'
              AND NOT EXISTS (SELECT 1 FROM competition_matches m WHERE m.season_id = s.id)
           RETURNING 1)
INSERT INTO deleted SELECT 'competition_seasons', count(*) FROM d;

DO $$
DECLARE r record; expected jsonb := '{"payments":0,"reservations":6,"invoices":0,"goals":1,
  "users":1,"competition_seasons":1}';
BEGIN
  FOR r IN SELECT * FROM deleted LOOP
    IF r.n <> (expected ->> r.what)::int THEN
      RAISE EXCEPTION 'En % se borrarían % filas y se esperaban %; no se borra nada',
        r.what, r.n, expected ->> r.what;
    END IF;
  END LOOP;
END $$;

INSERT INTO audit_logs (action, entity_type, after_state, justification)
SELECT 'DATA_CLEANUP_TEST_DATA', 'Database', jsonb_object_agg(what, n),
       'Cuenta de prueba "Ema Test" y "Temporada Walkthrough" (confirmado por el dueño)'
  FROM deleted;

SELECT what AS tabla, n AS borradas FROM deleted;
COMMIT;
