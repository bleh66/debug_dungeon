import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";
import { generateToken } from "../src/utils/jwt.js";

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
let fixture: Awaited<ReturnType<typeof createFixture>>;

const createMission = (
  missionNumber: number,
  concept: string,
  questionCount: number,
  label: string,
) => {
  return prisma.mission.create({
    data: {
      title: `Recommendation ${label} ${randomUUID()}`,
      topic: "JavaScript",
      difficulty: "MEDIUM",
      missionNumber,
      questions: {
        create: Array.from({ length: questionCount }, (_, index) => ({
          text: `${label} question ${index + 1}`,
          concept,
          explanation: `${label} explanation ${index + 1}`,
          xpReward: 10,
          options: {
            create: [
              { text: "Correct", isCorrect: true, displayOrder: 1 },
              { text: "Incorrect A", isCorrect: false, displayOrder: 2 },
              { text: "Incorrect B", isCorrect: false, displayOrder: 3 },
              { text: "Incorrect C", isCorrect: false, displayOrder: 4 },
            ],
          },
        })),
      },
    },
    include: {
      questions: {
        orderBy: { text: "asc" },
        include: { options: true },
      },
    },
  });
};

const addEvidence = async (
  userId: string,
  mission: Awaited<ReturnType<typeof createMission>>,
  answers: boolean[],
  completedProgress = false,
) => {
  const progress = await prisma.missionProgress.create({
    data: {
      userId,
      missionId: mission.id,
      completedAt: completedProgress ? new Date() : null,
    },
  });
  const attempt = await prisma.missionAttempt.create({
    data: {
      missionProgressId: progress.id,
      status: completedProgress ? "COMPLETED" : "ABANDONED",
      completedAt: new Date(),
    },
  });

  await prisma.questionAttempt.createMany({
    data: answers.map((isCorrect, index) => {
      const question = mission.questions[index];
      const option = question?.options.find(
        (candidate) => candidate.isCorrect === isCorrect,
      );

      if (!question || !option) {
        throw new Error("Recommendation test evidence is incomplete");
      }

      return {
        missionAttemptId: attempt.id,
        questionId: question.id,
        selectedOptionId: option.id,
        isCorrect,
      };
    }),
  });
};

const createFixture = async () => {
  const [player, admin, strongLearner, noMissionLearner, noAttemptsLearner] =
    await Promise.all(
      ["PLAYER", "ADMIN", "PLAYER", "PLAYER", "PLAYER"].map(
        (role) =>
          prisma.user.create({
            data: {
              email: `${randomUUID()}@example.com`,
              passwordHash: "test-password-hash",
              role: role as "PLAYER" | "ADMIN",
            },
          }),
      ),
    );
  const maximum = await prisma.mission.aggregate({
    _max: { missionNumber: true },
  });
  const firstMissionNumber = (maximum._max.missionNumber ?? 0) + 1;
  const [completedMission, weakMission, developingMission, strongMission, rareMission] =
    await Promise.all([
      createMission(firstMissionNumber, "closures", 1, "completed"),
      createMission(firstMissionNumber + 1, "closures", 3, "weak"),
      createMission(firstMissionNumber + 2, "promises", 3, "developing"),
      createMission(firstMissionNumber + 3, "event-loop", 4, "strong"),
      createMission(firstMissionNumber + 4, "rare-concept", 1, "rare"),
    ]);

  await Promise.all([
    addEvidence(player.id, weakMission, [true, false, false]),
    addEvidence(player.id, developingMission, [true, true, false]),
    addEvidence(player.id, strongMission, [true, true, true, true]),
    prisma.missionProgress.create({
      data: {
        userId: player.id,
        missionId: completedMission.id,
        completedAt: new Date(),
      },
    }),
    addEvidence(admin.id, weakMission, [false, false, true]),
    addEvidence(strongLearner.id, strongMission, [true, true, true, true]),
    addEvidence(noMissionLearner.id, rareMission, [false], true),
  ]);

  return {
    users: {
      player,
      admin,
      strongLearner,
      noMissionLearner,
      noAttemptsLearner,
    },
    missions: {
      completedMission,
      weakMission,
      developingMission,
      strongMission,
      rareMission,
    },
  };
};

const getRecommendations = (token?: string) =>
  fetch(`${baseUrl}/users/me/recommendations`, {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });

