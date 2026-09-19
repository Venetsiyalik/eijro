# CLAUDE.md — "Ijro nazorati" platformasi

**Buyurtmachi:** O'zbekiston axborot texnologiyalari va ommaviy kommunikatsiya xodimlari Kasaba uyushmasi Respublika Kengashi
**Maqsad:** Topshiriqlarni berish, ijrosini kuzatish va muddat intizomini nazorat qilish uchun ichki veb-platforma.

> Claude Code uchun ko'rsatma: ushbu hujjat loyihaning yagona manbasi. Bosqichlarni (§12) ketma-ket bajaring. Har bosqich oxirida `npm run build` va `npm run lint` xatosiz o'tishi shart. Interfeys tili: **o'zbek (lotin)**.

---

## 1. Doira (scope)

**Kiradi:**
- Login/parol orqali kirish (ro'yxatdan o'tish YO'Q, hisoblarni admin yaratadi)
- Admin panel: foydalanuvchilar, bo'limlar, tashkilotlar, barcha topshiriqlar, audit jurnali
- Topshiriqlar: deadline, ijrochilar, fayllar, izohlar, holat tarixi
- Muddati o'tgan topshiriqlar **qizil** rangda
- Dashboard va hisobotlar (Excel eksport)
- Ichki bildirishnomalar (sayt ichida)

**Kirmaydi:** E-imzo, a'zolik hisobi, murojaatlar, mobil ilova, E-ijro integratsiyasi, ochiq ro'yxatdan o'tish.

---

## 2. Texnologiyalar

| Qatlam | Tanlov |
|---|---|
| Framework | Next.js 15 (App Router, TypeScript, Server Actions) |
| UI | Tailwind CSS + shadcn/ui, ikonlar: lucide-react |
| DB | PostgreSQL 16 (Vercel bosqichida: Neon) |
| ORM | Prisma |
| Auth | Auth.js (NextAuth v5), Credentials provider, JWT sessiya |
| Parol | bcryptjs (cost 12) |
| Validatsiya | Zod |
| Fayllar | Storage adapter: `vercel-blob` (hozir) / `s3` (MinIO, keyin) |
| Jadvallar | TanStack Table |
| Excel | exceljs |
| Sana | date-fns (+ `uz` locale), vaqt zonasi `Asia/Tashkent` |
| Deploy | 1-bosqich: Vercel. 2-bosqich: Docker + Nginx o'z serverda |

**Portativlik qoidasi:** Vercelga xos API faqat `lib/storage/` ichida ishlatiladi. Boshqa joylarda Vercelga bog'liq kod bo'lmasin.

---

## 3. Rollar va huquqlar

| Rol | Kod | Huquqlar |
|---|---|---|
| Administrator | `ADMIN` | Hamma narsa: foydalanuvchi/bo'lim/tashkilot CRUD, har kimga topshiriq berish, barcha topshiriqlarni ko'rish/tahrirlash/o'chirish, parolni tiklash, hisobni bloklash, audit jurnali |
| Bo'lim boshlig'i | `MANAGER` | O'z bo'limi xodimlariga topshiriq berish; o'zi bergan va o'ziga berilgan topshiriqlarni ko'rish; o'zi bergan topshiriqni qabul qilish/qaytarish; bo'lim hisobotlari |
| Ijrochi | `EXECUTOR` | Faqat o'ziga berilgan topshiriqlarni ko'rish, holatni o'zgartirish, fayl yuklash, izoh yozish, ijroga topshirish |

Huquqlar **serverda** (Server Action / Route Handler ichida) tekshiriladi. UI'da yashirish yetarli emas. Barcha tekshiruvlar `lib/permissions.ts` da jamlanadi.

---

## 4. Topshiriq hayot sikli

```
NEW ──► IN_PROGRESS ──► SUBMITTED ──► DONE
                          │
                          └──► RETURNED ──► IN_PROGRESS
Istalgan holat ──► CANCELLED (faqat ADMIN yoki topshiriq bergan shaxs)
```

- `NEW` — yaratildi, ijrochi hali ochmagan
- `IN_PROGRESS` — ijrochi ishni boshladi (topshiriqni birinchi ochganda avtomatik)
- `SUBMITTED` — ijrochi natijani topshirdi (izoh va/yoki fayl majburiy)
- `RETURNED` — topshiriq bergan shaxs qaytardi (sabab majburiy)
- `DONE` — qabul qilindi, `completedAt` yoziladi
- `CANCELLED` — bekor qilindi

**Bir nechta ijrochi:** har bir ijrochining alohida holati bor (`TaskAssignee.status`). Topshiriq umumiy holati: barcha ijrochilar `DONE` bo'lsa `DONE`.

---

## 5. Muddat (deadline) va rang qoidasi

Muddat holati **so'rov vaqtida hisoblanadi** (cron kerak emas), `lib/deadline.ts`:

```ts
type DeadlineState = 'OVERDUE' | 'DUE_SOON' | 'ON_TRACK' | 'DONE_ON_TIME' | 'DONE_LATE' | 'CANCELLED';
```

| Holat | Shart | Rang |
|---|---|---|
| `OVERDUE` | bajarilmagan va `now > deadline` | **qizil** (qator foni `bg-red-50`, chap chegara `border-red-600`, badge "Muddati o'tgan · N kun") |
| `DUE_SOON` | bajarilmagan va deadline'gacha ≤ 48 soat | sariq |
| `ON_TRACK` | bajarilmagan, vaqt yetarli | oddiy |
| `DONE_ON_TIME` | `completedAt <= deadline` | yashil |
| `DONE_LATE` | `completedAt > deadline` | to'q sariq, "Kechikib bajarilgan" (kechikish tarixda qoladi) |
| `CANCELLED` | bekor qilingan | kulrang |

- Ijrochi `SUBMITTED` qilgan vaqt `submittedAt` sifatida saqlanadi. Kechikish `submittedAt` bo'yicha hisoblanadi (qabul qilish kechiksa ijrochi aybdor bo'lmaydi).
- Deadline'ni faqat ADMIN yoki topshiriq bergan shaxs o'zgartiradi, sabab majburiy, eski/yangi qiymat `TaskHistory`ga yoziladi.
- Ro'yxatlarda standart saralash: avval `OVERDUE`, keyin `DUE_SOON`, keyin deadline bo'yicha.
- Muddati o'tganlar DB indeks orqali tez topiladi: `WHERE status NOT IN ('DONE','CANCELLED') AND deadline < now()`.

