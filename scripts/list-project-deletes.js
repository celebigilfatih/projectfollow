const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  try {
    const logs = await prisma.activityLog.findMany({
      where: { action: "ProjectDelete" },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, projectId: true, action: true, createdAt: true },
    });
    if (logs.length === 0) {
      console.log("No ProjectDelete logs");
    } else {
      for (const l of logs) {
        console.log(`${l.createdAt.toISOString()} | ${l.action} | projectId=${l.projectId}`);
      }
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
})();

