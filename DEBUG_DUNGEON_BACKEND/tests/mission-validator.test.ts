import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import express from "express";
import { generateMission } from "../src/agents/mission-generator.agent.js";
import {
  InvalidMissionForValidationError,
  InvalidMissionValidationResponseError,
  MalformedMissionValidationResponseError,
  validateMission,
} from "../src/agents/mission-validator.agent.js";
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

const mission: GeneratedMission = {
  title: "Closure Debugging",
  topic: "JavaScript closures",
  difficulty: "MEDIUM",
  questions: [
    {
      text: "Why does the returned function still read count?",
      concept: "closures",
      explanation: "The returned function retains its lexical environment.",
      xpReward: 10,
      options: [
        { text: "Because of lexical closure", isCorrect: true, displayOrder: 1 },
        { text: "Because count is global", isCorrect: false, displayOrder: 2 },
        { text: "Because of event bubbling", isCorrect: false, displayOrder: 3 },
        { text: "Because count is static", isCorrect: false, displayOrder: 4 },
      ],
    },
  ],
};

const semanticResult = (
  issues: Array<{
    questionIndex: number | null;
    type:
      | "CORRECTNESS"
      | "EXPLANATION"
      | "CONCEPT"
      | "TOPIC"
      | "DIFFICULTY"
      | "AMBIGUITY"
      | "QUALITY"
      | "DUPLICATION";
    severity: "ERROR" | "WARNING";
    message: string;
  }> = [],
  valid = true,
) => ({ valid, issues });

const jsonProvider = (output: unknown): AiProvider => ({
  generateStructured: async () =>
    typeof output === "string" ? output : JSON.stringify(output),
});

const failingProvider = (error: Error): AiProvider => ({
  generateStructured: async () => {
    throw error;
  },
});

const expectDeterministicFailure = async (invalidMission: unknown) => {
  let calls = 0;
  const provider: AiProvider = {
    generateStructured: async () => {
      calls += 1;
      return JSON.stringify(semanticResult());
    },
  };

  await assert.rejects(
    validateMission(invalidMission, provider),
    InvalidMissionForValidationError,
  );
  assert.equal(calls, 0);
};

test("deterministically accepts a valid mission before AI validation", async () => {
  const result = await validateMission(mission, jsonProvider(semanticResult()));

  assert.deepEqual(result, semanticResult());
});

test("rejects a missing mission title without invoking AI", async () => {
  const { title: _title, ...invalidMission } = mission;
  await expectDeterministicFailure(invalidMission);
});

test("rejects a missing mission topic without invoking AI", async () => {
  const { topic: _topic, ...invalidMission } = mission;
  await expectDeterministicFailure(invalidMission);
});

test("rejects an invalid difficulty without invoking AI", async () => {
  await expectDeterministicFailure({ ...mission, difficulty: "EXTREME" });
});

test("rejects empty questions without invoking AI", async () => {
  await expectDeterministicFailure({ ...mission, questions: [] });
});

test("rejects an unreasonable question count without invoking AI", async () => {
  await expectDeterministicFailure({
    ...mission,
    questions: Array.from({ length: 11 }, () => mission.questions[0]),
  });
});

test("rejects missing question text without invoking AI", async () => {
  const { text: _text, ...question } = mission.questions[0]!;
  await expectDeterministicFailure({ ...mission, questions: [question] });
});

test("rejects missing concept without invoking AI", async () => {
  const { concept: _concept, ...question } = mission.questions[0]!;
  await expectDeterministicFailure({ ...mission, questions: [question] });
});

test("rejects missing explanation without invoking AI", async () => {
  const { explanation: _explanation, ...question } = mission.questions[0]!;
  await expectDeterministicFailure({ ...mission, questions: [question] });
});

test("rejects invalid XP without invoking AI", async () => {
  await expectDeterministicFailure({
    ...mission,
    questions: [{ ...mission.questions[0]!, xpReward: 0 }],
  });
});

test("rejects the wrong option count without invoking AI", async () => {
  await expectDeterministicFailure({
    ...mission,
    questions: [
      {
        ...mission.questions[0]!,
        options: mission.questions[0]!.options.slice(0, 3),
      },
    ],
  });
});

