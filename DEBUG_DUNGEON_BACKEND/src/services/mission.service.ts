import prisma from "../lib/prisma.js";
import { Prisma } from "../generated/prisma/client.js";

type MissionAttemptStatus = "IN_PROGRESS" | "COMPLETED" | "ABANDONED";

type AnswerSubmissionInput = {
  userId: string;
  missionId: string;
  attemptId: string;
  questionId: string;
  selectedOptionId: string;
};

type AnswerSubmissionErrorCode =
  | "ATTEMPT_NOT_FOUND"
  | "ATTEMPT_FORBIDDEN"
  | "ATTEMPT_MISSION_MISMATCH"
  | "ATTEMPT_NOT_IN_PROGRESS"
  | "QUESTION_NOT_FOUND"
  | "QUESTION_MISSION_MISMATCH"
  | "OPTION_NOT_FOUND"
  | "OPTION_QUESTION_MISMATCH"
  | "DUPLICATE_ANSWER";

type AnswerSubmissionResult =
  | {
      ok: true;
      answer: {
        correct: boolean;
        explanation: string | null;
        xpEarned: number;
      };
    }
  | {
      ok: false;
      code: AnswerSubmissionErrorCode;
    };

type QuestionAttemptData = {
  missionAttemptId: string;
  questionId: string;
  selectedOptionId: string;
  isCorrect: boolean;
};

type MissionCompletionInput = {
  userId: string;
  missionId: string;
  attemptId: string;
};

type MissionCompletionErrorCode =
  | "ATTEMPT_NOT_FOUND"
  | "ATTEMPT_FORBIDDEN"
  | "ATTEMPT_MISSION_MISMATCH"
  | "ATTEMPT_NOT_IN_PROGRESS";

type MissionCompletionResult =
  | {
      ok: true;
      completion: {
        status: "COMPLETED";
        score: number;
        xpEarned: number;
        correctAnswers: number;
        totalQuestions: number;
      };
    }
  | {
      ok: false;
      code: MissionCompletionErrorCode;
    };

export type AnswerSubmissionRepository = {
  findAttemptById: (attemptId: string) => Promise<{
    status: MissionAttemptStatus;
    missionProgress: {
      userId: string;
      missionId: string;
    };
  } | null>;
  findQuestionById: (questionId: string) => Promise<{
    missionId: string;
    explanation: string | null;
    xpReward: number;
  } | null>;
  findOptionById: (optionId: string) => Promise<{
    questionId: string;
    isCorrect: boolean;
  } | null>;
  createQuestionAttempt: (
    data: QuestionAttemptData,
  ) => Promise<"CREATED" | "DUPLICATE">;
};

export type CompletionAttemptRecord = {
  status: MissionAttemptStatus;
  missionProgressId: string;
  missionProgress: {
    userId: string;
    missionId: string;
  };
  questionAttempts: Array<{
    question: {
      xpReward: number;
    };
  }>;
};

export type MissionCompletionTransaction = {
  findAttemptById: (
    attemptId: string,
  ) => Promise<CompletionAttemptRecord | null>;
  countMissionQuestions: (missionId: string) => Promise<number>;
  completeAttempt: (
    attemptId: string,
    score: number,
    xpEarned: number,
    completedAt: Date,
  ) => Promise<boolean>;
  markProgressCompleted: (
    missionProgressId: string,
    completedAt: Date,
  ) => Promise<void>;
  raiseBestScore: (
    missionProgressId: string,
    score: number,
  ) => Promise<void>;
  findCompletedMaxXp: (missionProgressId: string) => Promise<number>;
  incrementUserXp: (userId: string, amount: number) => Promise<void>;
};

export type MissionCompletionRepository = {
  runInTransaction: <T>(
    operation: (transaction: MissionCompletionTransaction) => Promise<T>,
  ) => Promise<T>;
};

const answerSubmissionRepository: AnswerSubmissionRepository = {
  findAttemptById: (attemptId) => {
    return prisma.missionAttempt.findUnique({
      where: {
        id: attemptId,
      },
      select: {
        status: true,
        missionProgress: {
          select: {
            userId: true,
            missionId: true,
          },
        },
      },
    });
  },
  findQuestionById: (questionId) => {
    return prisma.question.findUnique({
      where: {
        id: questionId,
      },
      select: {
        missionId: true,
        explanation: true,
        xpReward: true,
      },
    });
  },
  findOptionById: (optionId) => {
    return prisma.option.findUnique({
      where: {
        id: optionId,
      },
      select: {
        questionId: true,
        isCorrect: true,
      },
    });
  },
  createQuestionAttempt: async (data) => {
    try {
      await prisma.questionAttempt.create({
        data,
      });

      return "CREATED";
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return "DUPLICATE";
      }

      throw error;
    }
  },
};

