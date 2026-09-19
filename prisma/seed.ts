import { PrismaClient, Priority, TaskStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const HASH_COST = 12;
const hash = (password: string) => bcrypt.hash(password, HASH_COST);

function daysFromNow(days: number, hours = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(d.getHours() + hours);
  return d;
}

async function main() {
  console.log("Seed boshlandi...");

  await db.notification.deleteMany();
  await db.taskHistory.deleteMany();
  await db.attachment.deleteMany();
  await db.taskComment.deleteMany();
  await db.taskAssignee.deleteMany();
  await db.task.deleteMany();
  await db.auditLog.deleteMany();
  await db.user.updateMany({ data: { departmentId: null } });
  await db.department.deleteMany();
  await db.user.deleteMany();
  await db.organization.deleteMany();

  const republicCouncil = await db.organization.create({
    data: {
      name: "O'zbekiston axborot texnologiyalari va ommaviy kommunikatsiya xodimlari Kasaba uyushmasi Respublika Kengashi",
      shortName: "Respublika Kengashi",
      region: "Toshkent shahri",
    },
  });

  const itDepartment = await db.department.create({
    data: { name: "IT xizmatlari bo'limi", organizationId: republicCouncil.id },
  });
  const orgDepartment = await db.department.create({
    data: { name: "Tashkiliy ishlar bo'limi", organizationId: republicCouncil.id },
  });

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin12345";

  const admin = await db.user.create({
    data: {
      username: process.env.SEED_ADMIN_USERNAME || "admin",
      passwordHash: await hash(adminPassword),
      fullName: "Administrator",
      position: "Tizim administratori",
      role: "ADMIN",
      organizationId: republicCouncil.id,
      mustChangePassword: true,
    },
  });

  const manager = await db.user.create({
    data: {
      username: "manager1",
      passwordHash: await hash("Manager12345"),
      fullName: "Aziz Yusupov",
      position: "IT xizmatlari bo'limi boshlig'i",
      role: "MANAGER",
      organizationId: republicCouncil.id,
      departmentId: itDepartment.id,
      mustChangePassword: true,
    },
  });

  await db.department.update({
    where: { id: itDepartment.id },
    data: { headId: manager.id },
  });

  const executor1 = await db.user.create({
    data: {
      username: "ijrochi1",
      passwordHash: await hash("Ijrochi12345"),
      fullName: "Malika Karimova",
      position: "Bosh mutaxassis",
      role: "EXECUTOR",
      organizationId: republicCouncil.id,
      departmentId: itDepartment.id,
      mustChangePassword: true,
    },
  });

  const executor2 = await db.user.create({
    data: {
      username: "ijrochi2",
      passwordHash: await hash("Ijrochi12345"),
      fullName: "Sardor Toshev",
      position: "Yetakchi mutaxassis",
      role: "EXECUTOR",
      organizationId: republicCouncil.id,
      departmentId: itDepartment.id,
      mustChangePassword: true,
    },
  });

  const executor3 = await db.user.create({
    data: {
      username: "ijrochi3",
      passwordHash: await hash("Ijrochi12345"),
      fullName: "Nodira Rashidova",
      position: "Mutaxassis",
      role: "EXECUTOR",
      organizationId: republicCouncil.id,
      departmentId: orgDepartment.id,
      mustChangePassword: true,
    },
  });

  type TaskSpec = {
    title: string;
    description: string;
    priority: Priority;
    deadline: Date;
    createdById: string;
    departmentId: string;
    assignees: { userId: string; status: TaskStatus }[];
    status: TaskStatus;
    completedAt?: Date;
  };

  const specs: TaskSpec[] = [
    // OVERDUE (4) — muddati o'tgan, bajarilmagan
    {
      title: "Bo'lim veb-sahifasini yangilash",
      description: "Bo'lim uchun yangi ma'lumotlarni saytga joylashtirish kerak.",
      priority: "HIGH",
      deadline: daysFromNow(-5),
      createdById: admin.id,
      departmentId: itDepartment.id,
      assignees: [{ userId: executor1.id, status: "NEW" }],
      status: "NEW",
    },
    {
      title: "Server zaxira nusxasini tekshirish",
      description: "Oxirgi 3 oylik zaxira nusxalarini tekshirib, hisobot berish.",
      priority: "URGENT",
      deadline: daysFromNow(-3),
      createdById: admin.id,
      departmentId: itDepartment.id,
      assignees: [{ userId: executor2.id, status: "IN_PROGRESS" }],
      status: "IN_PROGRESS",
    },
    {
      title: "Kasaba uyushmasi a'zolari reyestrini yangilash",
      description: "Yangi qo'shilgan a'zolarni reyestrga kiritish.",
      priority: "MEDIUM",
      deadline: daysFromNow(-2),
      createdById: manager.id,
      departmentId: itDepartment.id,
      assignees: [{ userId: executor1.id, status: "SUBMITTED" }],
      status: "SUBMITTED",
    },
    {
      title: "Yillik hisobot loyihasini tayyorlash",
      description: "2026-yilgi yillik hisobot loyihasini tayyorlab, ko'rib chiqish uchun topshirish.",
      priority: "HIGH",
      deadline: daysFromNow(-1),
      createdById: admin.id,
      departmentId: orgDepartment.id,
      assignees: [{ userId: executor3.id, status: "RETURNED" }],
      status: "RETURNED",
    },
    // DUE_SOON (2) — 48 soat ichida
    {
      title: "Konferens-zal texnik jihozlarini tekshirish",
      description: "Yig'ilish oldidan proyektor va tovush tizimini sozlash.",
      priority: "MEDIUM",
      deadline: daysFromNow(1, 4),
      createdById: manager.id,
      departmentId: itDepartment.id,
      assignees: [{ userId: executor2.id, status: "IN_PROGRESS" }],
      status: "IN_PROGRESS",
    },
    {
      title: "Xodimlar uchun ichki bildirishnoma tizimini sinovdan o'tkazish",
      description: "Yangi bildirishnoma funksiyasini test qilib, xatoliklar haqida yozish.",
      priority: "LOW",
      deadline: daysFromNow(2, 0),
      createdById: manager.id,
      departmentId: itDepartment.id,
      assignees: [{ userId: executor1.id, status: "NEW" }],
      status: "NEW",
    },
    // ON_TRACK (3)
    {
      title: "Yangi xodimlar uchun kirish huquqlarini sozlash",
      description: "Yangi qabul qilingan xodimlarga tizimdan foydalanish huquqini berish.",
      priority: "MEDIUM",
      deadline: daysFromNow(7),
      createdById: admin.id,
      departmentId: itDepartment.id,
      assignees: [
        { userId: executor1.id, status: "IN_PROGRESS" },
        { userId: executor2.id, status: "IN_PROGRESS" },
      ],
      status: "IN_PROGRESS",
    },
    {
      title: "Hududiy kengashlar bilan videokonferensiya tashkil etish",
      description: "Barcha hududiy kengashlar bilan oylik videokonferensiyani rejalashtirish.",
      priority: "MEDIUM",
      deadline: daysFromNow(10),
      createdById: admin.id,
      departmentId: orgDepartment.id,
      assignees: [{ userId: executor3.id, status: "NEW" }],
      status: "NEW",
    },
    {
      title: "Fayl saqlash tizimini S3'ga migratsiya qilish rejasini tayyorlash",
      description: "Vercel Blob'dan MinIO'ga o'tish bo'yicha texnik reja yozish.",
      priority: "LOW",
      deadline: daysFromNow(14),
      createdById: manager.id,
      departmentId: itDepartment.id,
      assignees: [{ userId: executor2.id, status: "SUBMITTED" }],
      status: "SUBMITTED",
    },
    // DONE_ON_TIME (3)
    {
      title: "Bo'lim xodimlari uchun parollarni tiklash",
      description: "Barcha xodimlar uchun vaqtinchalik parollarni generatsiya qilish.",
      priority: "HIGH",
      deadline: daysFromNow(-2),
      createdById: admin.id,
      departmentId: itDepartment.id,
      assignees: [{ userId: executor1.id, status: "DONE" }],
      status: "DONE",
      completedAt: daysFromNow(-3),
    },
    {
      title: "Oylik ijro intizomi hisobotini yuborish",
      description: "O'tgan oy uchun ijro intizomi hisobotini rahbariyatga yuborish.",
      priority: "MEDIUM",
      deadline: daysFromNow(-4),
      createdById: admin.id,
      departmentId: orgDepartment.id,
      assignees: [{ userId: executor3.id, status: "DONE" }],
      status: "DONE",
      completedAt: daysFromNow(-5),
    },
    {
      title: "Yangi ish o'rinlari uchun texnika buyurtma qilish",
      description: "IT bo'limi uchun 3 ta noutbuk sotib olish arizasini rasmiylashtirish.",
      priority: "MEDIUM",
      deadline: daysFromNow(-1),
      createdById: manager.id,
      departmentId: itDepartment.id,
      assignees: [
        { userId: executor1.id, status: "DONE" },
        { userId: executor3.id, status: "DONE" },
      ],
      status: "DONE",
      completedAt: daysFromNow(-2),
    },
    // DONE_LATE (2)
    {
      title: "Tizim xavfsizligi bo'yicha audit o'tkazish",
      description: "Parollar siyosati va ruxsatlar tizimini tekshirish.",
      priority: "URGENT",
      deadline: daysFromNow(-10),
      createdById: admin.id,
      departmentId: itDepartment.id,
      assignees: [{ userId: executor2.id, status: "DONE" }],
      status: "DONE",
      completedAt: daysFromNow(-6),
    },
    {
      title: "Arxiv hujjatlarini raqamlashtirish",
      description: "Qog'oz hujjatlarni skanerlash va tizimga yuklash.",
      priority: "LOW",
      deadline: daysFromNow(-8),
      createdById: manager.id,
      departmentId: itDepartment.id,
      assignees: [{ userId: executor1.id, status: "DONE" }],
      status: "DONE",
      completedAt: daysFromNow(-4),
    },
    // CANCELLED (1)
    {
      title: "Eski intranet portalini yopish",
      description: "Yangi tizim ishga tushgani sababli eski portal endi kerak emas.",
      priority: "LOW",
      deadline: daysFromNow(5),
      createdById: admin.id,
      departmentId: itDepartment.id,
      assignees: [{ userId: executor2.id, status: "CANCELLED" }],
      status: "CANCELLED",
    },
  ];

  for (const spec of specs) {
    const task = await db.task.create({
      data: {
        title: spec.title,
        description: spec.description,
        priority: spec.priority,
        status: spec.status,
        deadline: spec.deadline,
        completedAt: spec.completedAt,
        createdById: spec.createdById,
        departmentId: spec.departmentId,
      },
    });

    for (const a of spec.assignees) {
      await db.taskAssignee.create({
        data: {
          taskId: task.id,
          userId: a.userId,
          status: a.status,
          openedAt: a.status !== "NEW" ? task.createdAt : null,
          submittedAt:
            a.status === "DONE" ? spec.completedAt : ["SUBMITTED", "RETURNED"].includes(a.status) ? task.createdAt : null,
          acceptedAt: a.status === "DONE" ? spec.completedAt : null,
        },
      });

      await db.notification.create({
        data: {
          userId: a.userId,
          type: "TASK_ASSIGNED",
          title: `Sizga yangi topshiriq berildi: "${spec.title}"`,
          taskId: task.id,
          isRead: a.status !== "NEW",
        },
      });
    }

    await db.taskHistory.create({
      data: {
        taskId: task.id,
        actorId: spec.createdById,
        action: "CREATED",
        newValue: { status: "NEW", deadline: spec.deadline },
      },
    });

    if (spec.status !== "NEW") {
      await db.taskHistory.create({
        data: {
          taskId: task.id,
          actorId: spec.assignees[0].userId,
          action: "STATUS_CHANGED",
          oldValue: { status: "NEW" },
          newValue: { status: spec.status },
        },
      });
    }
  }

  console.log("Seed yakunlandi.");
  console.log(`Admin: ${admin.username} / ${adminPassword}`);
  console.log(`Manager: manager1 / Manager12345`);
  console.log(`Ijrochilar: ijrochi1, ijrochi2, ijrochi3 / Ijrochi12345`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
