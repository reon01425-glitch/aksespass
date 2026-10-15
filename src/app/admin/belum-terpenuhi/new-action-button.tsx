"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, StatusBanner } from "@/components";

export function NewActionButton({ category, categoryLabel }: { category: string; categoryLabel: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/tindak-lanjut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        router.push(`/admin/tindak-lanjut?baru=${encodeURIComponent(data.id)}`);
        return;
      }
      if (res.status === 409) {
        router.push("/admin/tindak-lanjut");
        return;
      }
      setError(data?.message || "Gagal membuat tindak lanjut. Coba lagi.");
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {error && <StatusBanner variant="error" title="Perlu perhatian" message={error} />}
      <Button
        variant="secondary"
        isLoading={busy}
        onClick={() => void create()}
        aria-label={`Buat Tindak Lanjut untuk ${categoryLabel}`}
        className="w-full px-2 text-sm"
      >
        Buat Tindak Lanjut
      </Button>
    </div>
  );
}
