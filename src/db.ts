import "dotenv/config";
import { createRequire } from "module";
import { PrismaPg } from '@prisma/adapter-pg';

// Prisma generates CJS files, but this project is ESM ("type": "module").
// We must use createRequire to safely import the CJS Prisma client.
const require = createRequire(import.meta.url);
const { PrismaClient } = require('./generated/prisma/index.js');

const connectionString = `${process.env.DATABASE_URL}`;

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

export { prisma };