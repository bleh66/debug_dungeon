-- Add overall-progress metadata before moving playthrough-specific fields.
ALTER TABLE "MissionProgress"
ADD COLUMN "bestScore" INTEGER,
ADD COLUMN "createdAt" TIMESTAMP(3),
ADD COLUMN "updatedAt" TIMESTAMP(3);

UPDATE "MissionProgress"
SET
  "createdAt" = "startedAt",
  "updatedAt" = COALESCE("completedAt", "startedAt");

ALTER TABLE "MissionProgress"
ALTER COLUMN "createdAt" SET NOT NULL,
ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "updatedAt" SET NOT NULL;

-- Preserve every existing MissionProgress row as a historical playthrough.
CREATE TABLE "MissionAttempt" (
  "id" TEXT NOT NULL,
  "missionProgressId" TEXT NOT NULL,
  "status" "MissionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "score" INTEGER,
  "xpEarned" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "MissionAttempt_pkey" PRIMARY KEY ("id")
);

INSERT INTO "MissionAttempt" (
  "id",
  "missionProgressId",
  "status",
  "startedAt",
  "completedAt"
)
SELECT
  'migrated_' || "id",
  "id",
  "status",
  "startedAt",
  "completedAt"
FROM "MissionProgress";

-- Calculate overall progress metadata across all historical playthroughs.
WITH progress_summary AS (
  SELECT
    "userId",
    "missionId",
    MIN("startedAt") AS "createdAt",
    MAX(COALESCE("completedAt", "startedAt")) AS "updatedAt",
    MIN("completedAt") FILTER (WHERE "status" = 'COMPLETED') AS "completedAt"
  FROM "MissionProgress"
  GROUP BY "userId", "missionId"
)
UPDATE "MissionProgress"
SET
  "createdAt" = progress_summary."createdAt",
  "updatedAt" = progress_summary."updatedAt",
  "completedAt" = progress_summary."completedAt"
FROM progress_summary
WHERE "MissionProgress"."userId" = progress_summary."userId"
  AND "MissionProgress"."missionId" = progress_summary."missionId";

-- Re-parent existing answers from overall progress to the migrated attempt.
ALTER TABLE "QuestionAttempt"
ADD COLUMN "missionAttemptId" TEXT;

UPDATE "QuestionAttempt"
SET "missionAttemptId" = 'migrated_' || "missionProgressId";

ALTER TABLE "QuestionAttempt"
ALTER COLUMN "missionAttemptId" SET NOT NULL;

ALTER TABLE "QuestionAttempt"
DROP CONSTRAINT "QuestionAttempt_missionProgressId_fkey";

DROP INDEX "QuestionAttempt_missionProgressId_questionId_key";

ALTER TABLE "QuestionAttempt"
DROP COLUMN "missionProgressId";

-- Keep the newest row as the single overall progress parent, while moving all
-- historical attempts under it.
WITH ranked_progress AS (
  SELECT
    "id",
    FIRST_VALUE("id") OVER (
      PARTITION BY "userId", "missionId"
      ORDER BY "startedAt" DESC, "id" DESC
    ) AS "keeperId"
  FROM "MissionProgress"
)
UPDATE "MissionAttempt"
SET "missionProgressId" = ranked_progress."keeperId"
FROM ranked_progress
WHERE "MissionAttempt"."missionProgressId" = ranked_progress."id";

WITH ranked_progress AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "userId", "missionId"
      ORDER BY "startedAt" DESC, "id" DESC
    ) AS "rowNumber"
  FROM "MissionProgress"
)
DELETE FROM "MissionProgress"
USING ranked_progress
WHERE "MissionProgress"."id" = ranked_progress."id"
  AND ranked_progress."rowNumber" > 1;

ALTER TABLE "MissionProgress"
DROP COLUMN "status",
DROP COLUMN "startedAt";

CREATE UNIQUE INDEX "MissionProgress_userId_missionId_key"
ON "MissionProgress"("userId", "missionId");

CREATE UNIQUE INDEX "QuestionAttempt_missionAttemptId_questionId_key"
ON "QuestionAttempt"("missionAttemptId", "questionId");

CREATE INDEX "MissionAttempt_missionProgressId_status_idx"
ON "MissionAttempt"("missionProgressId", "status");

ALTER TABLE "MissionAttempt"
ADD CONSTRAINT "MissionAttempt_missionProgressId_fkey"
FOREIGN KEY ("missionProgressId") REFERENCES "MissionProgress"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "QuestionAttempt"
ADD CONSTRAINT "QuestionAttempt_missionAttemptId_fkey"
FOREIGN KEY ("missionAttemptId") REFERENCES "MissionAttempt"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
