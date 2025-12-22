const { PrismaClient, ProjectStatus, TaskStatus, Priority } = require("@prisma/client");
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
    const description = "Windows Server 2008 üzerindeki bbslocal domain yapısının Windows Server 2019 üzerinde buski.local domainine taşınması, güvenlik ve yönetilebilirlik artırımı.";
    const scopeIncluded = [
      "Windows Server 2019 kurulumu",
      "Yeni buski.local domain yapısının oluşturulması",
      "Domain Controller yapılandırmaları",
      "Kurumsal OU tasarımı",
      "Kullanıcı hesaplarının oluşturulması",
      "Bilgisayar hesaplarının yapılandırılması",
      "Security Group tasarımı ve yetkilendirme",
      "Daire Başkanlıkları bazlı geçiş planı",
      "Test ve doğrulama çalışmaları",
      "Dokümantasyon ve devir",
    ];
    const scopeExcluded = [
      "Exchange Migration",
      "Dosya sunucu migration",
      "Uygulama bağımlılıklarının taşınması",
      "GPO detaylı optimizasyonları",
      "3. parti entegrasyonlar",
    ];
    const scope = "Dahil: " + scopeIncluded.join("; ") + " | Dış: " + scopeExcluded.join("; ");
    const project = await prisma.project.create({
      data: {
        title,
        description,
        scope,
        status: ProjectStatus.Planned,
        domainNewOUPlan: "Kurumsal OU hiyerarşisi ve naming convention",
        domainUserMigration: "Kullanıcı, bilgisayar ve servis hesaplarının yeniden yapılandırılması",
        domainGPOPlan: "Security Group tabanlı yetkilendirme, temel GPO planı",
      },
    });

    const phases = [
      {
        name: "FAZ 1 – MEVCUT YAPI ANALİZİ",
        tasks: [
          "Mevcut Domain Controller’ların incelenmesi",
          "Kullanıcı sayısının tespiti",
          "OU yapısının çıkarılması",
          "Security Group envanteri",
          "Bilgisayar hesaplarının analizi",
          "Bağımlı servis ve uygulamaların listelenmesi",
          "Risk ve bağımlılık analizi",
        ],
      },
      {
        name: "FAZ 2 – YENİ DOMAIN TASARIMI",
        tasks: [
          "Domain adı ve namespace tasarımı (buski.local)",
          "OU mimarisinin belirlenmesi",
          "Daire Başkanlıkları",
          "Şube Müdürlükleri",
          "Kullanıcı / Bilgisayar ayrımı",
          "Naming convention belirlenmesi",
          "Security Group tasarımı (Role-Based)",
          "Yetkilendirme modeli (Least Privilege)",
        ],
      },
      {
        name: "FAZ 3 – WINDOWS SERVER 2019 KURULUMU",
        tasks: [
          "Windows Server 2019 kurulumu",
          "Güncelleme ve güvenlik yamaları",
          "Domain Controller kurulumu",
          "DNS yapılandırması",
          "FSMO rollerinin planlanması",
          "Yedeklilik planı",
        ],
      },
      {
        name: "FAZ 4 – OU, KULLANICI VE GRUP OLUŞTURMA",
        tasks: [
          "OU’ların oluşturulması",
          "Daire Başkanlıklarına göre kullanıcı hesaplarının açılması",
          "Servis hesaplarının oluşturulması",
          "Security Group’ların oluşturulması",
          "Grup – kullanıcı eşleşmelerinin yapılması",
          "Yetki testleri",
        ],
      },
      {
        name: "FAZ 5 – DAİRE BAŞKANLIĞI BAZLI GEÇİŞ",
        tasks: [
          "Pilot daire seçimi",
          "Pilot kullanıcı geçişi",
          "Test senaryolarının uygulanması",
          "Sorun ve geri bildirimlerin alınması",
          "Daire başkanlıkları bazında planlı geçiş",
        ],
      },
      {
        name: "FAZ 6 – TEST, DOĞRULAMA VE KABUL",
        tasks: [
          "Kullanıcı login testleri",
          "Yetki kontrolleri",
          "DNS ve AD replikasyon kontrolleri",
          "Performans testleri",
          "Güvenlik kontrolleri",
          "Kabul tutanağı hazırlanması",
        ],
      },
      {
        name: "FAZ 7 – DOKÜMANTASYON VE DEVİR",
        tasks: [
          "AD mimari dokümanı",
          "OU ve Group yapısı dokümantasyonu",
          "Kullanıcı yönetim prosedürleri",
          "Yedekleme ve geri dönüş planı",
          "Operasyon ekibine devir",
        ],
      },
      {
        name: "FAZ 8 – BAŞARI KRİTERLERİ",
        tasks: [
          "Eski bbslocal domaininin sorunsuz kapatılması",
          "buski.local domaininin aktif ve stabil çalışması",
          "Kullanıcıların kesintisiz erişim sağlaması",
          "Yetkilendirme hatalarının olmaması",
          "Dokümantasyonun eksiksiz teslim edilmesi",
        ],
      },
    ];

    for (const ph of phases) {
      const group = await prisma.taskGroup.create({ data: { projectId: project.id, name: ph.name } });
      let pos = 1;
      for (const t of ph.tasks) {
        await prisma.task.create({
          data: {
            projectId: project.id,
            taskGroupId: group.id,
            title: t,
            status: TaskStatus.ToDo,
            priority: Priority.Medium,
            position: pos++,
          },
        });
      }
    }

    const noteContent = { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Proje kapsamı ve kapsam dışı maddeler belirlendi." }] }] };
    await prisma.projectNote.create({ data: { projectId: project.id, title: "Kapsam", content: noteContent, tags: ["kapsam"] } });

    console.log("Created project:", project.id);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});