const missionCompletionRepository: MissionCompletionRepository = {
  runInTransaction: (operation) => {
    return prisma.$transaction(async (tx) => {
      const transaction: MissionCompletionTransaction = {
        findAttemptById: (attemptId) => {
          return tx.missionAttempt.findUnique({
            where: {
              id: attemptId,
            },
            select: {
              status: true,
              missionProgressId: true,
              missionProgress: {
                select: {
                  userId: true,
                  missionId: true,
                },
              },
              questionAttempts: {
                where: {
                  isCorrect: true,
                },
                select: {
                  question: {
                    select: {
                      xpReward: true,
                    },
                  },
                },
              },
            },
          });
        },
        countMissionQuestions: (missionId) => {
          return tx.question.count({
            where: {
              missionId,
            },
          });
        },
        completeAttempt: async (
          attemptId,
          score,
          xpEarned,
          completedAt,
        ) => {
          const result = await tx.missionAttempt.updateMany({
            where: {
              id: attemptId,
              status: "IN_PROGRESS",
            },
            data: {
              status: "COMPLETED",
              score,
              xpEarned,
              completedAt,
            },
          });

          return result.count === 1;
        },
        markProgressCompleted: async (
          missionProgressId,
          completedAt,
        ) => {
          await tx.missionProgress.update({
            where: {
              id: missionProgressId,
            },
            data: {
              completedAt,
            },
          });
        },
        raiseBestScore: async (missionProgressId, score) => {
          await tx.missionProgress.updateMany({
            where: {
              id: missionProgressId,
              OR: [
                { bestScore: null },
                {
                  bestScore: {
                    lt: score,
                  },
                },
              ],
            },
            data: {
              bestScore: score,
            },
          });
        },
        findCompletedMaxXp: async (missionProgressId) => {
          const result = await tx.missionAttempt.aggregate({
            where: {
              missionProgressId,
              status: "COMPLETED",
            },
            _max: {
              xpEarned: true,
            },
          });

          return result._max.xpEarned ?? 0;
        },
        incrementUserXp: async (userId, amount) => {
          await tx.user.update({
            where: {
              id: userId,
            },
            data: {
              xp: {
                increment: amount,
              },
            },
          });
        },
      };

      return operation(transaction);
    });
  },
};

const findMissionForGameplay = (missionId: string) => {
  return prisma.mission.findUnique({
    where: {
      id: missionId,
    },
    select: {
      id: true,
      title: true,
      topic: true,
      difficulty: true,
      missionNumber: true,
      questions: {
        select: {
          id: true,
          missionId: true,
          text: true,
          concept: true,
          xpReward: true,
          options: {
            orderBy: {
              displayOrder: "asc",
            },
            select: {
              id: true,
              questionId: true,
              text: true,
              displayOrder: true,
            },
          },
        },
      },
    },
  });
};

export const getMissionForUser = async (missionId: string) => {
  return findMissionForGameplay(missionId);
};

const findActiveAttemptForUserMission = (
  userId: string,
  missionId: string,
) => {
  return prisma.missionAttempt.findFirst({
    where: {
      status: "IN_PROGRESS",
      missionProgress: {
        userId,
        missionId,
      },
    },
    select: {
      id: true,
      missionProgressId: true,
    },
  });
};

const isUniqueConstraintError = (error: unknown) => {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
};

export const startMissionForUser = async (
  userId: string,
  missionId: string,
) => {
  const mission = await findMissionForGameplay(missionId);

  if (!mission) {
    return null;
  }

  try {
    const attemptState = await prisma.$transaction(async (tx) => {
      const progress = await tx.missionProgress.upsert({
        where: {
          userId_missionId: {
            userId,
            missionId: mission.id,
          },
        },
        update: {},
        create: {
          userId,
          missionId: mission.id,
        },
      });

      const activeAttempt = await tx.missionAttempt.findFirst({
        where: {
          missionProgressId: progress.id,
          status: "IN_PROGRESS",
        },
        orderBy: {
          startedAt: "desc",
        },
      });

      if (activeAttempt) {
        return {
          missionProgressId: progress.id,
          missionAttemptId: activeAttempt.id,
          resumed: true,
        };
      }

      const attempt = await tx.missionAttempt.create({
        data: {
          missionProgressId: progress.id,
        },
      });

      return {
        missionProgressId: progress.id,
        missionAttemptId: attempt.id,
        resumed: false,
      };
    });

    return {
      ...attemptState,
      mission,
    };
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const activeAttempt = await findActiveAttemptForUserMission(
      userId,
      mission.id,
    );

    if (!activeAttempt) {
      throw error;
    }

    return {
      missionProgressId: activeAttempt.missionProgressId,
      missionAttemptId: activeAttempt.id,
      resumed: true,
      mission,
    };
  }
};

