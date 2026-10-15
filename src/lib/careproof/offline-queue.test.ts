import { describe, expect, it } from "vitest";
import {
  enqueueConfirmation,
  flushConfirmQueue,
  readConfirmQueue,
  confirmQueueKey,
} from "./offline-queue";

function memoryStorage() {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    raw: m,
  };
}

describe("antrean konfirmasi offline (P16)", () => {
  it("menyimpan per pengguna dan satu item per kunjungan", () => {
    const s = memoryStorage();
    enqueueConfirmation("u1", { visitId: "v1", status: "belum", unmetNeedCodes: ["a"] }, s);
    enqueueConfirmation("u1", { visitId: "v1", status: "sebagian", unmetNeedCodes: ["b"] }, s);
    enqueueConfirmation("u2", { visitId: "v9", status: "terpenuhi", unmetNeedCodes: ["x"] }, s);
    const q1 = readConfirmQueue("u1", s);
    expect(q1).toHaveLength(1);
    expect(q1[0].status).toBe("sebagian");
    expect(q1[0].unmetNeedCodes).toEqual(["b"]);
    expect(readConfirmQueue("u2", s)[0].unmetNeedCodes).toEqual([]);
  });

  it("tidak menyimpan catatan atau data lain selain kolom yang diizinkan", () => {
    const s = memoryStorage();
    enqueueConfirmation("u1", { visitId: "v1", status: "belum", unmetNeedCodes: ["a"] }, s);
    const keys = Object.keys(JSON.parse(s.raw.get(confirmQueueKey("u1"))!)[0]).sort();
    expect(keys).toEqual(["clientId", "queuedAt", "status", "unmetNeedCodes", "visitId"]);
  });

  it("mengabaikan data rusak", () => {
    const s = memoryStorage();
    s.setItem(confirmQueueKey("u1"), "{rusak");
    expect(readConfirmQueue("u1", s)).toEqual([]);
    s.setItem(confirmQueueKey("u1"), JSON.stringify([{ visitId: 1 }]));
    expect(readConfirmQueue("u1", s)).toEqual([]);
  });

  it("flush: synced dan dropped dihapus; retry berhenti dan menyisakan sisanya", async () => {
    const s = memoryStorage();
    for (const v of ["v1", "v2", "v3"]) {
      enqueueConfirmation("u1", { visitId: v, status: "belum", unmetNeedCodes: [] }, s);
    }
    const seen: string[] = [];
    const res = await flushConfirmQueue(
      "u1",
      async (it) => {
        seen.push(it.visitId);
        if (it.visitId === "v1") return "synced";
        if (it.visitId === "v2") return "dropped";
        return "retry";
      },
      s
    );
    expect(seen).toEqual(["v1", "v2", "v3"]);
    expect(res).toEqual({ synced: 1, dropped: 1, remaining: 1 });
    expect(readConfirmQueue("u1", s)[0].visitId).toBe("v3");
  });

  it("flush: send yang melempar galat diperlakukan sebagai retry tanpa kehilangan item", async () => {
    const s = memoryStorage();
    enqueueConfirmation("u1", { visitId: "v1", status: "belum", unmetNeedCodes: [] }, s);
    const res = await flushConfirmQueue("u1", async () => { throw new Error("offline"); }, s);
    expect(res).toEqual({ synced: 0, dropped: 0, remaining: 1 });
  });
});
