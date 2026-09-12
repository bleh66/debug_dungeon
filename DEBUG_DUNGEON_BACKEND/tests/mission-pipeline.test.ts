import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import express from "express";
import {
  AiProviderTimeoutError,
  AiProviderUnavailableError,
  type AiProvider,
} from "../src/ai/ai-provider.js";
import { errorHandler } from "../src/middleware/error.middleware.js";
import prisma from "../src/lib/prisma.js";
import { createMissionGenerationRouter } from "../src/routes/mission-generation.routes.js";
import {
  completeMissionAttempt,
  startMissionForUser,
  submitAnswerForAttempt,
} from "../src/services/mission.service.js";
import { generateValidateAndPublishMission } from "../src/services/mission-pipeline.service.js";
import { persistGeneratedMission } from "../src/services/mission-persistence.service.js";
import type { GeneratedMission } from "../src/types/mission-schema.js";
import { generateToken } from "../src/utils/jwt.js";

const runId = randomUUID();
const input = {
  topic: "JavaScript closures",
  difficulty: "MEDIUM" as const,
  questionCount: 1,
};

const createMission = (suffix: string): GeneratedMission => ({
  title: `Pipeline mission ${runId} ${suffix}`,
  topic: input.topic,
  difficulty: input.difficulty,
  questions: [
    {
      text: "Why can this callback still access the outer variable?",
      concept: "closures",
      explanation: "The callback retains access to its lexical environment.",
      xpReward: 10,
      options: [
        { text: "Lexical closure", isCorrect: true, displayOrder: 1 },
        { text: "Dynamic scope", isCorrect: false, displayOrder: 2 },
        { text: "Event bubbling", isCorrect: false, displayOrder: 3 },
        { text: "Automatic casting", isCorrect: false, displayOrder: 4 },
      ],
    },
  ],
});

const approvedValidation = { valid: true, issues: [] };
const rejectedValidation = {
  valid: false,
  issues: [
    {
      questionIndex: 0,
      type: "EXPLANATION",
      severity: "ERROR",
      message: "The explanation does not justify the marked answer",
    },
  ],
};

const serialize = (output: unknown) =>
  typeof output === "string" ? output : JSON.stringify(output);

const pipelineProvider = (
  generated: unknown,
  validation: unknown = approvedValidation,
): AiProvider => ({
  generateStructured: async (request) => {
    if (request.schemaName === "debug_dungeon_mission") {
      if (generated instanceof Error) {
        throw generated;
      }

      return serialize(generated);
    }

    if (validation instanceof Error) {
      throw validation;
    }

    return serialize(validation);
  },
});

const databaseCounts = async () => {
  const [missions, questions, options] = await Promise.all([
    prisma.mission.count(),
    prisma.question.count(),
    prisma.option.count(),
  ]);

  return { missions, questions, options };
};

const publishedMissionIds: string[] = [];
const createdUserIds: string[] = [];
let adminId: string;
let playerId: string;
let endpointProvider: AiProvider;
let server: ReturnType<typeof express.application.listen>;
let baseUrl: string;