export const restartMissionForUser = async (
  userId: string,
  missionId: string,
) => {
  const mission = await findMissionForGameplay(missionId);

  if (!mission) {
    return null;
  }

  try {
    const attemptState = await prisma.$transaction(async (tx) => {
      const progress = await tx.missionProgress.upsert({
        where: {
          userId_missionId: {
            userId,
            missionId: mission.id,
          },
        },
        update: {},
        create: {
          userId,
          missionId: mission.id,
        },
      });

      const restartedAt = new Date();

      await tx.missionAttempt.updateMany({
        where: {
          missionProgressId: progress.id,
          status: "IN_PROGRESS",
        },
        data: {
          status: "ABANDONED",
          completedAt: restartedAt,
        },
      });

      const attempt = await tx.missionAttempt.create({
        data: {
          missionProgressId: progress.id,
          startedAt: restartedAt,
        },
      });

      return {
        missionProgressId: progress.id,
        missionAttemptId: attempt.id,
        resumed: false,
      };
    });

    return {
      ...attemptState,
      mission,
    };
  } catch (error) {
    if (!isUniqueConstraintError(error)) {
      throw error;
    }

    const activeAttempt = await findActiveAttemptForUserMission(
      userId,
      mission.id,
    );

    if (!activeAttempt) {
      throw error;
    }

    return {
      missionProgressId: activeAttempt.missionProgressId,
      missionAttemptId: activeAttempt.id,
      resumed: true,
      mission,
    };
  }
};

export const submitAnswerForAttempt = async (
  input: AnswerSubmissionInput,
  repository: AnswerSubmissionRepository = answerSubmissionRepository,
): Promise<AnswerSubmissionResult> => {
  const attempt = await repository.findAttemptById(input.attemptId);

  if (!attempt) {
    return { ok: false, code: "ATTEMPT_NOT_FOUND" };
  }

  if (attempt.missionProgress.userId !== input.userId) {
    return { ok: false, code: "ATTEMPT_FORBIDDEN" };
  }

  if (attempt.missionProgress.missionId !== input.missionId) {
    return { ok: false, code: "ATTEMPT_MISSION_MISMATCH" };
  }

  if (attempt.status !== "IN_PROGRESS") {
    return { ok: false, code: "ATTEMPT_NOT_IN_PROGRESS" };
  }

  const question = await repository.findQuestionById(input.questionId);

  if (!question) {
    return { ok: false, code: "QUESTION_NOT_FOUND" };
  }

  if (question.missionId !== input.missionId) {
    return { ok: false, code: "QUESTION_MISSION_MISMATCH" };
  }

  const option = await repository.findOptionById(input.selectedOptionId);

  if (!option) {
    return { ok: false, code: "OPTION_NOT_FOUND" };
  }

  if (option.questionId !== input.questionId) {
    return { ok: false, code: "OPTION_QUESTION_MISMATCH" };
  }

  const createResult = await repository.createQuestionAttempt({
    missionAttemptId: input.attemptId,
    questionId: input.questionId,
    selectedOptionId: input.selectedOptionId,
    isCorrect: option.isCorrect,
  });

  if (createResult === "DUPLICATE") {
    return { ok: false, code: "DUPLICATE_ANSWER" };
  }

  return {
    ok: true,
    answer: {
      correct: option.isCorrect,
      explanation: question.explanation,
      xpEarned: option.isCorrect ? question.xpReward : 0,
    },
  };
};

