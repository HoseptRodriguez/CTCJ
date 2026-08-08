-- Challenge Match Score Confirmation adds three new notification types --
-- widen notification_type_valid's CHECK to allow them (fits the existing
-- VARCHAR(30) column, no column-size change needed).
ALTER TABLE "notifications" DROP CONSTRAINT "notification_type_valid";
ALTER TABLE "notifications" ADD CONSTRAINT "notification_type_valid"
    CHECK ("type" IN (
        'CHALLENGE_RECEIVED','CHALLENGE_ACCEPTED','CHALLENGE_REJECTED','CHALLENGE_CANCELLED',
        'CHALLENGE_RESULT_SUBMITTED','CHALLENGE_RESULT_MISMATCH','CHALLENGE_RESULT_CONFIRMED'
    ));
