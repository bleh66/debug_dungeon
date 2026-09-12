import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import express from "express";
import jwt from "jsonwebtoken";
import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";
import { errorHandler } from "../src/middleware/error.middleware.js";
import { generateToken } from "../src/utils/jwt.js";

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
const userIds: string[] = [];
const missionIds: string[] = [];

before(async () => {
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
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
});

test("registration, login, and profile return only safe user fields", async () => {
  const email = `${randomUUID()}@example.com`;
  const password = "password123";
  const registerResponse = await fetch(`${baseUrl}/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(registerResponse.status, 201);
  const registered = (await registerResponse.json()) as {
    id: string;
    email: string;
    role: string;
    createdAt: string;
    passwordHash?: string;
  };
  userIds.push(registered.id);
  assert.equal(registered.role, "PLAYER");
  assert.equal(registered.passwordHash, undefined);

  const loginResponse = await fetch(`${baseUrl}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(loginResponse.status, 200);
  const loginBody = (await loginResponse.json()) as {
    token: string;
    user: { passwordHash?: string };
  };
  assert.equal(loginBody.user.passwordHash, undefined);
  const payload = jwt.decode(loginBody.token) as Record<string, unknown>;
  assert.equal(payload.userId, registered.id);
  assert.equal(payload.role, undefined);
  assert.equal(payload.email, undefined);

  const profileResponse = await fetch(`${baseUrl}/auth/profile`, {
    headers: { authorization: `Bearer ${loginBody.token}` },
  });
  assert.equal(profileResponse.status, 200);
  const profile = (await profileResponse.json()) as {
    user: { passwordHash?: string };
  };
  assert.equal(profile.user.passwordHash, undefined);
});

test("concurrent duplicate registration returns conflict instead of 500", async () => {
  const email = `${randomUUID()}@example.com`;
  const request = () =>
    fetch(`${baseUrl}/auth/register`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password: "password123" }),
    });
  const responses = await Promise.all([request(), request()]);
  const statuses = responses.map(({ status }) => status).sort();

  assert.deepEqual(statuses, [201, 409]);
  const user = await prisma.user.findUniqueOrThrow({ where: { email } });
  userIds.push(user.id);
});

test("JWT with no userId is rejected", async () => {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET is required for the API audit test");
  }

  const token = jwt.sign({ role: "ADMIN" }, secret);
  const response = await fetch(`${baseUrl}/auth/profile`, {
    headers: { authorization: `Bearer ${token}` },
  });

  assert.equal(response.status, 401);
});

test("malformed Bearer header is rejected", async () => {
  const response = await fetch(`${baseUrl}/auth/profile`, {
    headers: {
      authorization: `Bearer ${generateToken("test-user")} unexpected`,
    },
  });

  assert.equal(response.status, 401);
});

test("protected gameplay authenticates before reporting validation details", async () => {
  const response = await fetch(`${baseUrl}/missions/not-a-cuid/start`, {
    method: "POST",
  });

  assert.equal(response.status, 401);
});

test("mission start does not expose correctness or explanations", async () => {
  const maximum = await prisma.mission.aggregate({
    _max: { missionNumber: true },
  });
  const [user, mission] = await Promise.all([
    prisma.user.create({
      data: {
        email: `${randomUUID()}@example.com`,
        passwordHash: "test-password-hash",
      },
    }),
    prisma.mission.create({
      data: {
        title: "Safe gameplay response",
        topic: "Security",
        difficulty: "EASY",
        missionNumber: (maximum._max.missionNumber ?? 0) + 1,
        questions: {
          create: {
            text: "Which option is correct?",
            concept: "response-safety",
            explanation: "This explanation reveals the answer.",
            xpReward: 10,
            options: {
              create: [
                { text: "Correct", isCorrect: true, displayOrder: 1 },
                { text: "Incorrect", isCorrect: false, displayOrder: 2 },
              ],
            },
          },
        },
      },
    }),
  ]);
  userIds.push(user.id);
  missionIds.push(mission.id);

  const response = await fetch(`${baseUrl}/missions/${mission.id}/start`, {
    method: "POST",
    headers: { authorization: `Bearer ${generateToken(user.id)}` },
  });
  assert.equal(response.status, 201);
  const body = (await response.json()) as {
    mission: {
      questions: Array<{
        explanation?: string;
        options: Array<{ isCorrect?: boolean }>;
      }>;
    };
  };

  assert.equal(body.mission.questions[0]?.explanation, undefined);
  assert.ok(
    body.mission.questions[0]?.options.every(
      (option) => option.isCorrect === undefined,
    ),
  );
});

test("global error responses do not expose internal error messages", async () => {
  const testApp = express();
  testApp.get("/error", () => {
    throw new Error("sensitive database detail");
  });
  testApp.use(errorHandler);
  const testServer = testApp.listen(0);

  try {
    await new Promise<void>((resolve) =>
      testServer.once("listening", resolve),
    );
    const { port } = testServer.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}/error`);

    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      message: "Internal Server Error",
    });
  } finally {
    await new Promise<void>((resolve, reject) => {
      testServer.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
