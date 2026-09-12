import assert from "node:assert/strict";
import { test } from "node:test";
import {
  completeMissionAttempt,
  type CompletionAttemptRecord,
  type MissionCompletionRepository,
  type MissionCompletionTransaction,
} from "../src/services/mission.service.js";

const input = {
  userId: "user-1",
  missionId: "mission-1",
  attemptId: "attempt-1",
};

type FixtureOptions = {
  attempt?: CompletionAttemptRecord | null;
  totalQuestions?: number;
  bestScore?: number | null;
  completedMaxXp?: number;
  userXp?: number;
};

const createCorrectAttempts = (...xpRewards: number[]) => {
  return xpRewards.map((xpReward) => ({
    question: {
      xpReward,
    },
  }));
};

const createCompletionFixture = (options: FixtureOptions = {}) => {
  let attemptStatus = options.attempt?.status ?? "IN_PROGRESS";
  let attemptScore: number | null = null;
  let attemptXp = 0;
  let progressCompletedAt: Date | null = null;
  let bestScore = options.bestScore ?? null;
  const completedMaxXp = options.completedMaxXp ?? 0;
  let userXp = options.userXp ?? completedMaxXp;

  const defaultAttempt: CompletionAttemptRecord = {
    status: attemptStatus,
    missionProgressId: "progress-1",
    missionProgress: {
      userId: input.userId,
      missionId: input.missionId,
    },
    questionAttempts: createCorrectAttempts(10, 10, 10, 10),
  };

  const configuredAttempt =
    options.attempt === undefined ? defaultAttempt : options.attempt;

  const transaction: MissionCompletionTransaction = {
    findAttemptById: async () => {
      if (!configuredAttempt) {
        return null;
      }

      return {
        ...configuredAttempt,
        status: attemptStatus,
      };
    },
    countMissionQuestions: async () => options.totalQuestions ?? 5,
    completeAttempt: async (_attemptId, score, xpEarned) => {
      if (attemptStatus !== "IN_PROGRESS") {
        return false;
      }

      attemptStatus = "COMPLETED";
      attemptScore = score;
      attemptXp = xpEarned;
      return true;
    },
    markProgressCompleted: async (_progressId, completedAt) => {
      progressCompletedAt = completedAt;
    },
    raiseBestScore: async (_progressId, score) => {
      if (bestScore === null || score > bestScore) {
        bestScore = score;
      }
    },
    findCompletedMaxXp: async () => completedMaxXp,
    incrementUserXp: async (_userId, amount) => {
      userXp += amount;
    },
  };

  const repository: MissionCompletionRepository = {
    runInTransaction: async (operation) => operation(transaction),
  };

  return {
    repository,
    getState: () => ({
      attemptStatus,
      attemptScore,
      attemptXp,
      progressCompletedAt,
      bestScore,
      userXp,
    }),
  };
};

test("completes a fully answered attempt", async () => {
  const fixture = createCompletionFixture({
    totalQuestions: 4,
  });

  const result = await completeMissionAttempt(input, fixture.repository);

  assert.deepEqual(result, {
    ok: true,
    completion: {
      status: "COMPLETED",
      score: 100,
      xpEarned: 40,
      correctAnswers: 4,
      totalQuestions: 4,
    },
  });
  assert.equal(fixture.getState().attemptStatus, "COMPLETED");
  assert.ok(fixture.getState().progressCompletedAt instanceof Date);
});

test("calculates score from correct and incorrect answers", async () => {
  const fixture = createCompletionFixture({
    totalQuestions: 4,
    attempt: {
      status: "IN_PROGRESS",
      missionProgressId: "progress-1",
      missionProgress: {
        userId: input.userId,
        missionId: input.missionId,
      },
      questionAttempts: createCorrectAttempts(10, 10, 10),
    },
  });

  const result = await completeMissionAttempt(input, fixture.repository);

  assert.equal(result.ok && result.completion.score, 75);
  assert.equal(result.ok && result.completion.correctAnswers, 3);
});

