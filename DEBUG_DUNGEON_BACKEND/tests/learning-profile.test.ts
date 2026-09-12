import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";
import { generateToken } from "../src/utils/jwt.js";

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
let fixture: Awaited<ReturnType<typeof createFixture>>;

const createFixture = async () => {
  const [user, otherUser, userWithoutAttempts] = await Promise.all([
    prisma.user.create({
      data: {
        email: `${randomUUID()}@example.com`,
        passwordHash: "test-password-hash",
      },
    }),
    prisma.user.create({
      data: {
        email: `${randomUUID()}@example.com`,
        passwordHash: "test-password-hash",
      },
    }),
    prisma.user.create({
      data: {
        email: `${randomUUID()}@example.com`,
        passwordHash: "test-password-hash",
      },
    }),
  ]);

  const concepts = [
    "closures",
    "promises",
    "async-await",
    "block-scope",
    "event-loop",
  ];
  const mission = await prisma.mission.create({
    data: {
      title: "Learning profile test mission",
      topic: "JavaScript",
      difficulty: "MEDIUM",
      missionNumber: randomInt(100_000_000, 2_000_000_000),
      questions: {
        create: concepts.map((concept, index) => ({
          text: `Learning profile question ${index + 1}`,
          concept,
          explanation: `Learning profile explanation ${index + 1}`,
          xpReward: 10,
          options: {
            create: [
              { text: "Correct", isCorrect: true, displayOrder: 1 },
              { text: "Incorrect", isCorrect: false, displayOrder: 2 },
            ],
          },
        })),
      },
    },
    include: {
      questions: {
        include: {
          options: true,
        },
      },
    },
  });

  const [progress, otherProgress] = await Promise.all([
    prisma.missionProgress.create({
      data: {
        userId: user.id,
        missionId: mission.id,
      },
    }),
    prisma.missionProgress.create({
      data: {
        userId: otherUser.id,
        missionId: mission.id,
      },
    }),
  ]);

  const [firstCompleted, secondCompleted, abandoned, active, otherAttempt] =
    await Promise.all([
      prisma.missionAttempt.create({
        data: {
          missionProgressId: progress.id,
          status: "COMPLETED",
          completedAt: new Date(),
        },
      }),
      prisma.missionAttempt.create({
        data: {
          missionProgressId: progress.id,
          status: "COMPLETED",
          completedAt: new Date(),
        },
      }),
      prisma.missionAttempt.create({
        data: {
          missionProgressId: progress.id,
          status: "ABANDONED",
          completedAt: new Date(),
        },
      }),
      prisma.missionAttempt.create({
        data: {
          missionProgressId: progress.id,
        },
      }),
      prisma.missionAttempt.create({
        data: {
          missionProgressId: otherProgress.id,
          status: "COMPLETED",
          completedAt: new Date(),
        },
      }),
    ]);

  const questions = new Map(
    mission.questions.map((question) => [question.concept, question]),
  );
  const answer = (
    missionAttemptId: string,
    concept: string,
    isCorrect: boolean,
  ) => {
    const question = questions.get(concept);

    if (!question) {
      throw new Error(`Missing learning-profile question for ${concept}`);
    }

    const selectedOption = question.options.find(
      (option) => option.isCorrect === isCorrect,
    );

    if (!selectedOption) {
      throw new Error(`Missing learning-profile option for ${concept}`);
    }

    return {
      missionAttemptId,
      questionId: question.id,
      selectedOptionId: selectedOption.id,
      isCorrect,
    };
  };

  await prisma.questionAttempt.createMany({
    data: [
      answer(firstCompleted.id, "closures", true),
      answer(firstCompleted.id, "promises", true),
      answer(firstCompleted.id, "async-await", false),
      answer(firstCompleted.id, "block-scope", true),
      answer(firstCompleted.id, "event-loop", true),
      answer(secondCompleted.id, "closures", false),
      answer(secondCompleted.id, "promises", false),
      answer(secondCompleted.id, "block-scope", true),
      answer(abandoned.id, "closures", true),
      answer(abandoned.id, "block-scope", false),
      answer(active.id, "closures", false),
      answer(otherAttempt.id, "closures", true),
      answer(otherAttempt.id, "promises", true),
      answer(otherAttempt.id, "async-await", true),
      answer(otherAttempt.id, "block-scope", true),
      answer(otherAttempt.id, "event-loop", true),
    ],
  });

  return {
    user,
    otherUser,
    userWithoutAttempts,
    mission,
  };
};

const getLearningProfile = (token?: string) => {
  return fetch(`${baseUrl}/users/me/learning-profile`, {
    headers: token
      ? {
          authorization: `Bearer ${token}`,
        }
      : undefined,
  });
};