export const completeMissionAttempt = async (
  input: MissionCompletionInput,
  repository: MissionCompletionRepository = missionCompletionRepository,
): Promise<MissionCompletionResult> => {
  return repository.runInTransaction(async (transaction) => {
    const attempt = await transaction.findAttemptById(input.attemptId);

    if (!attempt) {
      return { ok: false, code: "ATTEMPT_NOT_FOUND" };
    }

    if (attempt.missionProgress.userId !== input.userId) {
      return { ok: false, code: "ATTEMPT_FORBIDDEN" };
    }

    if (attempt.missionProgress.missionId !== input.missionId) {
      return { ok: false, code: "ATTEMPT_MISSION_MISMATCH" };
    }

    if (attempt.status !== "IN_PROGRESS") {
      return { ok: false, code: "ATTEMPT_NOT_IN_PROGRESS" };
    }

    const totalQuestions = await transaction.countMissionQuestions(
      input.missionId,
    );
    const correctAnswers = attempt.questionAttempts.length;
    const score =
      totalQuestions === 0
        ? 0
        : Math.round((correctAnswers / totalQuestions) * 100);
    const xpEarned = attempt.questionAttempts.reduce(
      (total, questionAttempt) =>
        total + questionAttempt.question.xpReward,
      0,
    );
    const previousMissionMaxXp = await transaction.findCompletedMaxXp(
      attempt.missionProgressId,
    );
    const completedAt = new Date();

    const completed = await transaction.completeAttempt(
      input.attemptId,
      score,
      xpEarned,
      completedAt,
    );

    if (!completed) {
      return { ok: false, code: "ATTEMPT_NOT_IN_PROGRESS" };
    }

    await transaction.markProgressCompleted(
      attempt.missionProgressId,
      completedAt,
    );
    await transaction.raiseBestScore(
      attempt.missionProgressId,
      score,
    );

    const newMissionMaxXp = Math.max(previousMissionMaxXp, xpEarned);
    const xpIncrease = newMissionMaxXp - previousMissionMaxXp;

    if (xpIncrease > 0) {
      await transaction.incrementUserXp(input.userId, xpIncrease);
    }

    return {
      ok: true,
      completion: {
        status: "COMPLETED",
        score,
        xpEarned,
        correctAnswers,
        totalQuestions,
      },
    };
  });
};

export const getMissionProgressForUser = async (
  userId: string,
  missionId: string,
) => {
  const mission = await prisma.mission.findUnique({
    where: {
      id: missionId,
    },
    select: {
      id: true,
      title: true,
      topic: true,
      difficulty: true,
      missionNumber: true,
      progress: {
        where: {
          userId,
        },
        take: 1,
        select: {
          bestScore: true,
          completedAt: true,
          attempts: {
            orderBy: {
              startedAt: "asc",
            },
            select: {
              id: true,
              status: true,
              score: true,
              xpEarned: true,
              startedAt: true,
              completedAt: true,
            },
          },
        },
      },
    },
  });

  if (!mission) {
    return { ok: false as const, code: "MISSION_NOT_FOUND" as const };
  }

  const progress = mission.progress[0];

  if (!progress) {
    return { ok: false as const, code: "PROGRESS_NOT_FOUND" as const };
  }

  return {
    ok: true as const,
    progress: {
      missionId: mission.id,
      title: mission.title,
      topic: mission.topic,
      difficulty: mission.difficulty,
      missionNumber: mission.missionNumber,
      bestScore: progress.bestScore,
      completedAt: progress.completedAt,
      attempts: progress.attempts,
    },
  };
};

export const getMissionPerformanceForUser = async (
  userId: string,
  missionId: string,
) => {
  const mission = await prisma.mission.findUnique({
    where: {
      id: missionId,
    },
    select: {
      id: true,
      progress: {
        where: {
          userId,
        },
        take: 1,
        select: {
          attempts: {
            select: {
              questionAttempts: {
                select: {
                  isCorrect: true,
                  question: {
                    select: {
                      concept: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!mission) {
    return { ok: false as const, code: "MISSION_NOT_FOUND" as const };
  }

  const progress = mission.progress[0];

  if (!progress) {
    return { ok: false as const, code: "PROGRESS_NOT_FOUND" as const };
  }

  const conceptPerformance = new Map<
    string,
    { attempted: number; correct: number }
  >();

  for (const attempt of progress.attempts) {
    for (const questionAttempt of attempt.questionAttempts) {
      const concept = questionAttempt.question.concept;
      const current = conceptPerformance.get(concept) ?? {
        attempted: 0,
        correct: 0,
      };

      current.attempted += 1;

      if (questionAttempt.isCorrect) {
        current.correct += 1;
      }

      conceptPerformance.set(concept, current);
    }
  }

  const concepts = Array.from(conceptPerformance, ([concept, values]) => ({
    concept,
    attempted: values.attempted,
    correct: values.correct,
    accuracy: Math.round((values.correct / values.attempted) * 100),
  })).sort((first, second) => first.concept.localeCompare(second.concept));

  return {
    ok: true as const,
    performance: {
      missionId: mission.id,
      concepts,
    },
  };
};
