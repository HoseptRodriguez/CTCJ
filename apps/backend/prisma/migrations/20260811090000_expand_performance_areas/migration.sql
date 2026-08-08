-- Expands the coaching skill-evaluation area set (Player/Coach dashboards
-- phase) -- purely additive, existing FOREHAND/BACKHAND/SERVE/RETURN/
-- VOLLEY/OVERHEAD ratings are untouched. SLICE, FOOTWORK, FITNESS, and
-- MENTALITY are new axes; OVERHEAD already covers "smash" (same shot),
-- kept as-is rather than duplicated.
ALTER TABLE "performance_ratings" DROP CONSTRAINT "performance_rating_area_valid";
ALTER TABLE "performance_ratings" ADD CONSTRAINT "performance_rating_area_valid"
    CHECK ("area" IN (
        'FOREHAND','BACKHAND','SERVE','RETURN','VOLLEY','OVERHEAD',
        'SLICE','FOOTWORK','FITNESS','MENTALITY'
    ));
