"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, RadioList, StatusBanner, TextField } from "@/components";
import {
  FACILITY_ACTION_NOTE_MAX_LENGTH,
  FACILITY_ACTION_STATUS_LABELS,
  type FacilityActionItem,
  type FacilityActionStatus,
} from "@/lib/facility-actions/shared";

function fmt(iso: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" }).format(new Date(iso));
}

function ActionCard({
  item,
  onSaved,
  highlighted,
}: {
  item: FacilityActionItem;
  onSaved: (i: FacilityActionItem) => void;
  highlighted: boolean;
}) {
  const [status, setStatus] = useState<FacilityActionStatus>(item.status);
  const [note, setNote] = useState(item.stepNote);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const save = async (nextStatus: FacilityActionStatus) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/tindak-lanjut/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, stepNote: note }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setMsg({ ok: false, text: data?.message || "Gagal menyimpan. Coba lagi." });
        return;
      }
      setStatus(data.item.status);
      onSaved(data.item as FacilityActionItem);
      setMsg({ ok: true, text: "Tersimpan. Pasien terkait melihat status ini di Tindak Lanjut mereka." });
    } catch {
      setMsg({ ok: false, text: "Terjadi kesalahan jaringan. Coba lagi." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <li
      data-testid="kartu-tindak-lanjut"
      className={`flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm ${
        highlighted ? "border-4 border-cyan-800" : "border border-cyan-800"
      }`}
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-bold text-main">{item.categoryLabel}</h2>
        <span className="text-sm font-bold text-main">
          Status: {FACILITY_ACTION_STATUS_LABELS[item.status]}
        </span>
        <span className="text-sm text-secondary">
          Dibuat {fmt(item.createdAt)} · Diperbarui {fmt(item.updatedAt)}
          {item.completedAt ? ` · Selesai ${fmt(item.completedAt)}` : ""}
        </span>
      </div>

      <RadioList
        name={`status-${item.id}`}
        legend="Ubah status"
        value={status}
        onChange={(v) => setStatus(v as FacilityActionStatus)}
        disabled={busy}
        options={(Object.keys(FACILITY_ACTION_STATUS_LABELS) as FacilityActionStatus[]).map((s) => ({
          value: s,
          label: FACILITY_ACTION_STATUS_LABELS[s],
        }))}
      />

      <TextField
        id={`catatan-${item.id}`}
        label="Langkah yang ditentukan"
        variant="textarea"
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={FACILITY_ACTION_NOTE_MAX_LENGTH}
        helperText="Dapat dibaca pasien terkait. Jangan menulis data pribadi."
      />

      {msg && (
        <StatusBanner
          variant={msg.ok ? "success" : "error"}
          title={msg.ok ? "Berhasil" : "Gagal"}
          message={msg.text}
        />
      )}

      <div className="flex flex-col gap-2">
        <Button isLoading={busy} onClick={() => void save(status)} className="w-full">
          Simpan
        </Button>
        {item.status !== "selesai" && (
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => void save("selesai")}
            className="w-full"
          >
            Tandai Selesai
          </Button>
        )}
      </div>
    </li>
  );
}

export function ActionListClient({
  initialItems,
  highlightId,
}: {
  initialItems: FacilityActionItem[];
  highlightId: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  return (
    <div className="flex flex-col gap-5">
      <p className="max-w-none rounded-2xl border-2 border-cyan-800 bg-white p-4 text-sm leading-6 text-secondary">
        Tentukan langkah dan ubah status. Pasien yang melaporkan kebutuhan di kategori yang sama
        melihat ringkasan umum ini tanpa data pribadi lain.
      </p>
      {items.length === 0 ? (
        <p role="status" className="max-w-none rounded-2xl border border-dashed border-cyan-800 bg-white p-6 text-center text-sm font-bold text-main">
          Belum ada tindak lanjut. Buat dari halaman Belum Terpenuhi.
        </p>
      ) : (
        <ul aria-label="Daftar tindak lanjut" className="m-0 flex list-none flex-col gap-3 p-0">
          {items.map((it) => (
            <ActionCard
              key={it.id}
              item={it}
              highlighted={it.id === highlightId}
              onSaved={(updated) =>
                setItems((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
              }
            />
          ))}
        </ul>
      )}
      <Link
        href="/admin"
        className="flex min-h-12 items-center justify-center rounded-lg border-2 border-cyan-700 bg-white px-4 py-2 text-base font-bold text-cyan-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
      >
        Kembali ke Beranda Admin
      </Link>
    </div>
  );
}