const mutableCounts = async () => {
  const [progress, attempts, questionAttempts, users, missions, questions, options] =
    await Promise.all([
      prisma.missionProgress.count(),
      prisma.missionAttempt.count(),
      prisma.questionAttempt.count(),
      prisma.user.count(),
      prisma.mission.count(),
      prisma.question.count(),
      prisma.option.count(),
    ]);

  return { progress, attempts, questionAttempts, users, missions, questions, options };
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
  const missionIds = Object.values(fixture.missions).map((mission) => mission.id);

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
  await prisma.mission.deleteMany({
    where: { id: { in: missionIds } },
  });
  await prisma.user.deleteMany({
    where: {
      id: {
        in: Object.values(fixture.users).map((user) => user.id),
      },
    },
  });
  await prisma.$disconnect();
});

test("authenticated PLAYER receives recommendations", async () => {
  const response = await getRecommendations(
    generateToken(fixture.users.player.id),
  );

  assert.equal(response.status, 200);
});

test("authenticated ADMIN receives recommendations", async () => {
  const response = await getRecommendations(
    generateToken(fixture.users.admin.id),
  );

  assert.equal(response.status, 200);
});

test("recommendations require authentication", async () => {
  const response = await getRecommendations();

  assert.equal(response.status, 401);
});

test("weak concepts receive HIGH priority", async () => {
  const response = await getRecommendations(
    generateToken(fixture.users.player.id),
  );
  const body = await response.json();
  const closures = body.recommendations.find(
    ({ concept }: { concept: string }) => concept === "closures",
  );

  assert.equal(closures.accuracy, 33);
  assert.equal(closures.classification, "weak");
  assert.equal(closures.priority, "HIGH");
  assert.equal(body.nextFocus.concept, "closures");
});

test("developing concepts receive MEDIUM priority", async () => {
  const response = await getRecommendations(
    generateToken(fixture.users.player.id),
  );
  const body = await response.json();
  const promises = body.recommendations.find(
    ({ concept }: { concept: string }) => concept === "promises",
  );

  assert.equal(promises.accuracy, 67);
  assert.equal(promises.classification, "developing");
  assert.equal(promises.priority, "MEDIUM");
});

test("strong learner has no urgent next focus", async () => {
  const response = await getRecommendations(
    generateToken(fixture.users.strongLearner.id),
  );
  const body = await response.json();

  assert.equal(body.nextFocus, null);
  assert.equal(body.recommendations[0].priority, "LOW");
  assert.equal(body.recommendations[0].classification, "strong");
});

test("recommendations are ordered HIGH, MEDIUM, then LOW", async () => {
  const response = await getRecommendations(
    generateToken(fixture.users.player.id),
  );
  const body = await response.json();

  assert.deepEqual(
    body.recommendations.map(
      ({ concept, priority }: { concept: string; priority: string }) => ({
        concept,
        priority,
      }),
    ),
    [
      { concept: "closures", priority: "HIGH" },
      { concept: "promises", priority: "MEDIUM" },
      { concept: "event-loop", priority: "LOW" },
    ],
  );
});

test("recommendation links to an actual matching uncompleted mission", async () => {
  const response = await getRecommendations(
    generateToken(fixture.users.player.id),
  );
  const body = await response.json();
  const closures = body.recommendations.find(
    ({ concept }: { concept: string }) => concept === "closures",
  );

  assert.equal(closures.mission.id, fixture.missions.weakMission.id);
  assert.notEqual(closures.mission.id, fixture.missions.completedMission.id);
  const exists = await prisma.mission.count({
    where: {
      id: closures.mission.id,
      questions: { some: { concept: "closures" } },
    },
  });
  assert.equal(exists, 1);
});

test("concept with no suitable uncompleted mission returns null mission", async () => {
  const response = await getRecommendations(
    generateToken(fixture.users.noMissionLearner.id),
  );
  const body = await response.json();

  assert.equal(body.nextFocus.concept, "rare-concept");
  assert.equal(body.nextFocus.priority, "HIGH");
  assert.equal(body.nextFocus.mission, null);
});

test("learner with no attempts receives no recommendations", async () => {
  const response = await getRecommendations(
    generateToken(fixture.users.noAttemptsLearner.id),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    totalQuestionsAttempted: 0,
    totalCorrect: 0,
    totalIncorrect: 0,
    overallAccuracy: 0,
    nextFocus: null,
    recommendations: [],
  });
});

test("recommendation retrieval does not mutate database state", async () => {
  const before = await mutableCounts();

  const response = await getRecommendations(
    generateToken(fixture.users.player.id),
  );
  assert.equal(response.status, 200);

  assert.deepEqual(await mutableCounts(), before);
});
