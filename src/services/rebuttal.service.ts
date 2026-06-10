import { prisma } from "@/lib/prisma";

export async function createRebuttal(data: {
  title: string;
  content: string;
  userId: string;
}) {
  return prisma.rebuttal.create({
    data,
  });
}

export async function getAllRebuttals() {
  return prisma.rebuttal.findMany({
    include: {
      user: true,
    },
  });
}