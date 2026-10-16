"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, StatusBanner } from "@/components";
import type { RuleStatus } from "@/lib/curation/shared";

const LINK =
  "flex min-h-12 items-center justify-center rounded-2xl border-2 border-cyan-800 bg-white px-4 font-bold text-cyan-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900";

/** K6: tindakan untuk garis versi ini: lanjutkan draf, buka tinjauan, atau buat versi baru. */
export function HistoryActionsClient({
  ruleKey,
  open,
  canCreateVersion,
}: {
  ruleKey: string;
  open: { id: string; status: RuleStatus; isMine: boolean; version: number } | null;
  canCreateVersion: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function newVersion() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/kurator/garis/${ruleKey}/versi-baru`, { method: "POST" });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; id?: string; message?: string } | null;
      if (!res.ok || !data?.ok || !data.id) {
        setMsg(data?.message || "Gagal membuat versi baru. Coba lagi.");
        setBusy(false);
        return;
      }
      router.push(`/kurator/editor/${data.id}`);
    } catch {
      setMsg("Terjadi kesalahan jaringan. Coba lagi.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {open?.status === "draft" && open.isMine && (
        <Link href={`/kurator/editor/${open.id}`} className={LINK}>
          Lanjutkan Draft Versi {open.version}
        </Link>
      )}
      {open?.status === "draft" && !open.isMine && (
        <p className="max-w-none rounded-2xl border-2 border-cyan-800 bg-white p-4 text-sm text-main">
          Ada draft versi {open.version} milik kurator lain.
        </p>
      )}
      {open?.status === "in_review" && (
        <Link href={`/kurator/tinjau/${open.id}`} className={LINK}>
          Buka Tinjauan Versi {open.version}
        </Link>
      )}
      {canCreateVersion && (
        <Button
          variant="secondary"
          isLoading={busy}
          onClick={() => void newVersion()}
          className="w-full rounded-2xl! border-2! border-cyan-800! bg-white!"
        >
          Buat Versi Baru
        </Button>
      )}
      {msg && <StatusBanner variant="error" title="Gagal" message={msg} />}
    </div>
  );
}
