import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import app from "../src/app.js";
import prisma from "../src/lib/prisma.js";
import { generateToken } from "../src/utils/jwt.js";

let server: ReturnType<typeof app.listen>;
let baseUrl: string;
let missionId: string;

before(async () => {
  const mission = await prisma.mission.create({
    data: {
      title: "Mission fetch test",
      topic: "TypeScript",
      difficulty: "EASY",
      missionNumber: randomInt(100_000_000, 2_000_000_000),
      questions: {
        create: {
          text: "What does a type annotation describe?",
          concept: "types",
          explanation: "It describes the expected shape or value type.",
          xpReward: 10,
          options: {
            create: [
              { text: "A value type", isCorrect: true, displayOrder: 1 },
              { text: "A network route", isCorrect: false, displayOrder: 2 },
            ],
          },
        },
      },
    },
    select: { id: true },
  });
  missionId = mission.id;
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  if (!server || !missionId) return;
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  await prisma.questionAttempt.deleteMany({ where: { question: { missionId } } });
  await prisma.missionAttempt.deleteMany({ where: { missionProgress: { missionId } } });
  await prisma.missionProgress.deleteMany({ where: { missionId } });
  await prisma.option.deleteMany({ where: { question: { missionId } } });
  await prisma.question.deleteMany({ where: { missionId } });
  await prisma.mission.delete({ where: { id: missionId } });
});

test("authenticated user fetches a mission without option correctness", async () => {
  const user = await prisma.user.create({ data: { email: `${randomUUID()}@example.com`, passwordHash: "test" } });
  const response = await fetch(`${baseUrl}/missions/${missionId}`, { headers: { authorization: `Bearer ${generateToken(user.id)}` } });
  assert.equal(response.status, 200);
  const body = await response.json() as { id: string; questions: Array<{ options: Array<Record<string, unknown>> }> };
  assert.equal(body.id, missionId);
  assert.equal(body.questions.length, 1);
  assert.equal(body.questions[0].options.length, 2);
  assert.equal("isCorrect" in body.questions[0].options[0], false);
  assert.equal("explanation" in body.questions[0], false);
  await prisma.user.delete({ where: { id: user.id } });
});

test("mission fetch returns 404 for an unknown mission", async () => {
  const user = await prisma.user.create({ data: { email: `${randomUUID()}@example.com`, passwordHash: "test" } });
  const response = await fetch(`${baseUrl}/missions/cjld2cjxh0000qzrmn831i7rn`, { headers: { authorization: `Bearer ${generateToken(user.id)}` } });
  assert.equal(response.status, 404);
  await prisma.user.delete({ where: { id: user.id } });
});

test("mission fetch requires authentication", async () => {
  const response = await fetch(`${baseUrl}/missions/${missionId}`);
  assert.equal(response.status, 401);
});