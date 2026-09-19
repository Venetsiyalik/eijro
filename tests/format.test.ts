import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateTime,
  getTashkentRanges,
  parseTashkentLocal,
  toTashkentInputValue,
} from "@/lib/format";

describe("Toshkent vaqti (UTC+5, server zonasidan mustaqil)", () => {
  it("datetime-local qiymati Toshkent devor vaqti sifatida o'qiladi", () => {
    expect(parseTashkentLocal("2026-09-25T10:00").toISOString()).toBe("2026-09-25T05:00:00.000Z");
    expect(parseTashkentLocal("2026-01-01T00:30").toISOString()).toBe("2025-12-31T19:30:00.000Z");
  });

  it("parse va qayta formatlash bir-birining teskarisi", () => {
    for (const v of ["2026-09-25T10:00", "2026-12-31T23:59", "2026-03-01T00:00"]) {
      expect(toTashkentInputValue(parseTashkentLocal(v))).toBe(v);
    }
  });

  it("ko'rsatish o'zbekcha va Toshkent vaqti bo'yicha", () => {
    const d = new Date("2026-09-17T10:19:00.000Z");
    expect(formatDateTime(d)).toBe("17 Sentabr 2026, 15:19");
    expect(formatDate(d)).toBe("17 Sentabr 2026");
  });

  it("yarim tundan keyingi UTC vaqti Toshkentda keyingi kunga o'tadi", () => {
    expect(formatDate(new Date("2026-09-17T20:00:00.000Z"))).toBe("18 Sentabr 2026");
  });

  it("'bugun' va 'shu hafta' chegaralari (hafta dushanbadan boshlanadi)", () => {
    // 2026-09-19 — shanba
    const { endOfToday, endOfWeek } = getTashkentRanges(new Date("2026-09-19T10:00:00.000Z"));
    expect(endOfToday.toISOString()).toBe("2026-09-19T18:59:59.999Z"); // 23:59:59 Toshkent
    expect(endOfWeek.toISOString()).toBe("2026-09-20T18:59:59.999Z"); // yakshanba 23:59:59
  });
});