before(async () => {
  const [admin, player] = await Promise.all([
    prisma.user.create({
      data: {
        email: `${randomUUID()}@example.com`,
        passwordHash: "test-password-hash",
        role: "ADMIN",
      },
    }),
    prisma.user.create({
      data: {
        email: `${randomUUID()}@example.com`,
        passwordHash: "test-password-hash",
      },
    }),
  ]);
  adminId = admin.id;
  playerId = player.id;
  createdUserIds.push(admin.id, player.id);
  endpointProvider = pipelineProvider(createMission("endpoint"));

  const testApp = express();
  const providerProxy: AiProvider = {
    generateStructured: (request) =>
      endpointProvider.generateStructured(request),
  };
  testApp.use(express.json());
  testApp.use("/missions", createMissionGenerationRouter(providerProxy));
  testApp.use(errorHandler);

  server = testApp.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  const progress = await prisma.missionProgress.findMany({
    where: { missionId: { in: publishedMissionIds } },
    select: {
      id: true,
      attempts: { select: { id: true } },
    },
  });
  const progressIds = progress.map((item) => item.id);
  const attemptIds = progress.flatMap((item) =>
    item.attempts.map((attempt) => attempt.id),
  );
  const questions = await prisma.question.findMany({
    where: { missionId: { in: publishedMissionIds } },
    select: { id: true },
  });
  const questionIds = questions.map((question) => question.id);

  await prisma.questionAttempt.deleteMany({
    where: { missionAttemptId: { in: attemptIds } },
  });
  await prisma.missionAttempt.deleteMany({
    where: { id: { in: attemptIds } },
  });
  await prisma.missionProgress.deleteMany({
    where: { id: { in: progressIds } },
  });
  await prisma.option.deleteMany({
    where: { questionId: { in: questionIds } },
  });
  await prisma.question.deleteMany({
    where: { id: { in: questionIds } },
  });
  await prisma.mission.deleteMany({
    where: { id: { in: publishedMissionIds } },
  });
  await prisma.user.deleteMany({
    where: { id: { in: createdUserIds } },
  });
  await prisma.$disconnect();
});

test("valid pipeline assigns the next mission number and persists relationships", async () => {
  const beforeMaximum = await prisma.mission.aggregate({
    _max: { missionNumber: true },
  });
  const generatedMission = createMission("successful");

  const result = await generateValidateAndPublishMission(
    input,
    pipelineProvider(generatedMission),
  );

  assert.equal(result.published, true);
  if (!result.published) {
    throw new Error("Expected mission publication");
  }
  publishedMissionIds.push(result.mission.id);
  assert.equal(
    result.mission.missionNumber,
    (beforeMaximum._max.missionNumber ?? 0) + 1,
  );
  assert.equal(result.mission.questionCount, 1);

  const persisted = await prisma.mission.findUniqueOrThrow({
    where: { id: result.mission.id },
    include: {
      questions: {
        include: { options: true },
      },
    },
  });
  assert.equal(persisted.questions.length, 1);
  assert.equal(persisted.questions[0]?.missionId, persisted.id);
  assert.equal(persisted.questions[0]?.options.length, 4);
  assert.ok(
    persisted.questions[0]?.options.every(
      (option) => option.questionId === persisted.questions[0]?.id,
    ),
  );
});

test("semantic rejection returns issues and persists nothing", async () => {
  const before = await databaseCounts();

  const result = await generateValidateAndPublishMission(
    input,
    pipelineProvider(createMission("rejected"), rejectedValidation),
  );

  assert.deepEqual(result, {
    published: false,
    validation: rejectedValidation,
  });
  assert.deepEqual(await databaseCounts(), before);
});

for (const [name, provider] of [
  [
    "generator failure",
    pipelineProvider(new AiProviderUnavailableError()),
  ],
  [
    "validator failure",
    pipelineProvider(
      createMission("validator-failure"),
      new AiProviderUnavailableError(),
    ),
  ],
  [
    "provider timeout",
    pipelineProvider(
      createMission("timeout"),
      new AiProviderTimeoutError(),
    ),
  ],
  ["malformed generator response", pipelineProvider("not-json")],
  [
    "malformed validator response",
    pipelineProvider(createMission("malformed-validator"), "not-json"),
  ],
] as const) {
  test(`${name} persists nothing`, async () => {
    const before = await databaseCounts();

    await assert.rejects(generateValidateAndPublishMission(input, provider));

    assert.deepEqual(await databaseCounts(), before);
  });
}

test("transaction failure rolls back Mission, Question, and Option writes", async () => {
  const invalidForDatabase: GeneratedMission = {
    ...createMission("rollback"),
    questions: [
      {
        ...createMission("rollback").questions[0]!,
        options: createMission("rollback").questions[0]!.options.map(
          (option, index) =>
            index === 1 ? { ...option, displayOrder: 1 } : option,
        ),
      },
    ],
  };
  const before = await databaseCounts();

  await assert.rejects(persistGeneratedMission(invalidForDatabase));

  assert.deepEqual(await databaseCounts(), before);
});

