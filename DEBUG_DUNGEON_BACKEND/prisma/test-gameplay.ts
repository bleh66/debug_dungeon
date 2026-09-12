import prisma from "../src/lib/prisma";
import { restartMissionForUser } from "../src/services/mission.service";

async function main() {
  // 1. Get or create a test user
  const user = await prisma.user.upsert({
    where: {
      email: "test1@example.com",
    },
    update: {},
    create: {
      email: "test1@example.com",
      passwordHash: "temporary-test-password",
    },
  });

  console.log("Test user:", user.id);

  // 2. Get the mission we just seeded
  const mission = await prisma.mission.findFirst({
    include: {
      questions: {
        include: {
          options: true,
        },
      },
    },
  });

  if (!mission) {
    throw new Error("No mission found. Run the seed script first.");
  }

  // 3. Abandon any existing active playthrough and start a fresh one
  const missionAttempt = await restartMissionForUser(user.id, mission.id);

  if (!missionAttempt) {
    throw new Error("Mission not found while starting a playthrough.");
  }

  console.log("Mission attempt created:", missionAttempt.missionAttemptId);

  // 4. Pick the first question
  const question = mission.questions[0];

  if (!question) {
    throw new Error("Mission has no questions.");
  }

  // 5. Pick one of its options
  const selectedOption = question.options[0];

  if (!selectedOption) {
    throw new Error("Question has no options.");
  }

  // 6. Submit the answer
  const attempt = await prisma.questionAttempt.create({
    data: {
      missionAttemptId: missionAttempt.missionAttemptId,
      questionId: question.id,
      selectedOptionId: selectedOption.id,
      isCorrect: selectedOption.isCorrect,
    },
  });

  console.log("Question attempt created:", attempt);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