test("rejects zero correct options without invoking AI", async () => {
  await expectDeterministicFailure({
    ...mission,
    questions: [
      {
        ...mission.questions[0]!,
        options: mission.questions[0]!.options.map((option) => ({
          ...option,
          isCorrect: false,
        })),
      },
    ],
  });
});

test("rejects multiple correct options without invoking AI", async () => {
  await expectDeterministicFailure({
    ...mission,
    questions: [
      {
        ...mission.questions[0]!,
        options: mission.questions[0]!.options.map((option, index) => ({
          ...option,
          isCorrect: index < 2,
        })),
      },
    ],
  });
});

test("rejects invalid displayOrder without invoking AI", async () => {
  await expectDeterministicFailure({
    ...mission,
    questions: [
      {
        ...mission.questions[0]!,
        options: mission.questions[0]!.options.map((option, index) =>
          index === 3 ? { ...option, displayOrder: 5 } : option,
        ),
      },
    ],
  });
});

test("rejects duplicate displayOrder without invoking AI", async () => {
  await expectDeterministicFailure({
    ...mission,
    questions: [
      {
        ...mission.questions[0]!,
        options: mission.questions[0]!.options.map((option, index) =>
          index === 1 ? { ...option, displayOrder: 1 } : option,
        ),
      },
    ],
  });
});

test("passes the mission, strict schema, and validator prompt to the provider", async () => {
  let request: StructuredGenerationRequest | undefined;
  const provider: AiProvider = {
    generateStructured: async (providerRequest) => {
      request = providerRequest;
      return JSON.stringify(semanticResult());
    },
  };

  await validateMission(mission, provider);

  assert.deepEqual(request?.input, { mission });
  assert.equal(request?.schemaName, "debug_dungeon_mission_validation");
  assert.equal(request?.jsonSchema.additionalProperties, false);
  assert.match(request?.systemPrompt ?? "", /evaluate.*do not rewrite/i);
});

test("accepts a valid semantic result", async () => {
  assert.deepEqual(
    await validateMission(mission, jsonProvider(semanticResult())),
    semanticResult(),
  );
});

for (const [name, type] of [
  ["correctness", "CORRECTNESS"],
  ["explanation", "EXPLANATION"],
  ["ambiguity", "AMBIGUITY"],
] as const) {
  test(`AI ${name} errors make the mission invalid`, async () => {
    const issue = {
      questionIndex: 0,
      type,
      severity: "ERROR" as const,
      message: `A ${name} problem was found`,
    };

    const result = await validateMission(
      mission,
      jsonProvider(semanticResult([issue], true)),
    );

    assert.deepEqual(result, { valid: false, issues: [issue] });
  });
}

test("warnings remain valid even when AI.valid is false", async () => {
  const warning = {
    questionIndex: 0,
    type: "QUALITY" as const,
    severity: "WARNING" as const,
    message: "A distractor could be more plausible",
  };

  const result = await validateMission(
    mission,
    jsonProvider(semanticResult([warning], false)),
  );

  assert.deepEqual(result, { valid: true, issues: [warning] });
});

test("multiple AI errors are preserved and make the mission invalid", async () => {
  const issues = [
    {
      questionIndex: 0,
      type: "CORRECTNESS" as const,
      severity: "ERROR" as const,
      message: "The marked answer is incorrect",
    },
    {
      questionIndex: null,
      type: "DUPLICATION" as const,
      severity: "ERROR" as const,
      message: "Questions are substantially duplicated",
    },
  ];

  const result = await validateMission(
    mission,
    jsonProvider(semanticResult(issues, true)),
  );

  assert.deepEqual(result, { valid: false, issues });
});

test("rejects malformed validator JSON", async () => {
  await assert.rejects(
    validateMission(mission, jsonProvider("not-json")),
    MalformedMissionValidationResponseError,
  );
});

test("rejects structurally invalid validator output", async () => {
  await assert.rejects(
    validateMission(mission, jsonProvider({ valid: true })),
    InvalidMissionValidationResponseError,
  );
});