test("concurrent publications receive unique mission numbers", async () => {
  const results = await Promise.all([
    generateValidateAndPublishMission(
      input,
      pipelineProvider(createMission("concurrent-a")),
    ),
    generateValidateAndPublishMission(
      input,
      pipelineProvider(createMission("concurrent-b")),
    ),
  ]);
  const published = results.map((result) => {
    assert.equal(result.published, true);
    if (!result.published) {
      throw new Error("Expected concurrent mission publication");
    }
    publishedMissionIds.push(result.mission.id);
    return result.mission;
  });

  assert.equal(new Set(published.map((item) => item.missionNumber)).size, 2);
});

const publishRequest = (token?: string) =>
  fetch(`${baseUrl}/missions/generate-and-publish`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(input),
  });

test("generation-and-publish endpoint requires authentication", async () => {
  const before = await databaseCounts();
  const response = await publishRequest();

  assert.equal(response.status, 401);
  assert.deepEqual(await databaseCounts(), before);
});

test("generation-and-publish endpoint rejects PLAYER", async () => {
  const before = await databaseCounts();
  const response = await publishRequest(generateToken(playerId));

  assert.equal(response.status, 403);
  assert.deepEqual(await databaseCounts(), before);
});

test("generation-and-publish endpoint allows ADMIN", async () => {
  endpointProvider = pipelineProvider(createMission("admin-endpoint"));
  const response = await publishRequest(generateToken(adminId));

  assert.equal(response.status, 201);
  const body = (await response.json()) as {
    message: string;
    mission: { id: string; questionCount: number };
  };
  publishedMissionIds.push(body.mission.id);
  assert.equal(body.message, "Mission generated and published successfully");
  assert.equal(body.mission.questionCount, 1);
});

test("endpoint returns validation issues without persistence", async () => {
  endpointProvider = pipelineProvider(
    createMission("endpoint-rejected"),
    rejectedValidation,
  );
  const before = await databaseCounts();
  const response = await publishRequest(generateToken(adminId));

  assert.equal(response.status, 422);
  const body = (await response.json()) as {
    validation: typeof rejectedValidation;
  };
  assert.deepEqual(body.validation, rejectedValidation);
  assert.deepEqual(await databaseCounts(), before);
});

test("persisted generated mission works with gameplay", async () => {
  const result = await generateValidateAndPublishMission(
    input,
    pipelineProvider(createMission("gameplay")),
  );
  assert.equal(result.published, true);
  if (!result.published) {
    throw new Error("Expected gameplay mission publication");
  }
  publishedMissionIds.push(result.mission.id);

  const user = await prisma.user.create({
    data: {
      email: `${randomUUID()}@example.com`,
      passwordHash: "test-password-hash",
    },
  });
  createdUserIds.push(user.id);
  const started = await startMissionForUser(user.id, result.mission.id);
  assert.ok(started);

  const question = await prisma.question.findFirstOrThrow({
    where: { missionId: result.mission.id },
    include: {
      options: { where: { isCorrect: true } },
    },
  });
  const correctOption = question.options[0];
  assert.ok(correctOption);
  const answer = await submitAnswerForAttempt({
    userId: user.id,
    missionId: result.mission.id,
    attemptId: started.missionAttemptId,
    questionId: question.id,
    selectedOptionId: correctOption.id,
  });
  assert.equal(answer.ok, true);

  const completion = await completeMissionAttempt({
    userId: user.id,
    missionId: result.mission.id,
    attemptId: started.missionAttemptId,
  });
  assert.equal(completion.ok, true);
  if (completion.ok) {
    assert.equal(completion.completion.score, 100);
    assert.equal(completion.completion.xpEarned, 10);
  }
});
