import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import express from "express";
import {
  InvalidGeneratedMissionError,
  MalformedMissionGenerationResponseError,
  generateMission,
} from "../src/agents/mission-generator.agent.js";
import {
  AiProviderTimeoutError,
  AiProviderUnavailableError,
  type AiProvider,
  type StructuredGenerationRequest,
} from "../src/ai/ai-provider.js";
import { errorHandler } from "../src/middleware/error.middleware.js";
import prisma from "../src/lib/prisma.js";
import { createMissionGenerationRouter } from "../src/routes/mission-generation.routes.js";
import type { GeneratedMission } from "../src/types/mission-schema.js";
import { generateToken } from "../src/utils/jwt.js";

const input = {
  topic: "JavaScript closures",
  difficulty: "MEDIUM" as const,
  questionCount: 1,
};

const createValidMission = (questionCount = 1): GeneratedMission => ({
  title: "Closure Debugging",
  topic: input.topic,
  difficulty: input.difficulty,
  questions: Array.from({ length: questionCount }, (_, questionIndex) => ({
    text: `Why does closure example ${questionIndex + 1} print this value?`,
    concept: "closures",
    explanation: "The function retains access to its lexical environment.",
    xpReward: 10,
    options: [
      { text: "Lexical scope", isCorrect: true, displayOrder: 1 },
      { text: "Dynamic scope", isCorrect: false, displayOrder: 2 },
      { text: "Type coercion", isCorrect: false, displayOrder: 3 },
      { text: "Event bubbling", isCorrect: false, displayOrder: 4 },
    ],
  })),
});

const jsonProvider = (output: unknown): AiProvider => ({
  generateStructured: async () =>
    typeof output === "string" ? output : JSON.stringify(output),
});

const failingProvider = (error: Error): AiProvider => ({
  generateStructured: async () => {
    throw error;
  },
});

const expectInvalidMission = async (mission: unknown) => {
  await assert.rejects(
    generateMission(input, jsonProvider(mission)),
    InvalidGeneratedMissionError,
  );
};

test("provider success returns a validated generated mission", async () => {
  const mission = createValidMission();

  assert.deepEqual(await generateMission(input, jsonProvider(mission)), mission);
});

test("passes structured request data and the generator prompt to the provider", async () => {
  let capturedRequest: StructuredGenerationRequest | undefined;
  const provider: AiProvider = {
    generateStructured: async (request) => {
      capturedRequest = request;
      return JSON.stringify(createValidMission());
    },
  };

  await generateMission(input, provider);

  assert.deepEqual(capturedRequest?.input, input);
  assert.equal(capturedRequest?.schemaName, "debug_dungeon_mission");
  assert.equal("$schema" in (capturedRequest?.jsonSchema ?? {}), false);
  assert.equal(capturedRequest?.jsonSchema.additionalProperties, false);
  assert.match(capturedRequest?.systemPrompt ?? "", /debugging-focused/i);
  assert.match(capturedRequest?.systemPrompt ?? "", /exactly four options/i);
});

test("rejects the wrong generated question count", async () => {
  await expectInvalidMission(createValidMission(2));
});

test("rejects a generated question missing its concept", async () => {
  const mission = createValidMission();
  const question = mission.questions[0];

  if (!question) {
    throw new Error("Generator test question missing");
  }

  const { concept: _concept, ...withoutConcept } = question;
  await expectInvalidMission({ ...mission, questions: [withoutConcept] });
});

test("rejects a generated question missing its explanation", async () => {
  const mission = createValidMission();
  const question = mission.questions[0];

  if (!question) {
    throw new Error("Generator test question missing");
  }

  const { explanation: _explanation, ...withoutExplanation } = question;
  await expectInvalidMission({ ...mission, questions: [withoutExplanation] });
});

test("rejects empty generated question text or explanation", async () => {
  const mission = createValidMission();
  const question = mission.questions[0];

  if (!question) {
    throw new Error("Generator test question missing");
  }

  await expectInvalidMission({
    ...mission,
    questions: [{ ...question, text: "   " }],
  });
  await expectInvalidMission({
    ...mission,
    questions: [{ ...question, explanation: "   " }],
  });
});

test("rejects the wrong number of generated options", async () => {
  const mission = createValidMission();
  const question = mission.questions[0];

  if (!question) {
    throw new Error("Generator test question missing");
  }

  await expectInvalidMission({
    ...mission,
    questions: [{ ...question, options: question.options.slice(0, 3) }],
  });
});

test("rejects a question with zero correct options", async () => {
  const mission = createValidMission();
  const question = mission.questions[0];

  if (!question) {
    throw new Error("Generator test question missing");
  }

  await expectInvalidMission({
    ...mission,
    questions: [
      {
        ...question,
        options: question.options.map((option) => ({
          ...option,
          isCorrect: false,
        })),
      },
    ],
  });
});

test("rejects a question with multiple correct options", async () => {
  const mission = createValidMission();
  const question = mission.questions[0];

  if (!question) {
    throw new Error("Generator test question missing");
  }

  await expectInvalidMission({
    ...mission,
    questions: [
      {
        ...question,
        options: question.options.map((option, index) => ({
          ...option,
          isCorrect: index < 2,
        })),
      },
    ],
  });
});

