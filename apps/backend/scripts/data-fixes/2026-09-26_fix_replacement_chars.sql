-- One-off data fix for ctcj_dev (2026-09-26): texts stored with the
-- replacement character U+FFFD because they were sent to the API from a
-- Windows console in Windows-1252 (see src/shared/utf8Body.js, which now
-- refuses such bodies).
--
-- Each UPDATE matches the row by id AND by its exact damaged value, so it is
-- safe to run twice (the second run changes and logs nothing) and never touches a row
-- someone already corrected by hand. Everything runs in one transaction and
-- aborts if the result is not exactly what is expected.
--
-- Run (after a pg_dump backup):
--   docker exec -i ctcj-postgres psql -U ctcj -d ctcj_dev -v ON_ERROR_STOP=1 < this file

\set ON_ERROR_STOP on
SET client_encoding = 'UTF8';
BEGIN;

-- Each fix leaves its trace in audit_logs only when it really changed the row
-- (no actor: done by maintenance, not by a user).

-- 1. Membership plan INICIACION: "Iniciaci?n" -> "Iniciación"
WITH fixed AS (
  UPDATE membership_plans
     SET name = 'Iniciación'
   WHERE id = '899ac469-f32c-4767-ac4b-a7307d19a73f'
     AND name = E'Iniciaci\uFFFDn'
  RETURNING id
)
INSERT INTO audit_logs (action, entity_type, entity_id, before_state, after_state, justification)
SELECT 'DATA_FIX_ENCODING', 'MembershipPlan', id,
       jsonb_build_object('name', E'Iniciaci\uFFFDn'), jsonb_build_object('name', 'Iniciación'),
       'Texto con carácter de reemplazo U+FFFD (cuerpo enviado en Windows-1252)'
  FROM fixed;

-- 2. Challenge message (from a test account): "Jugamos el s?bado?" -> "¿Jugamos el sábado?"
WITH fixed AS (
  UPDATE challenges
     SET message = '¿Jugamos el sábado?'
   WHERE id = '4db1d5ae-ab57-4191-b8bb-56b4f2053c05'
     AND message = E'Jugamos el s\uFFFDbado?'
  RETURNING id
)
INSERT INTO audit_logs (action, entity_type, entity_id, before_state, after_state, justification)
SELECT 'DATA_FIX_ENCODING', 'Challenge', id,
       jsonb_build_object('message', E'Jugamos el s\uFFFDbado?'),
       jsonb_build_object('message', '¿Jugamos el sábado?'),
       'Texto con carácter de reemplazo U+FFFD (cuerpo enviado en Windows-1252)'
  FROM fixed;

-- Abort unless no damaged text is left in the two affected tables.
DO $$
DECLARE remaining int;
BEGIN
  SELECT (SELECT count(*) FROM membership_plans WHERE name ~ E'\uFFFD')
       + (SELECT count(*) FROM challenges WHERE message ~ E'\uFFFD')
    INTO remaining;
  IF remaining <> 0 THEN
    RAISE EXCEPTION 'Quedan % textos con U+FFFD; no se aplica nada', remaining;
  END IF;
END $$;

COMMIT;

SELECT code, name FROM membership_plans WHERE id = '899ac469-f32c-4767-ac4b-a7307d19a73f';
SELECT message FROM challenges WHERE id = '4db1d5ae-ab57-4191-b8bb-56b4f2053c05';
