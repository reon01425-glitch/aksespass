"use client";

import { useState } from "react";
import Link from "next/link";
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

export interface CompanionKonfirmasiClientProps {
  linkId: string;
  patientName: string;
  visitId: string;
  facilityName: string;
  recordedAt: string;
  assistance: AssistanceItem[];
  unmetChoices: UnmetChoice[];
  currentAnswer: CurrentAnswer | null;
  isPatientConfirmed: boolean;
  backHref?: string;
}

function formatRecordedDate(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(iso));
}

export function CompanionKonfirmasiClient({
  linkId,
  patientName,
  visitId,
  facilityName,
  recordedAt,
  assistance,
  unmetChoices,
  currentAnswer,
  isPatientConfirmed,
  backHref = "/pendamping",
}: CompanionKonfirmasiClientProps) {
  const [value, setValue] = useState<CareProofValue | undefined>(
    currentAnswer?.status
  );
  const [unmetSelected, setUnmetSelected] = useState<Set<string>>(
    new Set(currentAnswer?.unmetNeedCodes || [])
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    if (!value || isSubmitting || isPatientConfirmed) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/pendamping/tautan/${encodeURIComponent(linkId)}/konfirmasi/${encodeURIComponent(visitId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: value,
            unmetNeedCodes: value === "terpenuhi" ? [] : Array.from(unmetSelected),
          }),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        if (res.status === 409 || data.code === "PATIENT_ALREADY_CONFIRMED") {
          setError(
            "Pasien telah menjawab konfirmasi ini terlebih dahulu. Jawaban pasien tidak dapat diubah oleh pendamping."
          );
        } else {
          setError(data.error || "Gagal menyimpan jawaban. Coba lagi.");
        }
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("Gagal menyimpan konfirmasi. Periksa koneksi internet Anda.");
      setIsSubmitting(false);
    }
  }

  return (
    <PageShell
      title={`Konfirmasi: ${patientName}`}
      backHref={backHref}
      backLabel="Kembali"
    >
      <div className="flex flex-col gap-5 max-w-full w-full">
        {/* Info Penanda Pendamping */}
        <div className="flex flex-col gap-1 rounded-2xl border-2 border-cyan-800 bg-white p-4 shadow-sm">
          <span className="text-xs text-secondary">
            Dijawab oleh pendamping, atas nama <strong className="text-main">{patientName}</strong>
          </span>
          <p className="break-words text-lg font-bold text-main">{facilityName}</p>
          <p className="text-sm text-secondary">{formatRecordedDate(recordedAt)}</p>
        </div>

        {/* Pemberitahuan bila Pasien sudah menjawab (read-only) */}
        {isPatientConfirmed && (
          <StatusBanner
            variant="warning"
            title="Terkunci: Pasien Sudah Menjawab"
            message={`Pasien (${patientName}) telah menjawab konfirmasi kunjungan ini. Sesuai aturan AKSESPASS, jawaban pasien adalah otoritas tertinggi dan tidak dapat diubah oleh pendamping.`}
          />
        )}

        {/* Notifikasi sukses */}
        {success && (
          <div className="flex flex-col gap-3">
            <StatusBanner
              variant="success"
              title="Konfirmasi Tersimpan"
              message={`Konfirmasi CareProof atas nama ${patientName} berhasil dikirim dengan penanda “Dijawab oleh pendamping”.`}
            />
            <div>
              <Link
                href="/pendamping"
                className="inline-flex items-center justify-center min-h-12 py-2.5 px-6 bg-cyan-700 text-white font-bold rounded-lg shadow-sm hover:bg-cyan-800 focus:ring-4 focus:ring-cyan-900 focus:ring-offset-2 text-center"
              >
                Kembali ke Beranda Pendamping
              </Link>
            </div>
          </div>
        )}

        {error && (
          <StatusBanner variant="error" title="Gagal Menyimpan" message={error} />
        )}

        {assistance.length > 0 && !success && (
          <section aria-labelledby="heading-bantuan" className="flex flex-col gap-3">
            <h2
              id="heading-bantuan"
              className="text-lg font-bold text-main"
            >
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

        {!success && (
          <>
            <CareProofScale
              name="careproof-companion"
              legend={`Apakah kebutuhan ${patientName} terpenuhi?`}
              value={value}
              onChange={(val) => {
                if (isPatientConfirmed) return;
                setValue(val);
                if (val === "terpenuhi") {
                  setUnmetSelected(new Set());
                }
              }}
              disabled={isPatientConfirmed || isSubmitting}
            />

            {(value === "sebagian" || value === "belum") && unmetChoices.length > 0 && (
              <div className="flex flex-col gap-3 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm">
              <ChoiceGroup
                legend="Kebutuhan yang Belum Terpenuhi"
                helperText="Pilih kebutuhan pasien pada kunjungan ini yang belum terpenuhi."
              >
                {unmetChoices.map((choice) => {
                  const isUnmet = unmetSelected.has(choice.code);
                  return (
                    <ChoiceChip
                      key={choice.code}
                      id={`companion-unmet-${choice.code}`}
                      name="companion-unmet-needs"
                      label={choice.label}
                      icon={getNeedSummaryIcon(choice.iconName)}
                      checked={isUnmet}
                      disabled={isPatientConfirmed || isSubmitting}
                      onChange={() => {
                        if (isPatientConfirmed) return;
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
              </div>
            )}

            {!isPatientConfirmed && (
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={!value || isSubmitting}
                aria-busy={isSubmitting ? "true" : undefined}
                className="w-full text-base min-h-12"
              >
                {isSubmitting ? "Menyimpan..." : "Kirim Konfirmasi Pendamping"}
              </Button>
            )}
          </>
        )}
      </div>
    </PageShell>
  );
}
