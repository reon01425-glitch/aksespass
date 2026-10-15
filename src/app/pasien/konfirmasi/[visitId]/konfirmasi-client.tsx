"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Button,
  CareProofScale,
  ChoiceChip,
  ChoiceGroup,
  PageShell,
  PendingConfirmationSync,
  StatusBanner,
  type CareProofValue,
} from "@/components";
import { getNeedSummaryIcon } from "@/components/patient-needs-summary";
import { enqueueConfirmation } from "@/lib/careproof/offline-queue";

interface AssistanceItem {
  ruleId: string;
  actionText: string;
  iconName: string;
}

interface UnmetChoice {
  code: string;
  label: string;
  iconName: string;
}

interface CurrentAnswer {
  status: CareProofValue;
  confirmedBy: "patient" | "companion" | "on_site";
  unmetNeedCodes: string[];
}

export interface KonfirmasiClientProps {
  visitId: string;
  facilityName: string;
  recordedAt: string;
  assistance: AssistanceItem[];
  unmetChoices: UnmetChoice[];
  currentAnswer: CurrentAnswer | null;
  userId: string;
}

const BY_LABEL: Record<string, string> = {
  companion: "pendamping",
  on_site: "di tempat",
};

function formatRecordedDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export function KonfirmasiClient({
  visitId,
  facilityName,
  recordedAt,
  assistance,
  unmetChoices,
  currentAnswer,
  userId,
}: KonfirmasiClientProps) {
  const router = useRouter();
  const [value, setValue] = useState<CareProofValue | undefined>(
    currentAnswer?.status
  );
  const [unmetSelected, setUnmetSelected] = useState<Set<string>>(
    new Set(currentAnswer?.unmetNeedCodes || [])
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queuedOffline, setQueuedOffline] = useState(false);

  const previousAnswerByLabel =
    currentAnswer && currentAnswer.confirmedBy !== "patient"
      ? BY_LABEL[currentAnswer.confirmedBy]
      : null;

  async function handleSubmit() {
    if (!value || isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/pasien/kunjungan/konfirmasi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitId,
          status: value,
          unmetNeedCodes: value === "terpenuhi" ? [] : Array.from(unmetSelected),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.message || "Gagal menyimpan jawaban. Coba lagi.");
        setIsSubmitting(false);
        return;
      }

      const unmetParam =
        value === "terpenuhi" ? "" : Array.from(unmetSelected).join(",");
      const query = new URLSearchParams({ status: value, visit: visitId });
      if (unmetParam) query.set("unmet", unmetParam);
      router.push(`/pasien/konfirmasi/selesai?${query.toString()}`);
    } catch {
      // Offline atau jaringan putus: simpan ke antrean lokal, kirim otomatis saat online.
      const queued = enqueueConfirmation(userId, {
        visitId,
        status: value,
        unmetNeedCodes: value === "terpenuhi" ? [] : Array.from(unmetSelected),
      });
      if (queued) {
        // Halaman berikutnya dirender di server dan tidak bisa dibuka saat offline,
        // jadi status antrean ditampilkan di sini tanpa berpindah halaman.
        setQueuedOffline(true);
        setIsSubmitting(false);
        return;
      }
      setError("Gagal menyimpan jawaban. Periksa koneksi internet Anda.");
      setIsSubmitting(false);
    }
  }

  if (queuedOffline) {
    return (
      <PageShell title="Konfirmasi Kebutuhan">
        <div className="flex flex-col gap-6 max-w-full w-full">
          <p className="text-base text-main">
            Anda sedang offline. Jawaban disimpan di perangkat ini dan terkirim
            otomatis saat Anda online. Tetap buka aplikasi atau kembali nanti.
          </p>
          <PendingConfirmationSync userId={userId} />
          <Link
            href="/pasien/tindak-lanjut"
            className="text-base font-bold text-cyan-900 underline focus:ring-4 focus:ring-cyan-900 rounded"
          >
            Lihat status tindak lanjut (saat online)
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Konfirmasi Kebutuhan" backHref="/pasien/konfirmasi">
      <div className="flex w-full max-w-full flex-col gap-5 pb-24">
        <div className="flex flex-col gap-1 rounded-2xl border-2 border-cyan-800 bg-white p-4 shadow-sm">
          <p className="break-words text-lg font-bold text-main">{facilityName}</p>
          <p className="text-sm text-secondary">{formatRecordedDate(recordedAt)}</p>
        </div>

        {previousAnswerByLabel && (
          <StatusBanner
            variant="warning"
            title="Sudah Dijawab Sebelumnya"
            message={`Jawaban ini sudah dijawab oleh ${previousAnswerByLabel}. Jawaban Anda menggantikan jawaban pendamping/di tempat.`}
          />
        )}

        {assistance.length > 0 && (
          <section aria-labelledby="heading-bantuan" className="flex flex-col gap-3">
            <h2 id="heading-bantuan" className="text-lg font-bold text-main">
              Bantuan yang Dicatat Petugas
            </h2>
            <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 [&>*:last-child:nth-child(odd)]:col-span-2">
              {assistance.map((item) => (
                <li
                  key={item.ruleId}
                  className="flex min-w-0 flex-col items-start gap-2 rounded-2xl border border-cyan-800 bg-white p-3 shadow-sm"
                >
                  <span
                    aria-hidden="true"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-100"
                  >
                    {getNeedSummaryIcon(item.iconName)}
                  </span>
                  <span className="min-w-0 break-words text-base leading-6 text-main">
                    {item.actionText}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {error && (
          <StatusBanner variant="error" title="Gagal Menyimpan" message={error} />
        )}

        <CareProofScale
          name="careproof-pasien"
          legend="Apakah kebutuhan Anda terpenuhi?"
          value={value}
          onChange={(val) => {
            setValue(val);
            if (val === "terpenuhi") {
              setUnmetSelected(new Set());
            }
          }}
          disabled={isSubmitting}
        />

        {(value === "sebagian" || value === "belum") && unmetChoices.length > 0 && (
          <ChoiceGroup
            legend="Kebutuhan yang Belum Terpenuhi"
            helperText="Pilih kebutuhan pada kunjungan ini yang belum terpenuhi."
          >
            {unmetChoices.map((choice) => {
              const isUnmet = unmetSelected.has(choice.code);
              return (
                <ChoiceChip
                  key={choice.code}
                  id={`unmet-${choice.code}`}
                  name="unmet-needs"
                  label={choice.label}
                  icon={getNeedSummaryIcon(choice.iconName)}
                  checked={isUnmet}
                  disabled={isSubmitting}
                  onChange={() => {
                    setUnmetSelected((prev) => {
                      const next = new Set(prev);
                      if (next.has(choice.code)) {
                        next.delete(choice.code);
                      } else {
                        next.add(choice.code);
                      }
                      return next;
                    });
                  }}
                  className="w-full"
                />
              );
            })}
          </ChoiceGroup>
        )}

        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={!value || isSubmitting}
          aria-busy={isSubmitting ? "true" : undefined}
          className="w-full text-base"
        >
          {isSubmitting ? "Menyimpan..." : "Kirim"}
        </Button>
      </div>
    </PageShell>
  );
}
