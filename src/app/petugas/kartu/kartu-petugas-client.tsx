"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import {
  Button,
  ChoiceChip,
  ChoiceGroup,
  PageShell,
  StatusBanner,
  TextField,
} from "@/components";
import { getNeedSummaryIcon } from "@/components/patient-needs-summary";
import { renderRuleIcon } from "@/components/petugas-pindai-flow";
import type { NeedsCategoryGroup } from "@/lib/passport";

interface Suggestion {
  id: string;
  actionText: string;
  iconName: string;
  source: string;
  version: number;
}

interface UncoveredNeed {
  code: string;
  label: string;
}

type Step = "isi" | "catat" | "selesai";

/**
 * [T4b] Pasien dengan kartu cetak: petugas mengetik Kode Kartu dan memilih kebutuhan yang
 * tertulis di kartu, lalu mencatat bantuan seperti T8. Tidak ada data profil yang dibaca.
 * Kunjungan masuk ke konfirmasi pasien (P16) sama seperti jalur ConsentQR.
 */
const CARD = "flex flex-col gap-3 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm";

export function KartuPetugasClient({ catalog }: { catalog: NeedsCategoryGroup[] }) {
  const [step, setStep] = useState<Step>("isi");
  const [cardCode, setCardCode] = useState("");
  const [needs, setNeeds] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [uncovered, setUncovered] = useState<UncoveredNeed[]>([]);
  const [selectedRules, setSelectedRules] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const clientIdRef = useRef<string>(crypto.randomUUID());
  const headingRef = useRef<HTMLHeadingElement>(null);

  const toggleNeed = (code: string) =>
    setNeeds((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });

  const handleSeeSuggestions = async () => {
    if (isLoading) return;
    setError(null);
    if (cardCode.replace(/[\s-]/g, "").length !== 8) {
      setFieldError("Kode Kartu terdiri dari 8 huruf dan angka.");
      return;
    }
    if (needs.size === 0) {
      setFieldError("Pilih minimal satu kebutuhan yang tertulis di kartu.");
      return;
    }
    setFieldError(null);
    setIsLoading(true);
    try {
      const res = await fetch("/api/petugas/saran", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ needCodes: Array.from(needs) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error("gagal");
      const list: Suggestion[] = data.suggestions || [];
      setSuggestions(list);
      setUncovered(data.uncoveredNeeds || []);
      setSelectedRules(new Set(list.map((s) => s.id)));
      setStep("catat");
      window.setTimeout(() => headingRef.current?.focus(), 50);
    } catch {
      setError("Tidak dapat memuat saran tindakan. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/petugas/kunjungan/kartu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardCode,
          needCodes: Array.from(needs),
          ruleIds: Array.from(selectedRules),
          note: note.trim() || null,
          clientId: clientIdRef.current,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setStep("selesai");
        window.setTimeout(() => headingRef.current?.focus(), 50);
        return;
      }
      if (res.status === 422) {
        setStep("isi");
        setFieldError(data?.message || "Kode kartu tidak dikenali. Periksa kode yang tertulis di kartu.");
        return;
      }
      setError(data?.message || "Tidak ada koneksi. Coba simpan lagi.");
    } catch {
      setError("Tidak ada koneksi. Coba simpan lagi.");
    } finally {
      setIsSaving(false);
    }
  };

  const resetForNext = () => {
    clientIdRef.current = crypto.randomUUID();
    setCardCode("");
    setNeeds(new Set());
    setSuggestions([]);
    setUncovered([]);
    setSelectedRules(new Set());
    setNote("");
    setError(null);
    setFieldError(null);
    setStep("isi");
  };

  if (step === "selesai") {
    return (
      <PageShell title="Kunjungan Tercatat" titleRef={headingRef} titleTabIndex={-1}>
        <div className="flex flex-col gap-3">
          <StatusBanner
            variant="success"
            title="Kunjungan dari kartu tercatat"
            message="Pasien akan diminta mengonfirmasi saat membuka aplikasinya. Status kunjungan tampil di beranda petugas."
          />
          <div className="flex flex-col gap-3">
            <Button variant="primary" onClick={resetForNext} className="w-full">
              Catat Pasien Kartu Lain
            </Button>
            <Link
              href="/petugas"
              className="flex min-h-12 w-full items-center justify-center rounded-2xl border border-cyan-800 bg-white px-4 py-3 font-bold text-cyan-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </PageShell>
    );
  }

  if (step === "catat") {
    return (
      <PageShell title="Catat Bantuan" titleRef={headingRef} titleTabIndex={-1}>
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border-2 border-cyan-800 bg-white p-4">
            <p className="text-sm font-bold text-main">
              Saran, bukan instruksi klinis. Keputusan tetap di tangan tenaga kesehatan.
            </p>
          </div>

          {error && <StatusBanner floating variant="error" title="Gagal Menyimpan" message={error} />}

          {uncovered.length > 0 && (
            <div className={CARD}>
              <span className="text-sm font-bold text-main">Belum ada saran untuk:</span>
              <ul className="flex list-inside list-disc flex-col gap-1 text-sm text-secondary">
                {uncovered.map((un) => (
                  <li key={un.code}>
                    <span className="font-bold text-main">{un.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className={CARD}>
          <ChoiceGroup
            legend="Bantuan yang Diberikan"
            helperText="Hapus centang bantuan yang tidak diberikan."
          >
            {suggestions.map((sug) => (
              <ChoiceChip
                key={sug.id}
                id={`kartu-rule-${sug.id}`}
                name="bantuan-diberikan-kartu"
                label={sug.actionText}
                icon={renderRuleIcon(sug.iconName)}
                checked={selectedRules.has(sug.id)}
                onChange={() =>
                  setSelectedRules((prev) => {
                    const next = new Set(prev);
                    if (next.has(sug.id)) next.delete(sug.id);
                    else next.add(sug.id);
                    return next;
                  })
                }
                className="w-full"
              />
            ))}
          </ChoiceGroup>
          </div>

          <div className={CARD}>
            <TextField
              id="kartu-staff-note"
              label="Catatan Petugas (Opsional)"
              variant="textarea"
              rows={3}
              maxLength={280}
              helperText="Jangan menulis diagnosis atau data sensitif."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-3">
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={isSaving}
              aria-busy={isSaving ? "true" : undefined}
              className="w-full text-base"
            >
              {isSaving ? "Menyimpan..." : "Simpan"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => setStep("isi")}
              disabled={isSaving}
              className="w-full"
            >
              Kembali ke Kartu
            </Button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      petugasNav
      title="Pasien dengan Kartu Cetak"
      backHref="/petugas"
      backLabel="Kembali ke beranda petugas"
      titleRef={headingRef}
      titleTabIndex={-1}
    >
      <div className="flex flex-col gap-5">
        <p className="max-w-none rounded-2xl border-2 border-cyan-800 bg-white p-4 text-sm leading-6 text-secondary">
          Untuk pasien yang menunjukkan kartu cetak. Ketik Kode Kartu dan pilih kebutuhan yang
          tertulis di kartu. Data profil pasien tidak dibuka.
        </p>

        {fieldError && (
          <StatusBanner floating variant="error" title="Periksa Isian" message={fieldError} />
        )}
        {error && <StatusBanner floating variant="error" title="Gagal" message={error} />}

        <div className={CARD}>
          <TextField
            id="kartu-kode"
            label="Kode Kartu (8 karakter)"
            value={cardCode}
            onChange={(e) => {
              setCardCode(e.target.value);
              setFieldError(null);
            }}
            maxLength={9}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            helperText="Huruf dan angka di bagian Kode Kartu pada kartu. Tanda hubung boleh diketik."
          />
        </div>

        {catalog.map((group) => (
          <div key={group.category} className={CARD}>
          <ChoiceGroup legend={group.categoryLabel}>
            {group.items.map((item) => (
              <ChoiceChip
                key={item.code}
                id={`kartu-need-${item.code}`}
                name="kebutuhan-kartu"
                label={item.label}
                icon={getNeedSummaryIcon(item.iconName)}
                checked={needs.has(item.code)}
                onChange={() => {
                  toggleNeed(item.code);
                  setFieldError(null);
                }}
                className="w-full"
              />
            ))}
          </ChoiceGroup>
          </div>
        ))}

        <div className="flex flex-col gap-3">
          <Button
            variant="primary"
            onClick={handleSeeSuggestions}
            isLoading={isLoading}
            className="w-full text-base"
          >
            Lihat Saran
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