test("rejects empty option text", async () => {
  const mission = createValidMission();
  const question = mission.questions[0];

  if (!question || !question.options[0]) {
    throw new Error("Generator test option missing");
  }

  const options = question.options.map((option, index) =>
    index === 0 ? { ...option, text: "   " } : option,
  );
  await expectInvalidMission({
    ...mission,
    questions: [{ ...question, options }],
  });
});

test("rejects duplicate option displayOrder values", async () => {
  const mission = createValidMission();
  const question = mission.questions[0];

  if (!question) {
    throw new Error("Generator test question missing");
  }

  const options = question.options.map((option, index) =>
    index === 1 ? { ...option, displayOrder: 1 } : option,
  );
  await expectInvalidMission({
    ...mission,
    questions: [{ ...question, options }],
  });
});

test("rejects an out-of-range option displayOrder", async () => {
  const mission = createValidMission();
  const question = mission.questions[0];

  if (!question) {
    throw new Error("Generator test question missing");
  }

  const options = question.options.map((option, index) =>
    index === 3 ? { ...option, displayOrder: 5 } : option,
  );
  await expectInvalidMission({
    ...mission,
    questions: [{ ...question, options }],
  });
});

test("rejects an invalid XP reward", async () => {
  const mission = createValidMission();
  const question = mission.questions[0];

  if (!question) {
    throw new Error("Generator test question missing");
  }

  await expectInvalidMission({
    ...mission,
    questions: [{ ...question, xpReward: 0 }],
  });
});

test("rejects generated topic or difficulty that differs from the request", async () => {
  await expectInvalidMission({ ...createValidMission(), topic: "Promises" });
  await expectInvalidMission({ ...createValidMission(), difficulty: "HARD" });
});

test("rejects arbitrary AI fields and database identifiers", async () => {
  await expectInvalidMission({
    ...createValidMission(),
    missionNumber: 99,
  });
});

test("distinguishes malformed JSON from structural validation failure", async () => {
  await assert.rejects(
    generateMission(input, jsonProvider("not-json")),
    MalformedMissionGenerationResponseError,
  );
});

test("propagates provider unavailability", async () => {
  await assert.rejects(
    generateMission(input, failingProvider(new AiProviderUnavailableError())),
    AiProviderUnavailableError,
  );
});

test("propagates provider timeout", async () => {
  await assert.rejects(
    generateMission(input, failingProvider(new AiProviderTimeoutError())),
    AiProviderTimeoutError,
  );
});

let endpointProvider: AiProvider;
let server: ReturnType<typeof express.application.listen>;
let baseUrl: string;
let generationAdminId: string;

before(async () => {
  const generationAdmin = await prisma.user.create({
    data: {
      email: `${randomUUID()}@example.com`,
      passwordHash: "test-password-hash",
      role: "ADMIN",
    },
  });
  generationAdminId = generationAdmin.id;

  endpointProvider = jsonProvider(createValidMission());
  const endpointApp = express();
  const providerProxy: AiProvider = {
    generateStructured: (request) =>
      endpointProvider.generateStructured(request),
  };

  endpointApp.use(express.json());
  endpointApp.use(
    "/missions",
    createMissionGenerationRouter(providerProxy),
  );
  endpointApp.use(errorHandler);

  server = endpointApp.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
  await prisma.user.delete({ where: { id: generationAdminId } });
  await prisma.$disconnect();
});

const postGenerate = (body: unknown, authenticated = true) => {
  return fetch(`${baseUrl}/missions/generate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(authenticated
        ? { authorization: `Bearer ${generateToken(generationAdminId)}` }
        : {}),
    },
    body: JSON.stringify(body),
  });
};

for (const [name, body] of [
  ["missing topic", { difficulty: "MEDIUM", questionCount: 1 }],
  ["empty topic", { ...input, topic: "   " }],
  ["invalid difficulty", { ...input, difficulty: "EXTREME" }],
  ["question count below minimum", { ...input, questionCount: 0 }],
  ["question count above maximum", { ...input, questionCount: 11 }],
  ["non-integer question count", { ...input, questionCount: 1.5 }],
] as const) {
  test(`rejects ${name}`, async () => {
    const response = await postGenerate(body);

    assert.equal(response.status, 400);
  });
}

test("authenticated endpoint returns a generated mission", async () => {
  const mission = createValidMission();
  endpointProvider = jsonProvider(mission);

  const response = await postGenerate(input);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), mission);
});

test("generation endpoint requires authentication", async () => {
  const response = await postGenerate(input, false);

  assert.equal(response.status, 401);
});

test("generation endpoint reports provider failure", async () => {
  endpointProvider = failingProvider(new AiProviderUnavailableError());

  const response = await postGenerate(input);

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    message: "AI provider unavailable",
  });
});

test("generation endpoint reports provider timeout", async () => {
  endpointProvider = failingProvider(new AiProviderTimeoutError());

  const response = await postGenerate(input);

  assert.equal(response.status, 504);
  assert.deepEqual(await response.json(), {
    message: "AI provider timed out",
  });
});

test("generation endpoint reports malformed AI output", async () => {
  endpointProvider = jsonProvider("not-json");

  const response = await postGenerate(input);

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    message: "AI provider returned malformed data",
  });
});

test("generation endpoint reports structurally invalid AI output", async () => {
  endpointProvider = jsonProvider(createValidMission(2));

  const response = await postGenerate(input);

  assert.equal(response.status, 502);
  assert.deepEqual(await response.json(), {
    message: "Generated mission failed validation",
  });
});