---

## 6. Ma'lumotlar bazasi sxemasi (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum Role {
  ADMIN
  MANAGER
  EXECUTOR
}

enum TaskStatus {
  NEW
  IN_PROGRESS
  SUBMITTED
  RETURNED
  DONE
  CANCELLED
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum NotificationType {
  TASK_ASSIGNED
  TASK_SUBMITTED
  TASK_RETURNED
  TASK_ACCEPTED
  TASK_COMMENT
  DEADLINE_CHANGED
  DEADLINE_SOON
  TASK_OVERDUE
}

/// Hududiy kengash / tashkilot (Respublika Kengashi ham shu jadvalda, parentId = null)
model Organization {
  id          String         @id @default(cuid())
  name        String
  shortName   String?
  region      String?
  parentId    String?
  parent      Organization?  @relation("OrgTree", fields: [parentId], references: [id])
  children    Organization[] @relation("OrgTree")
  departments Department[]
  users       User[]
  isActive    Boolean        @default(true)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
}

model Department {
  id             String       @id @default(cuid())
  name           String
  organizationId String
  organization   Organization @relation(fields: [organizationId], references: [id])
  headId         String?      @unique
  head           User?        @relation("DepartmentHead", fields: [headId], references: [id])
  members        User[]       @relation("DepartmentMembers")
  isActive       Boolean      @default(true)
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  @@unique([organizationId, name])
}

model User {
  id                 String        @id @default(cuid())
  username           String        @unique
  passwordHash       String
  fullName           String
  position           String?
  phone              String?
  email              String?
  role               Role          @default(EXECUTOR)
  organizationId     String?
  organization       Organization? @relation(fields: [organizationId], references: [id])
  departmentId       String?
  department         Department?   @relation("DepartmentMembers", fields: [departmentId], references: [id])
  headOf             Department?   @relation("DepartmentHead")
  isActive           Boolean       @default(true)
  mustChangePassword Boolean       @default(true)
  failedLoginCount   Int           @default(0)
  lockedUntil        DateTime?
  lastLoginAt        DateTime?
  createdAt          DateTime      @default(now())
  updatedAt          DateTime      @updatedAt

  createdTasks   Task[]         @relation("TaskCreator")
  assignments    TaskAssignee[]
  comments       TaskComment[]
  attachments    Attachment[]
  history        TaskHistory[]
  notifications  Notification[]
  auditLogs      AuditLog[]

  @@index([role])
  @@index([departmentId])
}

model Task {
  id            String     @id @default(cuid())
  number        Int        @unique @default(autoincrement()) /// Ko'rinadigan raqam: T-000123
  title         String
  description   String     @db.Text
  priority      Priority   @default(MEDIUM)
  status        TaskStatus @default(NEW)
  deadline      DateTime
  completedAt   DateTime?
  createdById   String
  createdBy     User       @relation("TaskCreator", fields: [createdById], references: [id])
  departmentId  String?    /// Qaysi bo'lim doirasida berilgan (hisobot uchun)
  parentTaskId  String?
  parentTask    Task?      @relation("SubTasks", fields: [parentTaskId], references: [id])
  subTasks      Task[]     @relation("SubTasks")
  isDeleted     Boolean    @default(false) /// Soft delete
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  assignees   TaskAssignee[]
  comments    TaskComment[]
  attachments Attachment[]
  history     TaskHistory[]

  @@index([status, deadline])
  @@index([createdById])
  @@index([departmentId])
}

model TaskAssignee {
  id          String     @id @default(cuid())
  taskId      String
  task        Task       @relation(fields: [taskId], references: [id], onDelete: Cascade)
  userId      String
  user        User       @relation(fields: [userId], references: [id])
  status      TaskStatus @default(NEW)
  openedAt    DateTime?
  submittedAt DateTime?
  acceptedAt  DateTime?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  @@unique([taskId, userId])
  @@index([userId, status])
}

model TaskComment {
  id        String       @id @default(cuid())
  taskId    String
  task      Task         @relation(fields: [taskId], references: [id], onDelete: Cascade)
  authorId  String
  author    User         @relation(fields: [authorId], references: [id])
  body      String       @db.Text
  attachments Attachment[]
  createdAt DateTime     @default(now())

  @@index([taskId, createdAt])
}

model Attachment {
  id           String       @id @default(cuid())
  taskId       String
  task         Task         @relation(fields: [taskId], references: [id], onDelete: Cascade)
  commentId    String?
  comment      TaskComment? @relation(fields: [commentId], references: [id])
  uploadedById String
  uploadedBy   User         @relation(fields: [uploadedById], references: [id])
  fileName     String
  mimeType     String
  sizeBytes    Int
  storageKey   String       /// Storage adapterdagi kalit (URL emas!)
  isResult     Boolean      @default(false) /// Ijro natijasi sifatida yuklanganmi
  createdAt    DateTime     @default(now())

  @@index([taskId])
}

model TaskHistory {
  id        String   @id @default(cuid())
  taskId    String
  task      Task     @relation(fields: [taskId], references: [id], onDelete: Cascade)
  actorId   String
  actor     User     @relation(fields: [actorId], references: [id])
  action    String   /// CREATED, STATUS_CHANGED, DEADLINE_CHANGED, ASSIGNEE_ADDED, ...
  oldValue  Json?
  newValue  Json?
  reason    String?
  createdAt DateTime @default(now())

  @@index([taskId, createdAt])
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  user      User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  type      NotificationType
  title     String
  taskId    String?
  isRead    Boolean          @default(false)
  createdAt DateTime         @default(now())

  @@index([userId, isRead])
}

/// Butun tizim bo'yicha audit (admin panelda ko'rinadi)
model AuditLog {
  id        String   @id @default(cuid())
  actorId   String?
  actor     User?    @relation(fields: [actorId], references: [id])
  action    String   /// LOGIN_SUCCESS, LOGIN_FAILED, USER_CREATED, PASSWORD_RESET, TASK_DELETED, ...
  entity    String?  /// User, Task, Department ...
  entityId  String?
  meta      Json?
  ip        String?
  userAgent String?
  createdAt DateTime @default(now())

  @@index([createdAt])
  @@index([actorId])
}
```

**Eslatma:** `DEADLINE_SOON` va `TASK_OVERDUE` bildirishnomalari foydalanuvchi sahifa ochganda "lazy" yaratiladi (bir topshiriq uchun bir marta). Keyinchalik o'z serverda cron qo'shish mumkin.

---

## 7. Sahifalar (routes)

```
/login                       Kirish
/change-password             Birinchi kirishda majburiy
/                            Dashboard (rolga qarab)
/tasks                       Topshiriqlar ro'yxati (filtr: holat, muddat, ijrochi, bo'lim, ustuvorlik, sana)
/tasks/new                   Yangi topshiriq (ADMIN, MANAGER)
/tasks/[id]                  Topshiriq kartasi: tavsif, ijrochilar va holatlari, fayllar, izohlar, tarix
/tasks/[id]/edit             Tahrirlash (ADMIN yoki muallif)
/reports                     Hisobotlar (ADMIN — hammasi, MANAGER — o'z bo'limi)
/notifications               Bildirishnomalar
/profile                     Profil, parolni o'zgartirish

