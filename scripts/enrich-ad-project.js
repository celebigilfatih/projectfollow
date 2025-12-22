const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  try {
    const title = "BUSKİ Active Directory Altyapı Dönüşüm Projesi (bbslocal → buski.local Domain Migration)";
    const project = await prisma.project.findFirst({ where: { title }, select: { id: true } });
    if (!project) {
      console.error("Project not found");
      return;
    }
    const admin = await prisma.user.findUnique({ where: { email: "admin@buski.local" }, select: { id: true } });
    const start = new Date();
    const end = new Date(start.getTime() + 90 * 24 * 60 * 60 * 1000);
    await prisma.project.update({ where: { id: project.id }, data: { responsibleId: admin?.id ?? null, startDate: start, endDate: end } });

    const groups = await prisma.taskGroup.findMany({ where: { projectId: project.id }, orderBy: { createdAt: "asc" }, select: { id: true, name: true } });
    let phaseIndex = 0;
    for (const g of groups) {
      const phaseStart = new Date(start.getTime() + phaseIndex * 7 * 24 * 60 * 60 * 1000);
      const phaseDue = new Date(start.getTime() + (phaseIndex + 1) * 7 * 24 * 60 * 60 * 1000);
      const tasks = await prisma.task.findMany({ where: { projectId: project.id, taskGroupId: g.id }, select: { id: true }, orderBy: { position: "asc" } });
      let firstTaskId = null;
      for (const t of tasks) {
        if (!firstTaskId) firstTaskId = t.id;
        await prisma.task.update({ where: { id: t.id }, data: { startDate: phaseStart, dueDate: phaseDue } });
      }
      if (firstTaskId) {
        await prisma.calendarEvent.create({ data: { taskId: firstTaskId, title: `${g.name} – Başlangıç`, start: phaseStart, end: new Date(phaseStart.getTime() + 2 * 60 * 60 * 1000) } });
      }
      phaseIndex++;
    }
    console.log("Updated project and scheduled tasks.");
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});

