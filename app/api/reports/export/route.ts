import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { getSessionUser } from "@/lib/current-user";
import { canViewReports } from "@/lib/permissions";
import {
  classifyRow,
  groupSummaries,
  loadDirectory,
  loadMetricRows,
  parsePeriod,
  rankByDiscipline,
  summarize,
  type GroupBy,
  type RowOutcome,
} from "@/lib/metrics";
import { STATUS_LABELS } from "@/lib/labels";
import { formatDateTime } from "@/lib/format";

export const runtime = "nodejs";

const GROUP_LABELS: Record<GroupBy, string> = {
  employee: "Xodim",
  department: "Bo'lim",
  organization: "Tashkilot",
};

const OUTCOME_LABELS: Record<RowOutcome, string> = {
  ON_TIME: "O'z vaqtida bajarilgan",
  LATE: "Kechikib bajarilgan",
  OVERDUE_OPEN: "Muddati o'tgan",
  OPEN: "Jarayonda",
};

const RED_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
const RED_FONT: Partial<ExcelJS.Font> = { color: { argb: "FFB91C1C" }, bold: true };
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE5E7EB" } };

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true };
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.border = { bottom: { style: "thin" } };
  });
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Tizimga kiring" }, { status: 401 });
  if (!canViewReports(user)) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });

  const sp = request.nextUrl.searchParams;
  const byParam = sp.get("by");
  const by: GroupBy =
    byParam === "employee" || byParam === "department" || byParam === "organization" ? byParam : "department";
  const period = parsePeriod(sp.get("from") ?? undefined, sp.get("to") ?? undefined);
  const now = new Date();

  const [rows, directory] = await Promise.all([loadMetricRows(user, period), loadDirectory()]);
  const total = summarize(rows, now);
  const groups = rankByDiscipline(groupSummaries(rows, by, directory, now));

  const wb = new ExcelJS.Workbook();
  wb.creator = "Ijro nazorati";

  // 1-varaq: xulosa
  const summarySheet = wb.addWorksheet("Xulosa");
  summarySheet.addRow(["Ijro nazorati — hisobot"]).font = { bold: true, size: 14 };
  summarySheet.addRow([
    `Davr (berilgan sana): ${sp.get("from") || "boshidan"} — ${sp.get("to") || "hozirgacha"}`,
  ]);
  summarySheet.addRow([`Kesim: ${GROUP_LABELS[by]}`]);
  summarySheet.addRow([`Shakllantirilgan: ${formatDateTime(now)}`]);
  summarySheet.addRow([]);

  styleHeader(
    summarySheet.addRow([GROUP_LABELS[by], "Berilgan", "Bajarilgan", "O'z vaqtida", "Kechikib", "Muddati o'tgan (ochiq)", "Ijro intizomi"])
  );

  const addSummaryRow = (label: string, s: (typeof groups)[number]["summary"], bold = false) => {
    const row = summarySheet.addRow([
      label,
      s.assigned,
      s.done,
      s.onTime,
      s.late,
      s.overdueOpen,
      s.discipline === null ? "—" : s.discipline / 100,
    ]);
    if (bold) row.font = { bold: true };
    if (s.discipline !== null) row.getCell(7).numFmt = "0%";
    if (s.overdueOpen > 0) {
      const cell = row.getCell(6);
      cell.fill = RED_FILL;
      cell.font = RED_FONT;
    }
  };
  for (const g of groups) addSummaryRow(g.label, g.summary);
  addSummaryRow("JAMI", total, true);

  summarySheet.addRow([]);
  summarySheet.addRow([
    "Ijro intizomi = o'z vaqtida bajarilgan / (bajarilgan + muddati o'tgan ochiq). Hisob har bir ijrochi bo'yicha alohida yuritiladi.",
  ]).font = { italic: true };
  summarySheet.columns = [{ width: 42 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 24 }, { width: 14 }];

  // 2-varaq: batafsil (muddati o'tganlar qizil fon bilan)
  const detailSheet = wb.addWorksheet("Topshiriqlar");
  styleHeader(
    detailSheet.addRow(["№", "Sarlavha", "Ijrochi", "Bo'lim", "Muddat", "Holat", "Topshirilgan vaqt", "Natija"])
  );
  const sorted = [...rows].sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
  for (const r of sorted) {
    const outcome = classifyRow(r, now);
    const row = detailSheet.addRow([
      `T-${String(r.taskNumber).padStart(6, "0")}`,
      r.taskTitle,
      r.userName,
      r.departmentId ? (directory.departments.get(r.departmentId) ?? "") : "",
      formatDateTime(r.deadline),
      STATUS_LABELS[r.status],
      r.submittedAt ? formatDateTime(r.submittedAt) : "",
      OUTCOME_LABELS[outcome],
    ]);
    if (outcome === "OVERDUE_OPEN") {
      row.eachCell((cell) => {
        cell.fill = RED_FILL;
        cell.font = RED_FONT;
      });
    }
  }
  detailSheet.columns = [
    { width: 12 },
    { width: 50 },
    { width: 24 },
    { width: 26 },
    { width: 22 },
    { width: 16 },
    { width: 22 },
    { width: 26 },
  ];

  const buffer = await wb.xlsx.writeBuffer();
  const stamp = now.toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="hisobot-${stamp}.xlsx"`,
    },
  });
}
