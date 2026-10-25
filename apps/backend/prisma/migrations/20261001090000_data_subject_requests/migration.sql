-- Requests of the data subject (2026-10-01), Ley 1581 de 2012 arts. 14 y 15.
--   * A consulta is answered within 10 business days, a reclamo within 15
--     (due_on is computed with the Colombian holidays when received).
--   * radicado: CTCJ-<year>-<5 digits>, from a sequence, so the person can
--     follow their request.
--   * Only adds a table, a sequence and indexes: no existing data changes.

CREATE SEQUENCE "data_subject_request_radicado_seq" START 1;

CREATE TABLE "data_subject_requests" (
    "id"                    UUID NOT NULL DEFAULT gen_random_uuid(),
    "club_id"               UUID NOT NULL,
    "radicado"              VARCHAR(20) NOT NULL,
    "user_id"               UUID NOT NULL,          -- the data subject who asked
    "request_type"          VARCHAR(10) NOT NULL,   -- CONSULTA | RECLAMO
    "kind"                  VARCHAR(12) NOT NULL,   -- CONSULTA | CORRECCION | SUPRESION | REVOCATORIA | RECLAMO
    "description"           TEXT NOT NULL,
    "status"                VARCHAR(12) NOT NULL DEFAULT 'RECIBIDA', -- RECIBIDA | EN_TRAMITE | RESPONDIDA
    "received_at"           TIMESTAMPTZ NOT NULL DEFAULT now(),
    "due_on"                DATE NOT NULL,
    "answer"                TEXT,
    "answered_at"           TIMESTAMPTZ,
    "answered_by"           UUID,
    "account_anonymized_at" TIMESTAMPTZ,
    "created_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updated_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "data_subject_requests_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "data_subject_requests_radicado_key" ON "data_subject_requests" ("radicado");
CREATE INDEX "data_subject_requests_user_idx" ON "data_subject_requests" ("user_id", "received_at" DESC);
CREATE INDEX "data_subject_requests_open_idx" ON "data_subject_requests" ("status", "due_on");

-- RESTRICT: the request (and its answer) outlives the account, which is
-- anonymized instead of deleted.
ALTER TABLE "data_subject_requests" ADD CONSTRAINT "data_subject_requests_club_id_fkey"
    FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "data_subject_requests" ADD CONSTRAINT "data_subject_requests_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "data_subject_requests" ADD CONSTRAINT "data_subject_requests_answered_by_fkey"
    FOREIGN KEY ("answered_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "data_subject_requests" ADD CONSTRAINT "data_subject_request_type_valid"
    CHECK ("request_type" IN ('CONSULTA', 'RECLAMO'));
ALTER TABLE "data_subject_requests" ADD CONSTRAINT "data_subject_request_kind_valid"
    CHECK ("kind" IN ('CONSULTA', 'CORRECCION', 'SUPRESION', 'REVOCATORIA', 'RECLAMO'));
ALTER TABLE "data_subject_requests" ADD CONSTRAINT "data_subject_request_status_valid"
    CHECK ("status" IN ('RECIBIDA', 'EN_TRAMITE', 'RESPONDIDA'));
ALTER TABLE "data_subject_requests" ADD CONSTRAINT "data_subject_request_answered"
    CHECK ("status" <> 'RESPONDIDA' OR ("answer" IS NOT NULL AND "answered_at" IS NOT NULL));
