import prisma from "../lib/prisma.js";
import bcrypt from "bcrypt";
import { Prisma } from "../generated/prisma/client.js";

type SafeUser = {
  id: string;
  email: string;
  role: "PLAYER" | "ADMIN";
};

const safeUserSelect = {
  id: true,
  email: true,
  role: true,
} as const;

export const registerUser = async (email: string, password: string) => {
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: "PLAYER",
      },
      select: {
        ...safeUserSelect,
        createdAt: true,
      },
    });

    return { ok: true as const, user };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { ok: false as const, code: "EMAIL_EXISTS" as const };
    }

    throw error;
  }
};

export const authenticateUser = async (
  email: string,
  password: string,
): Promise<SafeUser | null> => {
  const user = await prisma.user.findUnique({
    where: {
      email,
    },
    select: {
      ...safeUserSelect,
      passwordHash: true,
    },
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return null;
  }

  const { passwordHash: _passwordHash, ...safeUser } = user;

  return safeUser;
};

export const findUserProfile = async (id: string) => {
  return prisma.user.findUnique({
    where: { id },
    select: safeUserSelect,
  });
};
