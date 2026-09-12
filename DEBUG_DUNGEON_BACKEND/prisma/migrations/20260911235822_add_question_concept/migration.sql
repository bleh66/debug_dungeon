ALTER TABLE "Question"
ADD COLUMN "concept" TEXT;

UPDATE "Question"
SET "concept" = CASE
  WHEN "text" = 'Which keyword creates a block-scoped variable?'
    THEN 'block-scope'
  WHEN "text" = 'What does === compare in JavaScript?'
    THEN 'strict-equality'
  ELSE 'general'
END;

ALTER TABLE "Question"
ALTER COLUMN "concept" SET NOT NULL;
