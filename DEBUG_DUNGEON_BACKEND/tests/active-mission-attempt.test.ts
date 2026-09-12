import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import { after, test } from "node:test";
import { Prisma } from "../src/generated/prisma/client.js";
import prisma from "../src/lib/prisma.js";
import {
  restartMissionForUser,
  startMissionForUser,
} from "../src/services/mission.service.js";

type Fixture = Awaited<ReturnType<typeof createFixture>>;

const createFixture = async () => {
  const user = await prisma.user.create({
    data: {
      email: `${randomUUID()}@example.com`,
      passwordHash: "test-password-hash",
    },
  });
  const mission = await prisma.mission.create({
    data: {
      title: "Active attempt test mission",
      topic: "Testing",
      difficulty: "EASY",
      missionNumber: randomInt(100_000_000, 2_000_000_000),
    },
  });

  return { user, mission };
};

const cleanupFixture = async (fixture: Fixture) => {
  await prisma.questionAttempt.deleteMany({
    where: {
      missionAttempt: {
        missionProgress: {
          userId: fixture.user.id,
          missionId: fixture.mission.id,
        },
      },
    },
  });
  await prisma.missionAttempt.deleteMany({
    where: {
      missionProgress: {
        userId: fixture.user.id,
        missionId: fixture.mission.id,
      },
    },
  });
  await prisma.missionProgress.deleteMany({
    where: {
      userId: fixture.user.id,
      missionId: fixture.mission.id,
    },
  });
  await prisma.mission.delete({ where: { id: fixture.mission.id } });
  await prisma.user.delete({ where: { id: fixture.user.id } });
};

const withFixture = async (
  operation: (fixture: Fixture) => Promise<void>,
) => {
  const fixture = await createFixture();

  try {
    await operation(fixture);
  } finally {
    await cleanupFixture(fixture);
  }
};

after(async () => {
  await prisma.$disconnect();
});

test("starting a mission creates one active attempt", async () => {
  await withFixture(async ({ user, mission }) => {
    const result = await startMissionForUser(user.id, mission.id);
    const activeCount = await prisma.missionAttempt.count({
      where: {
        missionProgress: {
          userId: user.id,
          missionId: mission.id,
        },
        status: "IN_PROGRESS",
      },
    });

    assert.ok(result);
    assert.equal(result.resumed, false);
    assert.equal(activeCount, 1);
  });
});

test("starting the same mission resumes its active attempt", async () => {
  await withFixture(async ({ user, mission }) => {
    const first = await startMissionForUser(user.id, mission.id);
    const second = await startMissionForUser(user.id, mission.id);

    assert.ok(first);
    assert.ok(second);
    assert.equal(second.resumed, true);
    assert.equal(second.missionAttemptId, first.missionAttemptId);
  });
});

test("multiple completed attempts are allowed", async () => {
  await withFixture(async ({ user, mission }) => {
    const progress = await prisma.missionProgress.create({
      data: { userId: user.id, missionId: mission.id },
    });

    await prisma.missionAttempt.createMany({
      data: [
        { missionProgressId: progress.id, status: "COMPLETED" },
        { missionProgressId: progress.id, status: "COMPLETED" },
      ],
    });

    assert.equal(
      await prisma.missionAttempt.count({
        where: { missionProgressId: progress.id, status: "COMPLETED" },
      }),
      2,
    );
  });
});

test("a completed attempt does not prevent a new active attempt", async () => {
  await withFixture(async ({ user, mission }) => {
    const progress = await prisma.missionProgress.create({
      data: { userId: user.id, missionId: mission.id },
    });
    await prisma.missionAttempt.create({
      data: { missionProgressId: progress.id, status: "COMPLETED" },
    });

    const result = await startMissionForUser(user.id, mission.id);

    assert.ok(result);
    assert.equal(result.resumed, false);
  });
});

test("an abandoned attempt does not prevent a new active attempt", async () => {
  await withFixture(async ({ user, mission }) => {
    const progress = await prisma.missionProgress.create({
      data: { userId: user.id, missionId: mission.id },
    });
    await prisma.missionAttempt.create({
      data: { missionProgressId: progress.id, status: "ABANDONED" },
    });

    const result = await startMissionForUser(user.id, mission.id);

    assert.ok(result);
    assert.equal(result.resumed, false);
  });
});

test("concurrent starts converge on one active attempt", async () => {
  await withFixture(async ({ user, mission }) => {
    const [first, second] = await Promise.all([
      startMissionForUser(user.id, mission.id),
      startMissionForUser(user.id, mission.id),
    ]);
    const activeAttempts = await prisma.missionAttempt.findMany({
      where: {
        missionProgress: {
          userId: user.id,
          missionId: mission.id,
        },
        status: "IN_PROGRESS",
      },
    });

    assert.ok(first);
    assert.ok(second);
    assert.equal(activeAttempts.length, 1);
    assert.equal(first.missionAttemptId, activeAttempts[0]?.id);
    assert.equal(second.missionAttemptId, activeAttempts[0]?.id);
  });
});

test("the database rejects a second active attempt", async () => {
  await withFixture(async ({ user, mission }) => {
    const progress = await prisma.missionProgress.create({
      data: { userId: user.id, missionId: mission.id },
    });
    await prisma.missionAttempt.create({
      data: { missionProgressId: progress.id },
    });

    await assert.rejects(
      prisma.missionAttempt.create({
        data: { missionProgressId: progress.id },
      }),
      (error: unknown) =>
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002",
    );
  });
});

test("restart preserves the old attempt and creates one new active attempt", async () => {
  await withFixture(async ({ user, mission }) => {
    const original = await startMissionForUser(user.id, mission.id);
    const restarted = await restartMissionForUser(user.id, mission.id);

    assert.ok(original);
    assert.ok(restarted);
    assert.notEqual(restarted.missionAttemptId, original.missionAttemptId);

    const attempts = await prisma.missionAttempt.findMany({
      where: {
        missionProgress: {
          userId: user.id,
          missionId: mission.id,
        },
      },
      orderBy: { startedAt: "asc" },
    });

    assert.equal(attempts.length, 2);
    assert.equal(
      attempts.filter(({ status }) => status === "IN_PROGRESS").length,
      1,
    );
    assert.equal(
      attempts.filter(({ status }) => status === "ABANDONED").length,
      1,
    );
  });
});
