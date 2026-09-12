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
  const [user, otherUser] = await Promise.all([
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

  const mission = await prisma.mission.create({
    data: {
      title: "Progress test mission",
      topic: "JavaScript",
      difficulty: "MEDIUM",
      missionNumber: randomInt(100_000_000, 2_000_000_000),
      questions: {
        create: [
          {
            text: "Block scope question one",
            concept: "block-scope",
            explanation: "Block scope explanation one",
            xpReward: 10,
            options: {
              create: [
                { text: "Correct one", isCorrect: true, displayOrder: 1 },
                { text: "Wrong one", isCorrect: false, displayOrder: 2 },
              ],
            },
          },
          {
            text: "Block scope question two",
            concept: "block-scope",
            explanation: "Block scope explanation two",
            xpReward: 20,
            options: {
              create: [
                { text: "Correct two", isCorrect: true, displayOrder: 1 },
                { text: "Wrong two", isCorrect: false, displayOrder: 2 },
              ],
            },
          },
          {
            text: "Strict equality question",
            concept: "strict-equality",
            explanation: "Strict equality explanation",
            xpReward: 30,
            options: {
              create: [
                { text: "Correct three", isCorrect: true, displayOrder: 1 },
                { text: "Wrong three", isCorrect: false, displayOrder: 2 },
              ],
            },
          },
        ],
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

  const noProgressMission = await prisma.mission.create({
    data: {
      title: "No progress mission",
      topic: "Testing",
      difficulty: "EASY",
      missionNumber: randomInt(100_000_000, 2_000_000_000),
    },
  });

  const completedAt = new Date("2026-01-02T00:00:00.000Z");
  const progress = await prisma.missionProgress.create({
    data: {
      userId: user.id,
      missionId: mission.id,
      bestScore: 67,
      completedAt,
    },
  });
  const otherProgress = await prisma.missionProgress.create({
    data: {
      userId: otherUser.id,
      missionId: mission.id,
      bestScore: 0,
      completedAt,
    },
  });

  const firstAttempt = await prisma.missionAttempt.create({
    data: {
      missionProgressId: progress.id,
      status: "COMPLETED",
      score: 33,
      xpEarned: 10,
      startedAt: new Date("2026-01-01T00:00:00.000Z"),
      completedAt: new Date("2026-01-01T00:10:00.000Z"),
    },
  });
  const secondAttempt = await prisma.missionAttempt.create({
    data: {
      missionProgressId: progress.id,
      status: "COMPLETED",
      score: 67,
      xpEarned: 40,
      startedAt: new Date("2026-01-02T00:00:00.000Z"),
      completedAt,
    },
  });
  const otherAttempt = await prisma.missionAttempt.create({
    data: {
      missionProgressId: otherProgress.id,
      status: "COMPLETED",
      score: 0,
      xpEarned: 0,
      startedAt: new Date("2026-01-03T00:00:00.000Z"),
      completedAt: new Date("2026-01-03T00:10:00.000Z"),
    },
  });

  const [firstQuestion, secondQuestion, thirdQuestion] = mission.questions;

  if (!firstQuestion || !secondQuestion || !thirdQuestion) {
    throw new Error("Progress test mission questions were not created");
  }

  const option = (question: typeof firstQuestion, isCorrect: boolean) => {
    const selected = question.options.find(
      (candidate) => candidate.isCorrect === isCorrect,
    );

    if (!selected) {
      throw new Error("Progress test option was not created");
    }

    return selected;
  };

  await prisma.questionAttempt.createMany({
    data: [
      {
        missionAttemptId: firstAttempt.id,
        questionId: firstQuestion.id,
        selectedOptionId: option(firstQuestion, true).id,
        isCorrect: true,
      },
      {
        missionAttemptId: firstAttempt.id,
        questionId: secondQuestion.id,
        selectedOptionId: option(secondQuestion, false).id,
        isCorrect: false,
      },
      {
        missionAttemptId: firstAttempt.id,
        questionId: thirdQuestion.id,
        selectedOptionId: option(thirdQuestion, false).id,
        isCorrect: false,
      },
      {
        missionAttemptId: secondAttempt.id,
        questionId: firstQuestion.id,
        selectedOptionId: option(firstQuestion, true).id,
        isCorrect: true,
      },
      {
        missionAttemptId: secondAttempt.id,
        questionId: thirdQuestion.id,
        selectedOptionId: option(thirdQuestion, true).id,
        isCorrect: true,
      },
      {
        missionAttemptId: otherAttempt.id,
        questionId: firstQuestion.id,
        selectedOptionId: option(firstQuestion, false).id,
        isCorrect: false,
      },
      {
        missionAttemptId: otherAttempt.id,
        questionId: secondQuestion.id,
        selectedOptionId: option(secondQuestion, false).id,
        isCorrect: false,
      },
    ],
  });

  return {
    user,
    otherUser,
    mission,
    noProgressMission,
    progress,
    firstAttempt,
    secondAttempt,
    otherAttempt,
  };
};

const get = (path: string, token?: string) => {
  return fetch(`${baseUrl}${path}`, {
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

  const missionIds = [fixture.mission.id, fixture.noProgressMission.id];

  await prisma.questionAttempt.deleteMany({
    where: { question: { missionId: { in: missionIds } } },
  });
  await prisma.missionAttempt.deleteMany({
    where: { missionProgress: { missionId: { in: missionIds } } },
  });
  await prisma.missionProgress.deleteMany({
    where: { missionId: { in: missionIds } },
  });
  await prisma.option.deleteMany({
    where: { question: { missionId: { in: missionIds } } },
  });
  await prisma.question.deleteMany({
    where: { missionId: { in: missionIds } },
  });
  await prisma.mission.deleteMany({ where: { id: { in: missionIds } } });
  await prisma.user.deleteMany({
    where: { id: { in: [fixture.user.id, fixture.otherUser.id] } },
  });
  await prisma.$disconnect();
});

test("returns mission information and the user's ordered attempt history", async () => {
  const response = await get(
    `/missions/${fixture.mission.id}/progress`,
    generateToken(fixture.user.id),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.missionId, fixture.mission.id);
  assert.equal(body.title, fixture.mission.title);
  assert.equal(body.topic, fixture.mission.topic);
  assert.equal(body.difficulty, fixture.mission.difficulty);
  assert.equal(body.missionNumber, fixture.mission.missionNumber);
  assert.equal(body.bestScore, 67);
  assert.equal(body.completedAt, "2026-01-02T00:00:00.000Z");
  assert.deepEqual(
    body.attempts.map(({ id }: { id: string }) => id),
    [fixture.firstAttempt.id, fixture.secondAttempt.id],
  );
  assert.deepEqual(Object.keys(body.attempts[0]).sort(), [
    "completedAt",
    "id",
    "score",
    "startedAt",
    "status",
    "xpEarned",
  ]);
});

test("never returns another user's attempts", async () => {
  const response = await get(
    `/missions/${fixture.mission.id}/progress`,
    generateToken(fixture.user.id),
  );
  const body = await response.json();

  assert.equal(
    body.attempts.some(
      ({ id }: { id: string }) => id === fixture.otherAttempt.id,
    ),
    false,
  );
});

test("returns 404 when the user has no mission progress", async () => {
  const response = await get(
    `/missions/${fixture.noProgressMission.id}/progress`,
    generateToken(fixture.user.id),
  );

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    message: "Mission progress not found",
  });
});

test("returns 404 for a nonexistent mission", async () => {
  const response = await get(
    "/missions/cjld2cjxh0000qzrmn831i7rn/progress",
    generateToken(fixture.user.id),
  );

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { message: "Mission not found" });
});

test("requires authentication for mission progress", async () => {
  const response = await get(`/missions/${fixture.mission.id}/progress`);

  assert.equal(response.status, 401);
});

test("aggregates persisted attempts by question concept", async () => {
  const response = await get(
    `/missions/${fixture.mission.id}/performance`,
    generateToken(fixture.user.id),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    missionId: fixture.mission.id,
    concepts: [
      {
        concept: "block-scope",
        attempted: 3,
        correct: 2,
        accuracy: 67,
      },
      {
        concept: "strict-equality",
        attempted: 2,
        correct: 1,
        accuracy: 50,
      },
    ],
  });
});

test("unanswered questions are excluded from attempted concept counts", async () => {
  const response = await get(
    `/missions/${fixture.mission.id}/performance`,
    generateToken(fixture.user.id),
  );
  const body = await response.json();
  const blockScope = body.concepts.find(
    ({ concept }: { concept: string }) => concept === "block-scope",
  );

  assert.equal(blockScope.attempted, 3);
});

test("performance includes multiple attempts but excludes another user", async () => {
  const response = await get(
    `/missions/${fixture.mission.id}/performance`,
    generateToken(fixture.otherUser.id),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    missionId: fixture.mission.id,
    concepts: [
      {
        concept: "block-scope",
        attempted: 2,
        correct: 0,
        accuracy: 0,
      },
    ],
  });
});

test("returns 404 when performance progress does not exist", async () => {
  const response = await get(
    `/missions/${fixture.noProgressMission.id}/performance`,
    generateToken(fixture.user.id),
  );

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), {
    message: "Mission progress not found",
  });
});

test("returns 404 for a nonexistent mission performance request", async () => {
  const response = await get(
    "/missions/cjld2cjxh0000qzrmn831i7rn/performance",
    generateToken(fixture.user.id),
  );

  assert.equal(response.status, 404);
  assert.deepEqual(await response.json(), { message: "Mission not found" });
});

test("requires authentication for mission performance", async () => {
  const response = await get(`/missions/${fixture.mission.id}/performance`);

  assert.equal(response.status, 401);
});
