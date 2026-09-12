import prisma from "../src/lib/prisma";
import bcrypt from "bcrypt";

const seedDevelopmentAdmin = async () => {
  const email = process.env.DEV_ADMIN_EMAIL;
  const password = process.env.DEV_ADMIN_PASSWORD;

  if (!email && !password) {
    console.log(
      "Development Admin skipped. Set DEV_ADMIN_EMAIL and DEV_ADMIN_PASSWORD to create one.",
    );
    return;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Development Admin seeding is disabled in production");
  }

  if (!email || !password) {
    throw new Error(
      "Both DEV_ADMIN_EMAIL and DEV_ADMIN_PASSWORD are required",
    );
  }

  if (password.length < 8) {
    throw new Error("DEV_ADMIN_PASSWORD must contain at least 8 characters");
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash,
      role: "ADMIN",
    },
    create: {
      email,
      passwordHash,
      role: "ADMIN",
    },
  });

  console.log("Development Admin ready:", admin.email);
};

async function main() {
  const mission = await prisma.mission.upsert({
    where: { missionNumber: 1 },
    update: {},
    create: {
      title: "JavaScript Basics",
      topic: "JavaScript",
      difficulty: "EASY",
      missionNumber: 1,

      questions: {
        create: [
          {
            text: "Which keyword creates a block-scoped variable?",
            concept: "block-scope",
            explanation:
              "Both let and const are block-scoped, but let is used for variables that may be reassigned.",
            xpReward: 10,

            options: {
              create: [
                {
                  text: "var",
                  isCorrect: false,
                  displayOrder: 1,
                },
                {
                  text: "let",
                  isCorrect: true,
                  displayOrder: 2,
                },
                {
                  text: "function",
                  isCorrect: false,
                  displayOrder: 3,
                },
                {
                  text: "static",
                  isCorrect: false,
                  displayOrder: 4,
                },
              ],
            },
          },

          {
            text: "What does === compare in JavaScript?",
            concept: "strict-equality",
            explanation:
              "The strict equality operator compares values without performing type coercion.",
            xpReward: 10,

            options: {
              create: [
                {
                  text: "Only values",
                  isCorrect: false,
                  displayOrder: 1,
                },
                {
                  text: "Only types",
                  isCorrect: false,
                  displayOrder: 2,
                },
                {
                  text: "Values and types",
                  isCorrect: true,
                  displayOrder: 3,
                },
                {
                  text: "Object references only",
                  isCorrect: false,
                  displayOrder: 4,
                },
              ],
            },
          },
        ],
      },
    },
    include: {
      questions: {
        include: {
          options: true,
        },
      },
    },
  });

  console.log("Mission created:", mission.title);

  await seedDevelopmentAdmin();
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