/admin                       Admin bosh sahifa (statistika)
/admin/users                 Foydalanuvchilar CRUD, parol tiklash, bloklash
/admin/organizations         Tashkilotlar daraxti
/admin/departments           Bo'limlar, boshliqni tayinlash
/admin/tasks                 BARCHA topshiriqlar (o'chirilganlar ham, filtr bilan)
/admin/audit                 Audit jurnali
```

`middleware.ts`: autentifikatsiyasiz → `/login`; `mustChangePassword` → `/change-password`; `/admin/*` faqat `ADMIN`.

---

## 8. Asosiy funksional talablar

### 8.1 Autentifikatsiya
- Login: `username` + `password`. Xato xabari umumiy: "Login yoki parol noto'g'ri".
- 5 marta xato → hisob 15 daqiqaga bloklanadi (`lockedUntil`).
- Admin foydalanuvchi yaratganda vaqtinchalik parol generatsiya qilinadi va **bir marta** ko'rsatiladi (nusxalash tugmasi bilan).
- Parol siyosati: kamida 8 belgi, harf va raqam.
- Sessiya muddati: 8 soat. `isActive=false` bo'lsa sessiya darhol bekor (har so'rovda tekshirish).

### 8.2 Topshiriq yaratish
- Maydonlar: sarlavha*, tavsif*, deadline* (sana + vaqt, o'tmishda bo'lmasin), ustuvorlik, ijrochilar* (1+), fayllar.
- MANAGER faqat o'z bo'limi a'zolarini tanlay oladi.
- Yaratilganda har ijrochiga `TASK_ASSIGNED` bildirishnoma.

### 8.3 Ijro
- Ijrochi: "Ijroga topshirish" → izoh majburiy, natija fayli ixtiyoriy (`isResult=true`).
- Muallif/Admin: "Qabul qilish" yoki "Qaytarish (sabab bilan)".
- Barcha harakatlar `TaskHistory`ga yoziladi.

### 8.4 Fayllar
- Ruxsat etilgan: pdf, doc, docx, xls, xlsx, ppt, pptx, jpg, png, zip. Maksimal hajm: 20 MB.
- Yuklab olish faqat `/api/files/[id]` orqali, huquq tekshiriladi (to'g'ridan-to'g'ri ommaviy URL bermaslik).
- Fayl nomi xavfsizlantiriladi, `storageKey` = `tasks/{taskId}/{cuid}-{safeName}`.

### 8.5 Dashboard
- **ADMIN:** jami / bajarilmoqda / muddati o'tgan (qizil karta) / o'z vaqtida bajarilgan %; bo'limlar reytingi (ijro intizomi %); eng ko'p kechiktirgan xodimlar; so'nggi faoliyat.
- **MANAGER:** o'z bo'limi bo'yicha xuddi shunday.
- **EXECUTOR:** mening topshiriqlarim (muddati o'tganlar tepada, qizil), bugun/shu hafta muddati tugaydiganlar.

### 8.6 Hisobotlar
- Davr bo'yicha filtr. Ko'rsatkichlar: berilgan, bajarilgan, o'z vaqtida, kechikib, muddati o'tgan (hozir ochiq).
- **Ijro intizomi %** = o'z vaqtida bajarilgan / (bajarilgan + muddati o'tgan ochiq) × 100.
- Kesimlar: xodim, bo'lim, tashkilot. Excel eksport (muddati o'tgan qatorlar qizil fon bilan).

### 8.7 Admin nazorati
- Har qanday topshiriqni ko'rish, tahrirlash, ijrochi almashtirish, deadline o'zgartirish, bekor qilish, soft-delete/tiklash.
- Foydalanuvchi o'chirilmaydi, faqat `isActive=false` (tarix saqlanadi).
- Audit jurnali: filtr (foydalanuvchi, harakat, sana), sahifalash.

---

## 9. Xavfsizlik
- Barcha mutatsiyalar Zod bilan validatsiya + `permissions.ts` tekshiruvi.
- Prisma parametrlangan so'rovlar (xom SQL faqat zarur bo'lsa `$queryRaw` tagged template).
- HTTP headerlar: CSP, `X-Frame-Options: DENY`, `Referrer-Policy`.
- Login va fayl yuklashga rate limit (oddiy in-DB yoki in-memory; Vercel uchun `failedLoginCount` yetarli).
- Parol hashlari va maxfiy maydonlar hech qachon klientga yuborilmaydi (`select` bilan cheklash).
- `.env` fayllari gitga tushmaydi.

---

## 10. Loyiha tuzilmasi

```
app/
  (auth)/login, change-password
  (main)/page.tsx, tasks/, reports/, notifications/, profile/
  admin/...
  api/auth/[...nextauth]/route.ts
  api/files/[id]/route.ts
  api/files/upload/route.ts
components/ (ui/, tasks/, admin/, dashboard/)
lib/
  auth.ts            Auth.js konfiguratsiyasi
  db.ts              Prisma singleton
  permissions.ts     Barcha huquq tekshiruvlari
  deadline.ts        Muddat holati va ranglar
  audit.ts           AuditLog yozish
  notify.ts          Bildirishnoma yaratish
  storage/
    index.ts         getStorage() — STORAGE_DRIVER bo'yicha tanlaydi
    types.ts         interface StorageAdapter { put, getStream, delete }
    vercel-blob.ts
    s3.ts            MinIO / S3 mos
  validators/        Zod sxemalari
actions/             Server Actions (tasks.ts, users.ts, ...)
prisma/schema.prisma, seed.ts
Dockerfile, docker-compose.yml, .env.example
```

---

## 11. Muhit o'zgaruvchilari (`.env.example`)

```
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
AUTH_SECRET=                 # openssl rand -base64 32
AUTH_URL=https://...
TZ=Asia/Tashkent

STORAGE_DRIVER=vercel-blob   # yoki s3
BLOB_READ_WRITE_TOKEN=

S3_ENDPOINT=http://minio:9000
S3_REGION=us-east-1
S3_BUCKET=ijro-files
S3_ACCESS_KEY=
S3_SECRET_KEY=

SEED_ADMIN_USERNAME=admin
SEED_ADMIN_PASSWORD=         # seed'dan keyin almashtiriladi
```

---

## 12. Ishlab chiqish bosqichlari (Claude Code uchun)

1. **Poydevor:** Next.js + TS + Tailwind + shadcn/ui, Prisma sxema, migratsiya, `seed.ts` (1 admin, Respublika Kengashi, 2 bo'lim, 1 manager, 3 ijrochi, turli holatdagi 15 topshiriq, shu jumladan muddati o'tganlar).
2. **Auth:** login, middleware, bloklash, majburiy parol almashtirish, audit.
3. **Admin: tuzilma:** tashkilotlar, bo'limlar, foydalanuvchilar CRUD, parol tiklash.
4. **Topshiriqlar:** yaratish, ro'yxat (filtr, saralash, sahifalash), karta, `deadline.ts` va qizil ko'rinish.
5. **Ijro oqimi:** holatlar, topshirish/qabul/qaytarish, izohlar, tarix, bildirishnomalar.
6. **Fayllar:** storage adapter, yuklash/yuklab olish, huquq tekshiruvi.
7. **Dashboard va hisobotlar:** rolga qarab, Excel eksport.
8. **Admin nazorat:** barcha topshiriqlar, soft-delete, audit jurnali sahifasi.
9. **Sifat:** unit testlar (`permissions`, `deadline` — Vitest), mobil moslashuv, bo'sh holatlar, yuklanish holatlari, xato sahifalari.
10. **Deploy:** Vercel + Neon + Vercel Blob; `Dockerfile` va `docker-compose.yml` (app + postgres + minio + nginx) tayyor holda.

---

## 13. O'z serverga ko'chirish
1. `pg_dump` (Neon) → `pg_restore` (o'z Postgres).
2. Fayllar: Vercel Blob'dan MinIO'ga ko'chirish skripti `scripts/migrate-blob-to-s3.ts` (`storageKey` o'zgarmaydi).
3. `.env`: `STORAGE_DRIVER=s3`, yangi `DATABASE_URL`.
4. `docker compose up -d`, Nginx + Let's Encrypt SSL.
5. Kundalik zaxira: `pg_dump` cron + MinIO bucket nusxasi.

Kod o'zgarmaydi, faqat `.env` almashtiriladi.

---

## 14. Qabul mezonlari
- [ ] Ro'yxatdan o'tish sahifasi yo'q, faqat admin yaratgan hisob bilan kirish mumkin
- [ ] EXECUTOR boshqaning topshirig'ini URL orqali ham ocha olmaydi (403)
- [ ] MANAGER boshqa bo'lim xodimiga topshiriq bera olmaydi
- [ ] Deadline o'tgan va bajarilmagan topshiriq barcha ro'yxatlarda qizil va tepada
- [ ] Kechikib bajarilgan topshiriq "Kechikib bajarilgan" bo'lib qoladi
- [ ] Har bir holat/deadline o'zgarishi tarixda ko'rinadi
- [ ] Admin barcha topshiriq va harakatlarni ko'radi
- [ ] Fayl faqat huquqi borlarga yuklab olinadi
- [ ] Excel hisobot to'g'ri raqamlar bilan eksport qilinadi
- [ ] `STORAGE_DRIVER` almashtirilsa tizim o'z serverda ishlaydi
