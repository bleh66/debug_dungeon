import { Prisma } from "../generated/prisma/client.js";
import prisma from "../lib/prisma.js";
import type { GeneratedMission } from "../types/mission-schema.js";

const MAX_PERSISTENCE_ATTEMPTS = 3;

export type PublishedMission = {
  id: string;
  missionNumber: number;
  title: string;
  topic: string;
  difficulty: GeneratedMission["difficulty"];
  questionCount: number;
};

const isRetryableWriteConflict = (error: unknown) => {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2002" || error.code === "P2034")
  );
};

const persistInTransaction = (mission: GeneratedMission) => {
  return prisma.$transaction(
    async (tx) => {
      const currentMaximum = await tx.mission.aggregate({
        _max: { missionNumber: true },
      });
      const missionNumber = (currentMaximum._max.missionNumber ?? 0) + 1;
      const createdMission = await tx.mission.create({
        data: {
          title: mission.title,
          topic: mission.topic,
          difficulty: mission.difficulty,
          missionNumber,
        },
        select: {
          id: true,
          missionNumber: true,
          title: true,
          topic: true,
          difficulty: true,
        },
      });

      for (const question of mission.questions) {
        const createdQuestion = await tx.question.create({
          data: {
            missionId: createdMission.id,
            text: question.text,
            explanation: question.explanation,
            concept: question.concept,
            xpReward: question.xpReward,
          },
          select: { id: true },
        });

        await tx.option.createMany({
          data: question.options.map((option) => ({
            questionId: createdQuestion.id,
            text: option.text,
            isCorrect: option.isCorrect,
            displayOrder: option.displayOrder,
          })),
        });
      }

      return {
        ...createdMission,
        questionCount: mission.questions.length,
      };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
};

export const persistGeneratedMission = async (
  mission: GeneratedMission,
): Promise<PublishedMission> => {
  for (let attempt = 1; attempt <= MAX_PERSISTENCE_ATTEMPTS; attempt += 1) {
    try {
      return await persistInTransaction(mission);
    } catch (error) {
      if (
        !isRetryableWriteConflict(error) ||
        attempt === MAX_PERSISTENCE_ATTEMPTS
      ) {
        throw error;
      }
    }
  }

  throw new Error("Mission persistence retry limit reached");
};
