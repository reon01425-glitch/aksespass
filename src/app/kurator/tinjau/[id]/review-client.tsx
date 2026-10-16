"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, RadioList, StatusBanner, TextField } from "@/components";
import { RULE_NOTE_MAX_LENGTH, type RuleStatus } from "@/lib/curation/shared";

const BOX = "max-w-none rounded-2xl border-2 border-cyan-800 bg-white p-4 text-sm text-main";

/** K5: formulir suara. Setuju atau minta revisi dengan alasan. */
export function ReviewClient({
  ruleId,
  status,
  isMine,
  iVoted,
  ruleKey,
}: {
  ruleId: string;
  status: RuleStatus;
  isMine: boolean;
  iVoted: boolean;
  ruleKey: string;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState<"approve" | "revise" | "">("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (status !== "in_review") {
    return (
      <div className="flex flex-col gap-3">
        <p className={BOX}>Aturan ini tidak sedang dalam tinjauan.</p>
        <Link
          href={`/kurator/riwayat/${ruleKey}`}
          className="flex min-h-12 items-center justify-center rounded-2xl border-2 border-cyan-800 bg-white px-4 font-bold text-cyan-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
        >
          Lihat Riwayat
        </Link>
      </div>
    );
  }
  if (isMine) {
    return <p className={BOX}>Anda penulis aturan ini, jadi tidak dapat meninjaunya. Tunggu dua kurator lain.</p>;
  }
  if (iVoted) {
    return <p className={BOX}>Anda sudah memberi suara pada putaran ini.</p>;
  }

  async function submit() {
    if (!decision) {
      setMsg("Pilih setuju atau minta revisi.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/kurator/aturan/${ruleId}/tinjau`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, note }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string; outcome?: string } | null;
      if (!res.ok || !data?.ok) {
        setMsg(data?.message || "Gagal menyimpan suara. Coba lagi.");
        setBusy(false);
        return;
      }
      if (data.outcome === "published") router.push("/kurator?info=terbit");
      else if (data.outcome === "revision_requested") router.push("/kurator/tinjau?info=revisi");
      else router.replace(`/kurator/tinjau/${ruleId}?info=suara`);
      setBusy(false);
    } catch {
      setMsg("Terjadi kesalahan jaringan. Coba lagi.");
      setBusy(false);
    }
  }

  return (
    <section aria-label="Beri suara" className="flex flex-col gap-4 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm">
      <RadioList
        name="keputusan"
        legend="Keputusan Anda"
        value={decision}
        onChange={(v) => setDecision(v as "approve" | "revise")}
        disabled={busy}
        options={[
          { value: "approve", label: "Setuju", description: "Aturan terbit setelah dua kurator berbeda setuju." },
          { value: "revise", label: "Minta revisi", description: "Aturan kembali ke draft penulis dengan alasan Anda." },
        ]}
      />
      <TextField
        id="catatan-suara"
        label={decision === "revise" ? "Alasan revisi (wajib)" : "Catatan (opsional)"}
        variant="textarea"
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={RULE_NOTE_MAX_LENGTH}
        disabled={busy}
      />
      {msg && <StatusBanner variant="error" title="Belum bisa disimpan" message={msg} />}
      <Button isLoading={busy} onClick={() => void submit()} className="w-full">
        Kirim Suara
      </Button>
    </section>
  );
}
