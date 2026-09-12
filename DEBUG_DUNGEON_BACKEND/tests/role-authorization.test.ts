import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import express from "express";
import type { AiProvider } from "../src/ai/ai-provider.js";
import authRoutes from "../src/routes/auth.routes.js";
import { createMissionGenerationRouter } from "../src/routes/mission-generation.routes.js";
import { errorHandler } from "../src/middleware/error.middleware.js";
import prisma from "../src/lib/prisma.js";
import { generateToken } from "../src/utils/jwt.js";

const generatedMission = {
  title: "Role-protected mission",
  topic: "JavaScript closures",
  difficulty: "MEDIUM",
  questions: [
    {
      text: "What value does this closure retain?",
      concept: "closures",
      explanation: "A closure retains access to its lexical environment.",
      xpReward: 10,
      options: [
        { text: "The lexical value", isCorrect: true, displayOrder: 1 },
        { text: "A random value", isCorrect: false, displayOrder: 2 },
        { text: "Always undefined", isCorrect: false, displayOrder: 3 },
        { text: "The global value", isCorrect: false, displayOrder: 4 },
      ],
    },
  ],
};

const provider: AiProvider = {
  generateStructured: async () => JSON.stringify(generatedMission),
};

const generationInput = {
  topic: "JavaScript closures",
  difficulty: "MEDIUM",
  questionCount: 1,
};

let server: ReturnType<typeof express.application.listen>;
let baseUrl: string;
let playerId: string;
let adminId: string;
const registeredEmails: string[] = [];

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

  const testApp = express();
  testApp.use(express.json());
  testApp.use("/auth", authRoutes);
  testApp.use("/missions", createMissionGenerationRouter(provider));
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
  await prisma.user.deleteMany({
    where: {
      OR: [
        { id: { in: [playerId, adminId] } },
        { email: { in: registeredEmails } },
      ],
    },
  });
  await prisma.$disconnect();
});

const generateRequest = (
  token?: string,
  body: Record<string, unknown> = generationInput,
  extraHeaders: Record<string, string> = {},
) =>
  fetch(`${baseUrl}/missions/generate`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  });

test("unauthenticated AI request returns 401", async () => {
  const response = await generateRequest();

  assert.equal(response.status, 401);
});

test("invalid JWT returns 401", async () => {
  const response = await generateRequest("not-a-valid-jwt");

  assert.equal(response.status, 401);
});

test("PLAYER cannot access mission generation", async () => {
  const response = await generateRequest(generateToken(playerId));

  assert.equal(response.status, 403);
});

test("ADMIN can access mission generation", async () => {
  const response = await generateRequest(generateToken(adminId));

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), generatedMission);
});

test("a JWT for a deleted user returns 401", async () => {
  const deletedUser = await prisma.user.create({
    data: {
      email: `${randomUUID()}@example.com`,
      passwordHash: "test-password-hash",
      role: "ADMIN",
    },
  });
  const token = generateToken(deletedUser.id);
  await prisma.user.delete({ where: { id: deletedUser.id } });

  const response = await generateRequest(token);

  assert.equal(response.status, 401);
});

test("authorization reads the current role from the database", async () => {
  const user = await prisma.user.create({
    data: {
      email: `${randomUUID()}@example.com`,
      passwordHash: "test-password-hash",
    },
  });
  const token = generateToken(user.id);

  const playerResponse = await generateRequest(token);
  assert.equal(playerResponse.status, 403);

  await prisma.user.update({
    where: { id: user.id },
    data: { role: "ADMIN" },
  });

  const adminResponse = await generateRequest(token);
  assert.equal(adminResponse.status, 200);

  await prisma.user.delete({ where: { id: user.id } });
});

test("request data and headers cannot override a PLAYER role", async () => {
  const response = await generateRequest(
    generateToken(playerId),
    { ...generationInput, role: "ADMIN" },
    { "x-user-role": "ADMIN" },
  );

  assert.equal(response.status, 403);
});

test("normal registration creates a PLAYER", async () => {
  const email = `${randomUUID()}@example.com`;
  registeredEmails.push(email);

  const response = await fetch(`${baseUrl}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "password123" }),
  });

  assert.equal(response.status, 201);
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  assert.equal(user.role, "PLAYER");
});

test("registration cannot create an ADMIN from submitted role data", async () => {
  const email = `${randomUUID()}@example.com`;
  registeredEmails.push(email);

  const response = await fetch(`${baseUrl}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email,
      password: "password123",
      role: "ADMIN",
    }),
  });

  assert.equal(response.status, 201);
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  assert.equal(user.role, "PLAYER");
});
