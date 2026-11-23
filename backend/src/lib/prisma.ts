import { PrismaClient } from '@prisma/client';

// Un único cliente por proceso. La URL viene de DATABASE_URL (ver config.ts).
export const prisma = new PrismaClient();
