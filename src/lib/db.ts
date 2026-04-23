import { PrismaClient } from '@prisma/client'
import path from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Use explicit database path for reliability across environments
const dbPath = path.join(process.cwd(), 'prisma', 'agentbrowser.db')

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: `file:${dbPath}`,
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
