const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  const id = process.argv[2];
  if (!id) {
    console.error("Provide project id");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  try {
    const p = await prisma.project.findUnique({ where: { id }, include: { taskGroups: true, tasks: true } });
    if (!p) {
      console.log("Project not found");
    } else {
      console.log(`groups=${p.taskGroups.length} tasks=${p.tasks.length}`);
      for (const g of p.taskGroups) console.log(`Group: ${g.name}`);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
})();

