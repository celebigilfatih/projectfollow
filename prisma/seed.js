const { PrismaClient, RoleName, ProjectStatus, TaskStatus, Priority } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = 'admin@buski.local';
  const adminPass = 'admin123';
  const adminHash = await bcrypt.hash(adminPass, 10);

  await prisma.role.upsert({ where: { name: RoleName.Admin }, update: {}, create: { name: RoleName.Admin } });
  await prisma.role.upsert({ where: { name: RoleName.ProjectOwner }, update: {}, create: { name: RoleName.ProjectOwner } });
  await prisma.role.upsert({ where: { name: RoleName.Technician }, update: {}, create: { name: RoleName.Technician } });

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: { email: adminEmail, name: 'Admin', passwordHash: adminHash },
  });

  const adminRole = await prisma.role.findUnique({ where: { name: RoleName.Admin } });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });

  const domainProject = await prisma.project.create({
    data: {
      title: 'Yeni Domain Yapılandırması',
      description: 'BUSKI için Windows Server 2019 üzerinde yeni buski.local domain kurulumu',
      status: ProjectStatus.Active,
      domainNewOUPlan: 'OU=Users, OU=Computers, OU=IT, OU=HR, OU=Finance',
      domainUserMigration: 'ADMT ile kullanıcı taşıma',
      domainGPOPlan: 'Password policy, BitLocker, Windows Update GPO',
    },
  });

  const exchangeProject = await prisma.project.create({
    data: {
      title: 'Exchange Migration',
      description: 'Exchange Server 2010 kapatılması ve yeni Exchange kurulumu',
      status: ProjectStatus.Planned,
      exchMailboxPlan: 'Mail kutuları batch halinde taşınacak',
      exchAutodiscover: 'Autodiscover testleri başarılı',
      exchDatabaseDAG: '2 node DAG yapılandırılacak',
      exchHybridNotes: 'Gerekirse hybrid yapı notları',
    },
  });

  const t1 = await prisma.task.create({
    data: {
      projectId: domainProject.id,
      title: 'Yeni OU yapısı oluşturma',
      status: TaskStatus.InProgress,
      priority: Priority.High,
      position: 1,
      startDate: new Date(),
      dueDate: new Date(Date.now() + 3*24*60*60*1000),
    },
  });
  await prisma.subtask.create({ data: { taskId: t1.id, title: 'OU=Users', completed: true } });
  await prisma.subtask.create({ data: { taskId: t1.id, title: 'OU=Computers' } });

  const t2 = await prisma.task.create({
    data: {
      projectId: exchangeProject.id,
      title: 'Exchange DAG kurulumu',
      status: TaskStatus.ToDo,
      priority: Priority.Critical,
      position: 1,
      startDate: new Date(),
      dueDate: new Date(Date.now() + 7*24*60*60*1000),
    },
  });

  await prisma.projectNote.create({ data: { projectId: domainProject.id, title: 'Plan', content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'OU planı detayları' }] }] }, tags: ['domain','ou'] } });
  await prisma.calendarEvent.create({ data: { taskId: t1.id, title: 'OU tasarım toplantısı', start: new Date(), end: new Date(), userId: admin.id } });
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
