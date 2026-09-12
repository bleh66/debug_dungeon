import prisma from "../lib/prisma.js";

export const findUserRoleById = async (userId: string) => {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
};
