-- Invoice ---------------------------------------------------------------------
-- Financial record: onDelete RESTRICT on membership_id (not CASCADE, unlike
-- membership_adjustments) -- an invoice must never silently disappear if a
-- membership row is ever deleted. Payment data lives inline (paid_* columns)
-- rather than in a separate table -- an invoice's payment has no independent
-- reachability in this phase's scope, see the Phase 8 plan for the full
-- rationale. No club_id column, same treatment as membership_adjustments
-- (reachable transitively through membership_id).
CREATE TABLE "invoices" (
    "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
    "membership_id"    UUID NOT NULL,
    "status"           VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    "amount_cop"       BIGINT NOT NULL,
    "period_start"     DATE NOT NULL,
    "period_end"       DATE NOT NULL,
    "due_date"         DATE NOT NULL,
    "issued_at"        TIMESTAMP(3) NOT NULL,
    "generated_by"     UUID,                 -- no FK, audit-only; nullable for a future scheduled job's system sentinel

    "paid_amount_cop"  BIGINT,
    "paid_method"      VARCHAR(20),
    "paid_by"          UUID,                 -- no FK, audit-only
    "paid_at"          TIMESTAMP(3),
    "paid_notes"       TEXT,

    "cancelled_at"     TIMESTAMP(3),
    "cancelled_by"     UUID,                 -- no FK, audit-only
    "cancel_reason"    TEXT,

    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_membership_id_fkey"
    FOREIGN KEY ("membership_id") REFERENCES "memberships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "invoices" ADD CONSTRAINT "invoice_status_valid"
    CHECK ("status" IN ('PENDING','PAID','CANCELLED'));
ALTER TABLE "invoices" ADD CONSTRAINT "invoice_amount_non_negative"
    CHECK ("amount_cop" >= 0);
ALTER TABLE "invoices" ADD CONSTRAINT "invoice_period_valid"
    CHECK ("period_end" > "period_start");

-- Decision-coherence CHECKs, matching Phase 6/7's affiliation/guardianship/
-- price style: the paid_*/cancelled_* columns are non-null iff the status
-- says they should be, never a null-but-PAID or populated-but-PENDING row.
ALTER TABLE "invoices" ADD CONSTRAINT "invoice_paid_coherent"
    CHECK (
        (status = 'PAID'  AND paid_amount_cop IS NOT NULL AND paid_method IS NOT NULL
                           AND paid_by IS NOT NULL AND paid_at IS NOT NULL)
        OR (status != 'PAID' AND paid_amount_cop IS NULL AND paid_method IS NULL
                              AND paid_by IS NULL AND paid_at IS NULL)
    );
ALTER TABLE "invoices" ADD CONSTRAINT "invoice_cancelled_coherent"
    CHECK (
        (status = 'CANCELLED' AND cancelled_at IS NOT NULL AND cancelled_by IS NOT NULL)
        OR (status != 'CANCELLED' AND cancelled_at IS NULL AND cancelled_by IS NULL)
    );
ALTER TABLE "invoices" ADD CONSTRAINT "invoice_paid_method_valid"
    CHECK ("paid_method" IS NULL OR "paid_method" IN ('CASH','TRANSFER','CARD_IN_PERSON'));

-- One invoice per billing period per membership -- generateInvoice pre-checks
-- this for a clean 409 (InvoiceAlreadyExists), this index is defense-in-depth.
CREATE UNIQUE INDEX "invoices_membership_period_unique" ON "invoices" ("membership_id", "period_start");
CREATE INDEX "invoices_membership_idx" ON "invoices" ("membership_id");
CREATE INDEX "invoices_pending_idx" ON "invoices" ("status") WHERE "status" = 'PENDING';

-- InvoiceLine -------------------------------------------------------------------
CREATE TABLE "invoice_lines" (
    "id"          UUID NOT NULL DEFAULT gen_random_uuid(),
    "invoice_id"  UUID NOT NULL,
    "description" TEXT NOT NULL,
    "amount_cop"  BIGINT NOT NULL,          -- signed: negative for discounts/scholarships, positive for base price/surcharges
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_id_fkey"
    FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "invoice_lines_invoice_idx" ON "invoice_lines" ("invoice_id");
