-- The guardian's authorization to show a minor's full name on /torneos is a
-- versioned legal document like the others: widen the allowed doc types.
-- Only adds an allowed value; no row changes.
ALTER TABLE "legal_documents" DROP CONSTRAINT "legal_document_type_valid";
ALTER TABLE "legal_documents" ADD CONSTRAINT "legal_document_type_valid"
    CHECK ("doc_type" IN ('PRIVACY_POLICY', 'TERMS', 'COOKIES', 'REFUNDS', 'ACCESSIBILITY',
                          'MINOR_DATA_IMAGE', 'HEALTH_DATA', 'COMMUNITY_RULES', 'MARKETING',
                          'MINOR_PUBLIC_NAME'));
