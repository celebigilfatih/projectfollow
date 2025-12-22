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
    const projects = await prisma.project.findMany({ select: { id: true, title: true, status: true }, orderBy: { createdAt: "desc" } });
    if (projects.length === 0) {
      console.log("No projects");
    } else {
      for (const p of projects) {
        console.log(`${p.title} | ${p.status} | ${p.id}`);
      }
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
})();

