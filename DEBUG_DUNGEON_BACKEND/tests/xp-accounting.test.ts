import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import { after, test } from "node:test";
import {
  completeMissionAttempt,
  restartMissionForUser,
} from "../src/services/mission.service.js";
import prisma from "../src/lib/prisma.js";

const userIds: string[] = [];
const missionIds: string[] = [];

const createUser = async (xp = 0) => {
  const user = await prisma.user.create({
    data: {
      email: `${randomUUID()}@example.com`,
      passwordHash: "test-password-hash",
      xp,
    },
  });

  userIds.push(user.id);
  return user;
};

const createMission = async (xpRewards: number[]) => {
  const mission = await prisma.mission.create({
    data: {
      title: `XP test mission ${randomUUID()}`,
      topic: "XP accounting",
      difficulty: "MEDIUM",
      missionNumber: randomInt(100_000_000, 2_000_000_000),
      questions: {
        create: xpRewards.map((xpReward, index) => ({
          text: `XP question ${index + 1}`,
          explanation: `XP explanation ${index + 1}`,
          concept: `xp-concept-${index + 1}`,
          xpReward,
          options: {
            create: [
              {
                text: "Correct",
                isCorrect: true,
                displayOrder: 1,
              },
              {
                text: "Incorrect",
                isCorrect: false,
                displayOrder: 2,
              },
            ],
          },
        })),
      },
    },
    include: {
      questions: {
        orderBy: {
          text: "asc",
        },
        include: {
          options: true,
        },
      },
    },
  });

  missionIds.push(mission.id);
  return mission;
};

type XpMission = Awaited<ReturnType<typeof createMission>>;

const createProgress = async (
  userId: string,
  missionId: string,
  bestScore: number | null = null,
) => {
  return prisma.missionProgress.create({
    data: {
      userId,
      missionId,
      bestScore,
    },
  });
};

const createHistoricalAttempt = async (
  missionProgressId: string,
  xpEarned: number,
  status: "COMPLETED" | "ABANDONED" = "COMPLETED",
  score = 0,
) => {
  return prisma.missionAttempt.create({
    data: {
      missionProgressId,
      status,
      score,
      xpEarned,
      completedAt: new Date(),
    },
  });
};

const createActiveAttempt = async (
  missionProgressId: string,
  mission: XpMission,
  answers: Array<"correct" | "incorrect" | "unanswered">,
) => {
  const attempt = await prisma.missionAttempt.create({
    data: {
      missionProgressId,
    },
  });

  const questionAttempts = answers.flatMap((answer, index) => {
    if (answer === "unanswered") {
      return [];
    }

    const question = mission.questions[index];

    if (!question) {
      throw new Error("XP test question was not created");
    }

    const selectedOption = question.options.find(
      (option) => option.isCorrect === (answer === "correct"),
    );

    if (!selectedOption) {
      throw new Error("XP test option was not created");
    }

    return [
      {
        missionAttemptId: attempt.id,
        questionId: question.id,
        selectedOptionId: selectedOption.id,
        isCorrect: answer === "correct",
      },
    ];
  });

  if (questionAttempts.length > 0) {
    await prisma.questionAttempt.createMany({
      data: questionAttempts,
    });
  }

  return attempt;
};

const complete = (userId: string, missionId: string, attemptId: string) => {
  return completeMissionAttempt({ userId, missionId, attemptId });
};

const getUserXp = async (userId: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { xp: true },
  });

  return user.xp;
};

after(async () => {
  await prisma.questionAttempt.deleteMany({
    where: {
      missionAttempt: {
        missionProgress: {
          userId: { in: userIds },
        },
      },
    },
  });
  await prisma.missionAttempt.deleteMany({
    where: {
      missionProgress: {
        userId: { in: userIds },
      },
    },
  });
  await prisma.missionProgress.deleteMany({
    where: { userId: { in: userIds } },
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
    where: { id: { in: userIds } },
  });
  await prisma.$disconnect();
});

test("first completed attempt awards its calculated XP", async () => {
  const user = await createUser();
  const mission = await createMission([40]);
  const progress = await createProgress(user.id, mission.id);
  const attempt = await createActiveAttempt(progress.id, mission, ["correct"]);

  const result = await complete(user.id, mission.id, attempt.id);

  assert.equal(result.ok && result.completion.xpEarned, 40);
  assert.equal(await getUserXp(user.id), 40);
});

test("lower-XP retry does not increase total XP", async () => {
  const user = await createUser(40);
  const mission = await createMission([30, 10]);
  const progress = await createProgress(user.id, mission.id);
  await createHistoricalAttempt(progress.id, 40);
  const attempt = await createActiveAttempt(progress.id, mission, [
    "correct",
    "unanswered",
  ]);

  await complete(user.id, mission.id, attempt.id);

  assert.equal(await getUserXp(user.id), 40);
});

test("higher-XP retry awards only the improvement", async () => {
  const user = await createUser(40);
  const mission = await createMission([50]);
  const progress = await createProgress(user.id, mission.id);
  await createHistoricalAttempt(progress.id, 40);
  const attempt = await createActiveAttempt(progress.id, mission, ["correct"]);

  await complete(user.id, mission.id, attempt.id);

  assert.equal(await getUserXp(user.id), 50);
});

