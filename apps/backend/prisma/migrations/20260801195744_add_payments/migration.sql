-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "club_id" UUID NOT NULL,
    "amount_cop" BIGINT NOT NULL,
    "method" VARCHAR(20) NOT NULL,
    "recorded_by" UUID NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "payments" ADD CONSTRAINT "payment_method_valid"
    CHECK ("method" IN ('CASH','TRANSFER','CARD_IN_PERSON'));

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_club_id_fkey" FOREIGN KEY ("club_id") REFERENCES "clubs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written: `reservations.payment_id` has held unconstrained,
-- client-generated UUIDs since Phase 2/3 (the confirm flow used to accept
-- any UUID as a fake payment reference, see docs/adr). None of them
-- reference a real payment, so they must be cleared before this column can
-- become a real FK -- otherwise the constraint below would fail on any
-- leftover test data.
UPDATE "reservations" SET "payment_id" = NULL WHERE "payment_id" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "reservations_payment_id_key" ON "reservations"("payment_id");

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
