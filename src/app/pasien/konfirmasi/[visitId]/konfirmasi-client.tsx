"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  CareProofScale,
  ChoiceChip,
  ChoiceGroup,
  PageShell,
  StatusBanner,
  type CareProofValue,
} from "@/components";
import { getNeedSummaryIcon } from "@/components/patient-needs-summary";

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
      const query = new URLSearchParams({ status: value });
      if (unmetParam) query.set("unmet", unmetParam);
      router.push(`/pasien/konfirmasi/selesai?${query.toString()}`);
    } catch {
      setError("Gagal menyimpan jawaban. Periksa koneksi internet Anda.");
      setIsSubmitting(false);
    }
  }

  return (
    <PageShell title="Konfirmasi Kebutuhan" backHref="/pasien/konfirmasi">
      <div className="flex flex-col gap-6 max-w-full w-full">
        <div className="flex flex-col gap-1">
          <p className="text-lg font-bold text-main break-words">{facilityName}</p>
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
            <h2 id="heading-bantuan" className="text-base font-bold text-main border-b border-cyan-100 pb-2">
              Bantuan yang Dicatat Petugas
            </h2>
            <ul className="flex flex-col gap-2">
              {assistance.map((item) => (
                <li
                  key={item.ruleId}
                  className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-cyan-100"
                >
                  {getNeedSummaryIcon(item.iconName)}
                  <span className="text-base text-main break-words">{item.actionText}</span>
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