test("multiple attempts use the maximum XP rather than their sum", async () => {
  const user = await createUser(40);
  const mission = await createMission([35, 5]);
  const progress = await createProgress(user.id, mission.id);
  await createHistoricalAttempt(progress.id, 30);
  await createHistoricalAttempt(progress.id, 40);
  await createHistoricalAttempt(progress.id, 35);
  const attempt = await createActiveAttempt(progress.id, mission, [
    "correct",
    "unanswered",
  ]);

  await complete(user.id, mission.id, attempt.id);

  assert.equal(await getUserXp(user.id), 40);
});

test("a later XP improvement replaces the mission maximum", async () => {
  const user = await createUser(40);
  const mission = await createMission([50]);
  const progress = await createProgress(user.id, mission.id);
  await createHistoricalAttempt(progress.id, 30);
  await createHistoricalAttempt(progress.id, 40);
  await createHistoricalAttempt(progress.id, 35);
  const attempt = await createActiveAttempt(progress.id, mission, ["correct"]);

  await complete(user.id, mission.id, attempt.id);

  assert.equal(await getUserXp(user.id), 50);
});

test("incorrect answers do not contribute to attempt XP", async () => {
  const user = await createUser();
  const mission = await createMission([10, 30]);
  const progress = await createProgress(user.id, mission.id);
  const attempt = await createActiveAttempt(progress.id, mission, [
    "correct",
    "incorrect",
  ]);

  const result = await complete(user.id, mission.id, attempt.id);

  assert.equal(result.ok && result.completion.xpEarned, 10);
  assert.equal(await getUserXp(user.id), 10);
});

test("an unanswered mission produces zero XP", async () => {
  const user = await createUser();
  const mission = await createMission([40]);
  const progress = await createProgress(user.id, mission.id);
  const attempt = await createActiveAttempt(progress.id, mission, [
    "unanswered",
  ]);

  const result = await complete(user.id, mission.id, attempt.id);

  assert.equal(result.ok && result.completion.xpEarned, 0);
  assert.equal(await getUserXp(user.id), 0);
});

test("completing the same attempt twice awards XP once", async () => {
  const user = await createUser();
  const mission = await createMission([40]);
  const progress = await createProgress(user.id, mission.id);
  const attempt = await createActiveAttempt(progress.id, mission, ["correct"]);

  const first = await complete(user.id, mission.id, attempt.id);
  const second = await complete(user.id, mission.id, attempt.id);

  assert.equal(first.ok, true);
  assert.deepEqual(second, {
    ok: false,
    code: "ATTEMPT_NOT_IN_PROGRESS",
  });
  assert.equal(await getUserXp(user.id), 40);
});

test("concurrent completion requests award XP once", async () => {
  const user = await createUser();
  const mission = await createMission([40]);
  const progress = await createProgress(user.id, mission.id);
  const attempt = await createActiveAttempt(progress.id, mission, ["correct"]);

  const results = await Promise.all([
    complete(user.id, mission.id, attempt.id),
    complete(user.id, mission.id, attempt.id),
  ]);

  assert.equal(results.filter((result) => result.ok).length, 1);
  assert.equal(await getUserXp(user.id), 40);
});

test("abandoned attempts never contribute XP", async () => {
  const user = await createUser();
  const mission = await createMission([40]);
  const progress = await createProgress(user.id, mission.id);
  await createHistoricalAttempt(progress.id, 100, "ABANDONED");
  const attempt = await createActiveAttempt(progress.id, mission, ["correct"]);

  await complete(user.id, mission.id, attempt.id);

  assert.equal(await getUserXp(user.id), 40);
});

test("restarting a mission does not award XP", async () => {
  const user = await createUser(25);
  const mission = await createMission([40]);
  const progress = await createProgress(user.id, mission.id);
  const attempt = await createActiveAttempt(progress.id, mission, ["correct"]);

  const result = await restartMissionForUser(user.id, mission.id);
  const abandoned = await prisma.missionAttempt.findUniqueOrThrow({
    where: { id: attempt.id },
    select: { status: true },
  });

  assert.equal(result?.resumed, false);
  assert.equal(abandoned.status, "ABANDONED");
  assert.equal(await getUserXp(user.id), 25);
});

test("different missions accumulate their maximum XP independently", async () => {
  const user = await createUser();
  const firstMission = await createMission([40]);
  const secondMission = await createMission([60]);
  const firstProgress = await createProgress(user.id, firstMission.id);
  const secondProgress = await createProgress(user.id, secondMission.id);
  const firstAttempt = await createActiveAttempt(
    firstProgress.id,
    firstMission,
    ["correct"],
  );
  const secondAttempt = await createActiveAttempt(
    secondProgress.id,
    secondMission,
    ["correct"],
  );

  await complete(user.id, firstMission.id, firstAttempt.id);
  await complete(user.id, secondMission.id, secondAttempt.id);

  assert.equal(await getUserXp(user.id), 100);
});

test("lower score with higher XP still raises only the XP maximum", async () => {
  const user = await createUser(30);
  const mission = await createMission([50, 10, 10, 10]);
  const progress = await createProgress(user.id, mission.id, 75);
  await createHistoricalAttempt(progress.id, 30, "COMPLETED", 75);
  const attempt = await createActiveAttempt(progress.id, mission, [
    "correct",
    "incorrect",
    "incorrect",
    "incorrect",
  ]);

  const result = await complete(user.id, mission.id, attempt.id);
  const updatedProgress = await prisma.missionProgress.findUniqueOrThrow({
    where: { id: progress.id },
    select: { bestScore: true },
  });

  assert.equal(result.ok && result.completion.score, 25);
  assert.equal(result.ok && result.completion.xpEarned, 50);
  assert.equal(updatedProgress.bestScore, 75);
  assert.equal(await getUserXp(user.id), 50);
});
