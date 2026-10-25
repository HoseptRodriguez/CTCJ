-- ctcj_dev (2026-09-28), confirmed by the owner: Orlando Rodríguez uses
-- orlandorodrigueztennis@gmail.com. His two other accounts are deactivated,
-- not deleted. None of the three had data (reservations, memberships,
-- notes, ratings, goals, posts...), so there was nothing to merge.
-- A DEACTIVATED account can't sign in and its sessions are revoked.
--
-- Run (after a pg_dump backup):
--   docker exec -i ctcj-postgres psql -U ctcj -d ctcj_dev -v ON_ERROR_STOP=1 < this file

\set ON_ERROR_STOP on
SET client_encoding = 'UTF8';
BEGIN;

CREATE TEMP TABLE duplicates ON COMMIT DROP AS
  SELECT id, email, status AS previous_status FROM users
   WHERE email IN ('orodrigueztennis@gmail.com', 'orodrigueztennis83@gmail.com');

DO $$
BEGIN
  IF (SELECT count(*) FROM duplicates) <> 2 THEN
    RAISE EXCEPTION 'Se esperaban 2 cuentas duplicadas; no se cambia nada';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'orlandorodrigueztennis@gmail.com' AND status = 'ACTIVE') THEN
    RAISE EXCEPTION 'La cuenta real no está activa; no se cambia nada';
  END IF;
END $$;

UPDATE users SET status = 'DEACTIVATED', updated_at = now()
 WHERE id IN (SELECT id FROM duplicates);
UPDATE refresh_tokens SET revoked_at = now()
 WHERE user_id IN (SELECT id FROM duplicates) AND revoked_at IS NULL;

INSERT INTO audit_logs (action, entity_type, entity_id, before_state, after_state, justification)
SELECT 'USER_DEACTIVATED', 'User', d.id,
       jsonb_build_object('email', d.email, 'status', d.previous_status),
       jsonb_build_object('status', 'DEACTIVATED', 'realAccount', 'orlandorodrigueztennis@gmail.com'),
       'Cuenta duplicada de Orlando Rodríguez; la real es orlandorodrigueztennis@gmail.com (confirmado por el dueño)'
  FROM duplicates d;

SELECT email, status, email_verified_at IS NOT NULL AS verificada
  FROM users WHERE email ILIKE '%rodrigueztennis%' ORDER BY created_at;
COMMIT;
