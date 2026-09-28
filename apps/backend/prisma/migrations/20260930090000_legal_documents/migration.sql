-- Legal documents (2026-09-30).
-- Every version of every legal text (privacy policy, terms, cookies,
-- refunds, accessibility, the guardian's authorization for a minor) with
-- the SHA-256 of its exact content, so it can be proven which version a
-- person accepted (consents.document_version). Append-only: a text change
-- is a new version (a new row); existing rows are never rewritten.
-- Rows are inserted by the backend at start-up from @ctcj/shared (legal/).

CREATE TABLE "legal_documents" (
    "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
    "doc_type"       VARCHAR(30) NOT NULL,
    "version"        VARCHAR(20) NOT NULL,
    "published_on"   DATE NOT NULL,
    "title"          VARCHAR(200) NOT NULL,
    "content"        JSONB NOT NULL,      -- title + sections, exactly as hashed
    "content_sha256" CHAR(64) NOT NULL,
    "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "legal_documents" ADD CONSTRAINT "legal_document_type_valid"
    CHECK ("doc_type" IN ('PRIVACY_POLICY', 'TERMS', 'COOKIES', 'REFUNDS', 'ACCESSIBILITY',
                          'MINOR_DATA_IMAGE', 'HEALTH_DATA', 'COMMUNITY_RULES', 'MARKETING'));
ALTER TABLE "legal_documents" ADD CONSTRAINT "legal_document_sha256_hex"
    CHECK ("content_sha256" ~ '^[0-9a-f]{64}$');
CREATE UNIQUE INDEX "legal_documents_type_version_unique" ON "legal_documents" ("doc_type", "version");

CREATE FUNCTION "legal_documents_forbid_update"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'legal_documents is append-only: publish a new version instead';
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER "legal_documents_no_update" BEFORE UPDATE ON "legal_documents"
    FOR EACH ROW EXECUTE FUNCTION "legal_documents_forbid_update"();
