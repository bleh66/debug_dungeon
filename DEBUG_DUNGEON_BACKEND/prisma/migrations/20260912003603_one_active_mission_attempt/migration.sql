-- Preserve historical attempts while reconciling any existing duplicate
-- active attempts before adding the database-level invariant.
WITH ranked_active_attempts AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "missionProgressId"
      ORDER BY "startedAt" DESC, "id" DESC
    ) AS "rowNumber"
  FROM "MissionAttempt"
  WHERE "status" = 'IN_PROGRESS'
)
UPDATE "MissionAttempt"
SET
  "status" = 'ABANDONED',
  "completedAt" = COALESCE("completedAt", CURRENT_TIMESTAMP)
FROM ranked_active_attempts
WHERE "MissionAttempt"."id" = ranked_active_attempts."id"
  AND ranked_active_attempts."rowNumber" > 1;

CREATE UNIQUE INDEX "MissionAttempt_one_in_progress_per_progress_key"
ON "MissionAttempt"("missionProgressId")
WHERE "status" = 'IN_PROGRESS';
