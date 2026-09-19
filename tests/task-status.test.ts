import { describe, expect, it } from "vitest";
import { computeTaskStatus } from "@/lib/task-status";

describe("computeTaskStatus (§4)", () => {
  it("ijrochi yo'q → NEW", () => {
    expect(computeTaskStatus([])).toBe("NEW");
  });

  it("barcha ijrochilar DONE bo'lsagina DONE", () => {
    expect(computeTaskStatus(["DONE"])).toBe("DONE");
    expect(computeTaskStatus(["DONE", "DONE"])).toBe("DONE");
    expect(computeTaskStatus(["DONE", "SUBMITTED"])).not.toBe("DONE");
    expect(computeTaskStatus(["DONE", "IN_PROGRESS"])).not.toBe("DONE");
  });

  it("bitta ijrochi bo'lsa uning holatini aks ettiradi", () => {
    for (const s of ["NEW", "IN_PROGRESS", "SUBMITTED", "RETURNED", "DONE"] as const) {
      expect(computeTaskStatus([s])).toBe(s);
    }
  });

  it("eng 'oldinda' turgan holat umumiy holatni belgilaydi", () => {
    expect(computeTaskStatus(["NEW", "SUBMITTED"])).toBe("SUBMITTED");
    expect(computeTaskStatus(["IN_PROGRESS", "RETURNED"])).toBe("RETURNED");
    expect(computeTaskStatus(["NEW", "IN_PROGRESS"])).toBe("IN_PROGRESS");
    expect(computeTaskStatus(["DONE", "NEW"])).toBe("IN_PROGRESS");
    expect(computeTaskStatus(["NEW", "NEW"])).toBe("NEW");
  });
});
