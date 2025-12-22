const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

async function main() {
  const titles = process.argv.slice(2);
  if (titles.length === 0) {
    console.error("Provide at least one project title");
    process.exit(1);
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  try {
    const projects = await prisma.project.findMany({ where: { title: { in: titles } }, select: { id: true, title: true } });
    if (projects.length === 0) {
      console.log("No matching projects found");
      return;
    }
    for (const p of projects) {
      await prisma.project.delete({ where: { id: p.id } });
      console.log(`Deleted project: ${p.title} (${p.id})`);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});

