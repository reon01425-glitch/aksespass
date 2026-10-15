"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, StatusBanner, TextField } from "@/components";
import { STAFF_NAME_MAX_LENGTH, STAFF_UNIT_MAX_LENGTH } from "@/lib/staff/limits";

const DRAFT_KEY = "aksespass:admin-staff-draft:v1";

interface Props {
  mode: "tambah" | "ubah";
  userId?: string;
  initial?: { name: string; unit: string; phoneMasked: string };
}

/** A5: formulir tambah/ubah petugas. Draft tambah tersimpan di perangkat ini sampai dikirim. */
export function StaffFormClient({ mode, userId, initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [unit, setUnit] = useState(initial?.unit ?? "");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [draftNote, setDraftNote] = useState(false);

  useEffect(() => {
    if (mode !== "tambah") return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw) as { name?: string; unit?: string; phone?: string };
        /* eslint-disable react-hooks/set-state-in-effect */
        setName(d.name ?? "");
        setUnit(d.unit ?? "");
        setPhone(d.phone ?? "");
        setDraftNote(Boolean(d.name || d.unit || d.phone));
        /* eslint-enable react-hooks/set-state-in-effect */
      }
    } catch {
      // penyimpanan peramban tidak tersedia: abaikan
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== "tambah") return;
    try {
      if (name || unit || phone) {
        localStorage.setItem(DRAFT_KEY, JSON.stringify({ name, unit, phone }));
      }
    } catch {
      // abaikan
    }
  }, [mode, name, unit, phone]);

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // abaikan
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(mode === "tambah" ? "/api/admin/petugas" : `/api/admin/petugas/${userId}`, {
        method: mode === "tambah" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "tambah" ? { name, unit, phone } : { name, unit }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.message || "Gagal menyimpan. Coba lagi.");
        return;
      }
      clearDraft();
      // Muat ulang penuh agar daftar tidak memakai cache navigasi lama.
      window.location.assign("/admin/petugas");
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
      {draftNote && (
        <p role="status" className="text-sm text-secondary">
          Draft yang belum dikirim dipulihkan dari perangkat ini.
        </p>
      )}
      {error && <StatusBanner variant="error" title="Perlu perhatian" message={error} />}

      <TextField
        id="petugas-nama"
        label="Nama petugas"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={STAFF_NAME_MAX_LENGTH}
        autoComplete="off"
        required
      />
      <div className="flex flex-col gap-1">
        <span className="text-base font-bold text-main">Peran</span>
        <span className="text-base text-secondary">Petugas</span>
      </div>
      <TextField
        id="petugas-unit"
        label="Unit"
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        maxLength={STAFF_UNIT_MAX_LENGTH}
        helperText="Contoh: Poli Umum"
        autoComplete="off"
        required
      />
      {mode === "tambah" ? (
        <TextField
          id="petugas-hp"
          label="Nomor HP"
          variant="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          helperText="Petugas masuk dengan nomor ini (nomor HP + kode). Contoh: 0812 3456 7890"
          required
        />
      ) : (
        <div className="flex flex-col gap-1">
          <span className="text-base font-bold text-main">Nomor HP</span>
          <span className="text-base text-secondary">{initial?.phoneMasked}</span>
          <span className="text-sm text-secondary">
            Nomor tidak dapat diubah. Untuk mengganti nomor, nonaktifkan petugas lalu daftarkan ulang.
          </span>
        </div>
      )}

      <div className="flex flex-col gap-3 pt-2">
        <Button type="submit" isLoading={sending} className="w-full">
          {mode === "tambah" ? "Daftarkan Petugas" : "Simpan Perubahan"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={sending}
          className="w-full"
          onClick={() => {
            if (mode === "tambah") clearDraft();
            router.push("/admin/petugas");
          }}
        >
          Batal
        </Button>
      </div>
    </form>
  );
}