test("calculates XP from each correctly answered question", async () => {
  const fixture = createCompletionFixture({
    totalQuestions: 5,
    attempt: {
      status: "IN_PROGRESS",
      missionProgressId: "progress-1",
      missionProgress: {
        userId: input.userId,
        missionId: input.missionId,
      },
      questionAttempts: createCorrectAttempts(5, 15, 25),
    },
  });

  const result = await completeMissionAttempt(input, fixture.repository);

  assert.equal(result.ok && result.completion.xpEarned, 45);
  assert.equal(fixture.getState().attemptXp, 45);
});

test("allows incomplete attempts and counts unanswered questions as incorrect", async () => {
  const fixture = createCompletionFixture({
    totalQuestions: 5,
    attempt: {
      status: "IN_PROGRESS",
      missionProgressId: "progress-1",
      missionProgress: {
        userId: input.userId,
        missionId: input.missionId,
      },
      questionAttempts: createCorrectAttempts(10),
    },
  });

  const result = await completeMissionAttempt(input, fixture.repository);

  assert.deepEqual(result, {
    ok: true,
    completion: {
      status: "COMPLETED",
      score: 20,
      xpEarned: 10,
      correctAnswers: 1,
      totalQuestions: 5,
    },
  });
});

test("rejects another user's attempt", async () => {
  const fixture = createCompletionFixture({
    attempt: {
      status: "IN_PROGRESS",
      missionProgressId: "progress-1",
      missionProgress: {
        userId: "another-user",
        missionId: input.missionId,
      },
      questionAttempts: [],
    },
  });

  const result = await completeMissionAttempt(input, fixture.repository);

  assert.deepEqual(result, { ok: false, code: "ATTEMPT_FORBIDDEN" });
});

test("rejects a nonexistent attempt", async () => {
  const fixture = createCompletionFixture({ attempt: null });

  const result = await completeMissionAttempt(input, fixture.repository);

  assert.deepEqual(result, { ok: false, code: "ATTEMPT_NOT_FOUND" });
});

test("rejects an attempt from another mission", async () => {
  const fixture = createCompletionFixture({
    attempt: {
      status: "IN_PROGRESS",
      missionProgressId: "progress-1",
      missionProgress: {
        userId: input.userId,
        missionId: "another-mission",
      },
      questionAttempts: [],
    },
  });

  const result = await completeMissionAttempt(input, fixture.repository);

  assert.deepEqual(result, {
    ok: false,
    code: "ATTEMPT_MISSION_MISMATCH",
  });
});

for (const status of ["COMPLETED", "ABANDONED"] as const) {
  test(`rejects an already ${status.toLowerCase()} attempt`, async () => {
    const fixture = createCompletionFixture({
      attempt: {
        status,
        missionProgressId: "progress-1",
        missionProgress: {
          userId: input.userId,
          missionId: input.missionId,
        },
        questionAttempts: [],
      },
    });

    const result = await completeMissionAttempt(input, fixture.repository);

    assert.deepEqual(result, {
      ok: false,
      code: "ATTEMPT_NOT_IN_PROGRESS",
    });
  });
}

test("preserves a higher existing bestScore", async () => {
  const fixture = createCompletionFixture({
    totalQuestions: 5,
    bestScore: 90,
    attempt: {
      status: "IN_PROGRESS",
      missionProgressId: "progress-1",
      missionProgress: {
        userId: input.userId,
        missionId: input.missionId,
      },
      questionAttempts: createCorrectAttempts(10, 10),
    },
  });

  await completeMissionAttempt(input, fixture.repository);

  assert.equal(fixture.getState().attemptScore, 40);
  assert.equal(fixture.getState().bestScore, 90);
});

test("updates bestScore when the new score is higher", async () => {
  const fixture = createCompletionFixture({
    totalQuestions: 5,
    bestScore: 40,
  });

  await completeMissionAttempt(input, fixture.repository);

  assert.equal(fixture.getState().attemptScore, 80);
  assert.equal(fixture.getState().bestScore, 80);
});