before(async () => {
  fixture = await createFixture();
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  await prisma.questionAttempt.deleteMany({
    where: {
      question: {
        missionId: fixture.mission.id,
      },
    },
  });
  await prisma.missionAttempt.deleteMany({
    where: {
      missionProgress: {
        missionId: fixture.mission.id,
      },
    },
  });
  await prisma.missionProgress.deleteMany({
    where: {
      missionId: fixture.mission.id,
    },
  });
  await prisma.option.deleteMany({
    where: {
      question: {
        missionId: fixture.mission.id,
      },
    },
  });
  await prisma.question.deleteMany({
    where: {
      missionId: fixture.mission.id,
    },
  });
  await prisma.mission.delete({
    where: {
      id: fixture.mission.id,
    },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [
          fixture.user.id,
          fixture.otherUser.id,
          fixture.userWithoutAttempts.id,
        ],
      },
    },
  });
  await prisma.$disconnect();
});

test("authenticated user receives their own learner performance", async () => {
  const response = await getLearningProfile(generateToken(fixture.user.id));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    totalQuestionsAttempted: 11,
    totalCorrect: 6,
    totalIncorrect: 5,
    overallAccuracy: 55,
    concepts: [
      {
        concept: "async-await",
        attempted: 1,
        correct: 0,
        incorrect: 1,
        accuracy: 0,
        classification: "weak",
      },
      {
        concept: "closures",
        attempted: 4,
        correct: 2,
        incorrect: 2,
        accuracy: 50,
        classification: "weak",
      },
      {
        concept: "promises",
        attempted: 2,
        correct: 1,
        incorrect: 1,
        accuracy: 50,
        classification: "weak",
      },
      {
        concept: "block-scope",
        attempted: 3,
        correct: 2,
        incorrect: 1,
        accuracy: 67,
        classification: "developing",
      },
      {
        concept: "event-loop",
        attempted: 1,
        correct: 1,
        incorrect: 0,
        accuracy: 100,
        classification: "strong",
      },
    ],
  });
});

test("another user's attempts are excluded", async () => {
  const response = await getLearningProfile(generateToken(fixture.user.id));
  const body = await response.json();

  assert.equal(body.totalQuestionsAttempted, 11);
  assert.equal(body.totalCorrect, 6);
  assert.equal(body.concepts[0].concept, "async-await");
  assert.equal(body.concepts[0].correct, 0);
});

test("returns correct and incorrect learner totals", async () => {
  const response = await getLearningProfile(generateToken(fixture.user.id));
  const body = await response.json();

  assert.equal(body.totalCorrect, 6);
  assert.equal(body.totalIncorrect, 5);
});

test("calculates rounded concept and overall accuracy", async () => {
  const response = await getLearningProfile(generateToken(fixture.user.id));
  const body = await response.json();
  const blockScope = body.concepts.find(
    ({ concept }: { concept: string }) => concept === "block-scope",
  );

  assert.equal(body.overallAccuracy, 55);
  assert.equal(blockScope.accuracy, 67);
  assert.equal(blockScope.classification, "developing");
});

test("unanswered questions are excluded", async () => {
  const response = await getLearningProfile(generateToken(fixture.user.id));
  const body = await response.json();

  assert.equal(body.totalQuestionsAttempted, 11);
});

test("historical attempts contribute to the learner profile", async () => {
  const response = await getLearningProfile(generateToken(fixture.user.id));
  const body = await response.json();
  const promises = body.concepts.find(
    ({ concept }: { concept: string }) => concept === "promises",
  );

  assert.equal(promises.attempted, 2);
});

test("answered questions from abandoned attempts remain learning evidence", async () => {
  const response = await getLearningProfile(generateToken(fixture.user.id));
  const body = await response.json();
  const blockScope = body.concepts.find(
    ({ concept }: { concept: string }) => concept === "block-scope",
  );

  assert.equal(blockScope.attempted, 3);
  assert.equal(blockScope.correct, 2);
  assert.equal(blockScope.incorrect, 1);
});

test("sorts concepts from weakest to strongest", async () => {
  const response = await getLearningProfile(generateToken(fixture.user.id));
  const body = await response.json();

  assert.deepEqual(
    body.concepts.map(({ concept }: { concept: string }) => concept),
    ["async-await", "closures", "promises", "block-scope", "event-loop"],
  );
});

test("breaks equal-accuracy ties using highest attempted count", async () => {
  const response = await getLearningProfile(generateToken(fixture.user.id));
  const body = await response.json();
  const conceptNames = body.concepts.map(
    ({ concept }: { concept: string }) => concept,
  );

  assert.ok(conceptNames.indexOf("closures") < conceptNames.indexOf("promises"));
});

test("user with no attempts receives an empty summary", async () => {
  const response = await getLearningProfile(
    generateToken(fixture.userWithoutAttempts.id),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    totalQuestionsAttempted: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    overallAccuracy: 0,
    concepts: [],
  });
});

test("requires authentication", async () => {
  const response = await getLearningProfile();

  assert.equal(response.status, 401);
});
