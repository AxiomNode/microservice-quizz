import { PrismaClient } from "@prisma/client";

/** @module client — Shared Prisma database client singleton. */

/** Global PrismaClient instance used across the quiz microservice. */
export const prisma = new PrismaClient();
