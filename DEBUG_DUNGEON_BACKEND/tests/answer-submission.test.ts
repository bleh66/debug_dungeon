import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { test } from "node:test";
import app from "../src/app.js";
import {
  submitAnswerForAttempt,
  type AnswerSubmissionRepository,
} from "../src/services/mission.service.js";

const input = {
  userId: "user-1",
  missionId: "mission-1",
  attemptId: "attempt-1",
  questionId: "question-1",
  selectedOptionId: "option-1",
};

const createRepository = (
  overrides: Partial<AnswerSubmissionRepository> = {},
) => {
  let createdAnswer:
    | Parameters<AnswerSubmissionRepository["createQuestionAttempt"]>[0]
    | undefined;

  const repository: AnswerSubmissionRepository = {
    findAttemptById: async () => ({
      status: "IN_PROGRESS",
      missionProgress: {
        userId: input.userId,
        missionId: input.missionId,
      },
    }),
    findQuestionById: async () => ({
      missionId: input.missionId,
      explanation: "Because this is the correct option.",
      xpReward: 10,
    }),
    findOptionById: async () => ({
      questionId: input.questionId,
      isCorrect: true,
    }),
    createQuestionAttempt: async (data) => {
      createdAnswer = data;
      return "CREATED";
    },
    ...overrides,
  };

  return {
    repository,
    getCreatedAnswer: () => createdAnswer,
  };
};

test("submits a valid correct answer", async () => {
  const fixture = createRepository();
  const result = await submitAnswerForAttempt(input, fixture.repository);

  assert.deepEqual(result, {
    ok: true,
    answer: {
      correct: true,
      explanation: "Because this is the correct option.",
      xpEarned: 10,
    },
  });
  assert.deepEqual(fixture.getCreatedAnswer(), {
    missionAttemptId: input.attemptId,
    questionId: input.questionId,
    selectedOptionId: input.selectedOptionId,
    isCorrect: true,
  });
});

test("submits a valid incorrect answer without awarding XP", async () => {
  const fixture = createRepository({
    findOptionById: async () => ({
      questionId: input.questionId,
      isCorrect: false,
    }),
  });

  const result = await submitAnswerForAttempt(input, fixture.repository);

  assert.deepEqual(result, {
    ok: true,
    answer: {
      correct: false,
      explanation: "Because this is the correct option.",
      xpEarned: 0,
    },
  });
});

test("rejects an unauthenticated answer request", async () => {
  const server = app.listen(0);

  try {
    await new Promise<void>((resolve) => server.once("listening", resolve));
    const { port } = server.address() as AddressInfo;
    const cuid = "cjld2cjxh0000qzrmn831i7rn";

    const response = await fetch(
      `http://127.0.0.1:${port}/missions/${cuid}/attempts/${cuid}/questions/${cuid}`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ selectedOptionId: cuid }),
      },
    );

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { message: "Unauthorized" });
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});

test("rejects an attempt belonging to another user", async () => {
  const fixture = createRepository({
    findAttemptById: async () => ({
      status: "IN_PROGRESS",
      missionProgress: {
        userId: "another-user",
        missionId: input.missionId,
      },
    }),
  });

  const result = await submitAnswerForAttempt(input, fixture.repository);

  assert.deepEqual(result, { ok: false, code: "ATTEMPT_FORBIDDEN" });
});

for (const status of ["ABANDONED", "COMPLETED"] as const) {
  test(`rejects an ${status.toLowerCase()} attempt`, async () => {
    const fixture = createRepository({
      findAttemptById: async () => ({
        status,
        missionProgress: {
          userId: input.userId,
          missionId: input.missionId,
        },
      }),
    });

    const result = await submitAnswerForAttempt(input, fixture.repository);

    assert.deepEqual(result, {
      ok: false,
      code: "ATTEMPT_NOT_IN_PROGRESS",
    });
  });
}

test("rejects a question belonging to another mission", async () => {
  const fixture = createRepository({
    findQuestionById: async () => ({
      missionId: "another-mission",
      explanation: null,
      xpReward: 10,
    }),
  });

  const result = await submitAnswerForAttempt(input, fixture.repository);

  assert.deepEqual(result, {
    ok: false,
    code: "QUESTION_MISSION_MISMATCH",
  });
});

test("rejects an option belonging to another question", async () => {
  const fixture = createRepository({
    findOptionById: async () => ({
      questionId: "another-question",
      isCorrect: true,
    }),
  });

  const result = await submitAnswerForAttempt(input, fixture.repository);

  assert.deepEqual(result, {
    ok: false,
    code: "OPTION_QUESTION_MISMATCH",
  });
});

test("rejects a duplicate answer submission", async () => {
  const fixture = createRepository({
    createQuestionAttempt: async () => "DUPLICATE",
  });

  const result = await submitAnswerForAttempt(input, fixture.repository);

  assert.deepEqual(result, { ok: false, code: "DUPLICATE_ANSWER" });
});
