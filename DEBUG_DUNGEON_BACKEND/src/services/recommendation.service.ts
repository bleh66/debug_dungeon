import prisma from "../lib/prisma.js";
import {
  learningRecommendationsSchema,
  type LearningRecommendations,
} from "../types/recommendation-schema.js";
import {
  getLearnerPerformanceSummary,
  type LearnerConceptSummary,
} from "./learning.service.js";

type RecommendationPriority = "HIGH" | "MEDIUM" | "LOW";

const priorityForClassification = (
  classification: LearnerConceptSummary["classification"],
): RecommendationPriority => {
  if (classification === "weak") {
    return "HIGH";
  }

  if (classification === "developing") {
    return "MEDIUM";
  }

  return "LOW";
};

const reasonForPriority = (priority: RecommendationPriority) => {
  if (priority === "HIGH") {
    return "Accuracy is below 60%; prioritize targeted practice.";
  }

  if (priority === "MEDIUM") {
    return "Accuracy is between 60% and 79%; continue focused practice.";
  }

  return "Accuracy is at least 80%; no immediate focus is needed.";
};

export const getLearningRecommendations = async (
  userId: string,
): Promise<LearningRecommendations> => {
  const profile = await getLearnerPerformanceSummary(userId);
  const concepts = profile.concepts.map(({ concept }) => concept);
  const missions =
    concepts.length === 0
      ? []
      : await prisma.mission.findMany({
          where: {
            questions: {
              some: {
                concept: { in: concepts },
                options: { some: {} },
              },
            },
            progress: {
              none: {
                userId,
                completedAt: { not: null },
              },
            },
          },
          orderBy: { missionNumber: "asc" },
          select: {
            id: true,
            missionNumber: true,
            title: true,
            topic: true,
            difficulty: true,
            questions: {
              where: {
                concept: { in: concepts },
                options: { some: {} },
              },
              select: { concept: true },
            },
          },
        });

  const missionByConcept = new Map<
    string,
    Omit<(typeof missions)[number], "questions">
  >();

  for (const mission of missions) {
    const { questions, ...missionSummary } = mission;

    for (const question of questions) {
      if (!missionByConcept.has(question.concept)) {
        missionByConcept.set(question.concept, missionSummary);
      }
    }
  }

  const recommendations = profile.concepts
    .map((concept) => {
      const priority = priorityForClassification(concept.classification);

      return {
        ...concept,
        priority,
        reason: reasonForPriority(priority),
        mission: missionByConcept.get(concept.concept) ?? null,
      };
    })
    .sort((first, second) => {
      const priorityRank = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;

      return (
        priorityRank[first.priority] - priorityRank[second.priority] ||
        first.accuracy - second.accuracy ||
        second.attempted - first.attempted ||
        first.concept.localeCompare(second.concept)
      );
    });
  const nextFocus =
    recommendations.find(
      (recommendation) => recommendation.priority !== "LOW",
    ) ?? null;

  return learningRecommendationsSchema.parse({
    totalQuestionsAttempted: profile.totalQuestionsAttempted,
    totalCorrect: profile.totalCorrect,
    totalIncorrect: profile.totalIncorrect,
    overallAccuracy: profile.overallAccuracy,
    nextFocus,
    recommendations,
  });
};