test("rejects validator issues that reference a nonexistent question", async () => {
  const invalidIssue = {
    questionIndex: 1,
    type: "QUALITY" as const,
    severity: "WARNING" as const,
    message: "Invalid question reference",
  };

  await assert.rejects(
    validateMission(
      mission,
      jsonProvider(semanticResult([invalidIssue])),
    ),
    InvalidMissionValidationResponseError,
  );
});

test("propagates provider unavailability", async () => {
  await assert.rejects(
    validateMission(mission, failingProvider(new AiProviderUnavailableError())),
    AiProviderUnavailableError,
  );
});

test("propagates provider timeout", async () => {
  await assert.rejects(
    validateMission(mission, failingProvider(new AiProviderTimeoutError())),
    AiProviderTimeoutError,
  );
});

test("generator output flows into a successful validator result", async () => {
  const generated = await generateMission(
    {
      topic: mission.topic,
      difficulty: mission.difficulty,
      questionCount: 1,
    },
    jsonProvider(mission),
  );

  const result = await validateMission(
    generated,
    jsonProvider(semanticResult()),
  );

  assert.deepEqual(result, semanticResult());
});

test("validator identifies a semantic flaw in generated output", async () => {
  const flawedMission: GeneratedMission = {
    ...mission,
    questions: [
      {
        ...mission.questions[0]!,
        explanation: "Closures erase their lexical environment immediately.",
      },
    ],
  };
  const generated = await generateMission(
    {
      topic: flawedMission.topic,
      difficulty: flawedMission.difficulty,
      questionCount: 1,
    },
    jsonProvider(flawedMission),
  );
  const issue = {
    questionIndex: 0,
    type: "EXPLANATION" as const,
    severity: "ERROR" as const,
    message: "The explanation incorrectly describes closure behavior",
  };

  const result = await validateMission(
    generated,
    jsonProvider(semanticResult([issue], true)),
  );

  assert.deepEqual(result, { valid: false, issues: [issue] });
});

let endpointProvider: AiProvider;
let server: ReturnType<typeof express.application.listen>;
let baseUrl: string;
let playerId: string;
let adminId: string;

before(async () => {
  const [player, admin] = await Promise.all([
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
        role: "ADMIN",
      },
    }),
  ]);
  playerId = player.id;
  adminId = admin.id;
  endpointProvider = jsonProvider(semanticResult());

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
  await prisma.user.deleteMany({ where: { id: { in: [playerId, adminId] } } });
  await prisma.$disconnect();
});

const postValidation = (token?: string, body: unknown = { mission }) =>
  fetch(`${baseUrl}/missions/validate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

test("validation endpoint rejects unauthenticated requests", async () => {
  const response = await postValidation();

  assert.equal(response.status, 401);
});

test("validation endpoint rejects PLAYER users", async () => {
  const response = await postValidation(generateToken(playerId));

  assert.equal(response.status, 403);
});

test("validation endpoint allows ADMIN users", async () => {
  endpointProvider = jsonProvider(semanticResult());
  const response = await postValidation(generateToken(adminId));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), semanticResult());
});

test("validation endpoint returns 400 before invoking AI for invalid missions", async () => {
  let calls = 0;
  endpointProvider = {
    generateStructured: async () => {
      calls += 1;
      return JSON.stringify(semanticResult());
    },
  };
  const response = await postValidation(generateToken(adminId), {
    mission: { ...mission, questions: [] },
  });

  assert.equal(response.status, 400);
  assert.equal(calls, 0);
});

test("validation endpoint maps malformed AI output to 502", async () => {
  endpointProvider = jsonProvider("not-json");
  const response = await postValidation(generateToken(adminId));

  assert.equal(response.status, 502);
});

test("validation endpoint maps provider failure to 503", async () => {
  endpointProvider = failingProvider(new AiProviderUnavailableError());
  const response = await postValidation(generateToken(adminId));

  assert.equal(response.status, 503);
});

test("validation endpoint maps provider timeout to 504", async () => {
  endpointProvider = failingProvider(new AiProviderTimeoutError());
  const response = await postValidation(generateToken(adminId));

  assert.equal(response.status, 504);
});
