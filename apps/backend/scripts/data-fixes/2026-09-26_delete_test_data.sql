-- One-off cleanup of ctcj_dev (2026-09-26): data left by manual/UI test runs.
-- NOT to be run without the owner's confirmation and a pg_dump backup.
--
-- Scope (reviewed read-only before writing this):
--   * the 75 accounts @example.com (phase4-*, p6-ui-*, smoke-*, walkthrough-*...)
--     and everything that belongs only to them;
--   * the plan AVANZADO1785722706144 ("Avanzado 1785722706144"), whose only
--     membership is a test account's.
-- Kept: the 6 gmail accounts, their data, the plans INICIACION and AVANZADO,
-- courts, settings and audit_logs (history is never deleted).
--
-- Order follows the foreign keys: rows that BLOCK a delete go first; the
-- rest cascade from users. One transaction; it aborts if any count differs
-- from what was reviewed, so nothing is deleted when the data has changed.
--
-- Run: docker exec -i ctcj-postgres psql -U ctcj -d ctcj_dev -v ON_ERROR_STOP=1 < this file

\set ON_ERROR_STOP on
SET client_encoding = 'UTF8';
BEGIN;

CREATE TEMP TABLE test_users ON COMMIT DROP AS
  SELECT id FROM users WHERE email::text LIKE '%@example.com';

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM test_users;
  IF n <> 75 THEN RAISE EXCEPTION 'Se esperaban 75 usuarios de prueba y hay %', n; END IF;
END $$;

-- Delete, checking each count against the reviewed inventory.
CREATE TEMP TABLE deleted (what text, n int) ON COMMIT DROP;

-- 1. Challenges between test accounts (their match results cascade; those
--    results are what would otherwise block deleting the matches).
WITH d AS (DELETE FROM challenges
            WHERE challenger_user_id IN (SELECT id FROM test_users)
              AND opponent_user_id IN (SELECT id FROM test_users) RETURNING 1)
INSERT INTO deleted SELECT 'challenges', count(*) FROM d;

-- 2. Competition matches where every participant is a test account
--    (participants cascade).
WITH d AS (DELETE FROM competition_matches m
            WHERE NOT EXISTS (SELECT 1 FROM competition_match_participants p
                               WHERE p.match_id = m.id AND p.player_id NOT IN (SELECT id FROM test_users))
           RETURNING 1)
INSERT INTO deleted SELECT 'competition_matches', count(*) FROM d;

-- 3. Reservations made by test accounts, then the payments they recorded
--    (all 6 belong to those reservations; none to a real one).
WITH d AS (DELETE FROM reservations WHERE created_by IN (SELECT id FROM test_users) RETURNING 1)
INSERT INTO deleted SELECT 'reservations', count(*) FROM d;
WITH d AS (DELETE FROM payments WHERE recorded_by IN (SELECT id FROM test_users) RETURNING 1)
INSERT INTO deleted SELECT 'payments', count(*) FROM d;

-- 4. Memberships of test accounts (adjustments cascade), then the test plan
--    (its price rows cascade).
WITH d AS (DELETE FROM memberships WHERE player_id IN (SELECT id FROM test_users) RETURNING 1)
INSERT INTO deleted SELECT 'memberships', count(*) FROM d;
WITH d AS (DELETE FROM membership_plans WHERE code = 'AVANZADO1785722706144' RETURNING 1)
INSERT INTO deleted SELECT 'membership_plans', count(*) FROM d;

-- 5. The accounts. Cascades: user_roles, refresh_tokens, email_verifications,
--    notifications, affiliation_requests, guardianships. user_roles.granted_by
--    of other rows becomes NULL.
WITH d AS (DELETE FROM users WHERE id IN (SELECT id FROM test_users) RETURNING 1)
INSERT INTO deleted SELECT 'users', count(*) FROM d;

DO $$
DECLARE r record; expected jsonb := '{"challenges":7,"competition_matches":5,"reservations":23,
  "payments":6,"memberships":2,"membership_plans":1,"users":75}';
BEGIN
  FOR r IN SELECT * FROM deleted LOOP
    IF r.n <> (expected ->> r.what)::int THEN
      RAISE EXCEPTION 'En % se borrarían % filas y se esperaban %; no se borra nada',
        r.what, r.n, expected ->> r.what;
    END IF;
  END LOOP;
END $$;

-- Trace in audit_logs (no actor: maintenance).
INSERT INTO audit_logs (action, entity_type, after_state, justification)
SELECT 'DATA_CLEANUP_TEST_DATA', 'Database', jsonb_object_agg(what, n),
       'Limpieza de datos de pruebas manuales en ctcj_dev (cuentas @example.com)'
  FROM deleted;

SELECT what AS tabla, n AS borradas FROM deleted;

COMMIT;
