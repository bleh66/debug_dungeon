import prisma from "../lib/prisma.js";

type ConceptClassification = "strong" | "developing" | "weak";

export type LearnerConceptSummary = {
  concept: string;
  attempted: number;
  correct: number;
  incorrect: number;
  accuracy: number;
  classification: ConceptClassification;
};

export type LearnerPerformanceSummary = {
  totalQuestionsAttempted: number;
  totalCorrect: number;
  totalIncorrect: number;
  overallAccuracy: number;
  concepts: LearnerConceptSummary[];
};

const classifyConcept = (accuracy: number): ConceptClassification => {
  if (accuracy >= 80) {
    return "strong";
  }

  if (accuracy >= 60) {
    return "developing";
  }

  return "weak";
};

export const getLearnerPerformanceSummary = async (
  userId: string,
): Promise<LearnerPerformanceSummary> => {
  const questionAttempts = await prisma.questionAttempt.findMany({
    where: {
      missionAttempt: {
        missionProgress: {
          userId,
        },
      },
    },
    select: {
      isCorrect: true,
      question: {
        select: {
          concept: true,
        },
      },
    },
  });

  const conceptTotals = new Map<
    string,
    { attempted: number; correct: number }
  >();
  let totalCorrect = 0;

  for (const questionAttempt of questionAttempts) {
    const concept = questionAttempt.question.concept;
    const totals = conceptTotals.get(concept) ?? {
      attempted: 0,
      correct: 0,
    };

    totals.attempted += 1;

    if (questionAttempt.isCorrect) {
      totals.correct += 1;
      totalCorrect += 1;
    }

    conceptTotals.set(concept, totals);
  }

  const concepts = Array.from(conceptTotals, ([concept, totals]) => {
    const incorrect = totals.attempted - totals.correct;
    const accuracy = Math.round((totals.correct / totals.attempted) * 100);

    return {
      concept,
      attempted: totals.attempted,
      correct: totals.correct,
      incorrect,
      accuracy,
      classification: classifyConcept(accuracy),
    };
  }).sort((first, second) => {
    return (
      first.accuracy - second.accuracy ||
      second.attempted - first.attempted ||
      first.concept.localeCompare(second.concept)
    );
  });

  const totalQuestionsAttempted = questionAttempts.length;
  const totalIncorrect = totalQuestionsAttempted - totalCorrect;
  const overallAccuracy =
    totalQuestionsAttempted === 0
      ? 0
      : Math.round((totalCorrect / totalQuestionsAttempted) * 100);

  return {
    totalQuestionsAttempted,
    totalCorrect,
    totalIncorrect,
    overallAccuracy,
    concepts,
  };
};
