-- Optional skill tag on coach notes (dashboards phase) -- lets a coach's
-- feedback point at a specific rated skill. Nullable, no backfill needed
-- (existing notes simply have no tag).
ALTER TABLE "coach_notes" ADD COLUMN "area" VARCHAR(20);

ALTER TABLE "coach_notes" ADD CONSTRAINT "coach_note_area_valid"
    CHECK ("area" IS NULL OR "area" IN (
        'FOREHAND','BACKHAND','SERVE','RETURN','VOLLEY','OVERHEAD',
        'SLICE','FOOTWORK','FITNESS','MENTALITY'
    ));
