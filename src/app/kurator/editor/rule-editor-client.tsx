"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, ConfirmDialog, RulePreview, StatusBanner, TextField } from "@/components";
import {
  RULE_ACTION_MAX_LENGTH,
  RULE_ICONS,
  RULE_NOTE_MAX_LENGTH,
  RULE_RATIONALE_MAX_LENGTH,
  type RuleVersionItem,
} from "@/lib/curation/shared";

interface NeedOption {
  code: string;
  label: string;
  categoryLabel: string;
}

const CARD = "flex flex-col gap-3 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm";

/** K4: editor aturan. Draf tidak memengaruhi saran petugas sampai terbit. */
export function RuleEditorClient({ needs, rule }: { needs: NeedOption[]; rule: RuleVersionItem | null }) {
  const router = useRouter();
  const [needCode, setNeedCode] = useState(rule?.needCode ?? "");
  const [actionText, setActionText] = useState(rule?.actionText ?? "");
  const [iconName, setIconName] = useState(rule?.iconName ?? "");
  const [rationale, setRationale] = useState(rule?.rationale ?? "");
  const [changeNote, setChangeNote] = useState(rule?.changeNote ?? "");
  const [busy, setBusy] = useState<null | "save" | "submit" | "discard">(null);
  const [msg, setMsg] = useState<{ ok: boolean; title: string; text: string; n: number } | null>(null);
  const notify = (ok: boolean, title: string, text: string) =>
    setMsg((m) => ({ ok, title, text, n: (m?.n ?? 0) + 1 }));
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const body = { needCode, actionText, iconName, rationale, changeNote };
  const lockedNeed = Boolean(rule && rule.version > 1);

  async function call(url: string, method: string, payload?: unknown) {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string; id?: string } | null;
    if (!res.ok || !data?.ok) {
      throw new Error(data?.message || "Gagal menyimpan. Coba lagi.");
    }
    return data;
  }

  async function save(): Promise<string> {
    if (rule) {
      await call(`/api/kurator/aturan/${rule.id}`, "PATCH", body);
      return rule.id;
    }
    const data = await call("/api/kurator/aturan", "POST", body);
    return data.id as string;
  }

  async function onSave() {
    setBusy("save");
    setMsg(null);
    try {
      const id = await save();
      if (!rule) {
        router.replace(`/kurator/editor/${id}?info=disimpan`);
        return;
      }
      notify(true, "Draft tersimpan", "Saran petugas belum berubah sampai aturan terbit.");
      router.refresh();
    } catch (e) {
      notify(false, "Gagal", e instanceof Error ? e.message : "Terjadi kesalahan jaringan.");
    } finally {
      setBusy(null);
    }
  }

  async function onSubmit() {
    setBusy("submit");
    setMsg(null);
    try {
      const id = await save();
      await call(`/api/kurator/aturan/${id}/ajukan`, "POST");
      router.push(`/kurator/tinjau/${id}?info=diajukan`);
    } catch (e) {
      notify(false, "Gagal", e instanceof Error ? e.message : "Terjadi kesalahan jaringan.");
      setBusy(null);
    }
  }

  async function onDiscard() {
    if (!rule) return;
    setConfirmDiscard(false);
    setBusy("discard");
    try {
      await call(`/api/kurator/aturan/${rule.id}`, "DELETE");
      router.push(rule.version > 1 ? `/kurator/riwayat/${rule.ruleKey}?info=dibuang` : "/kurator?info=dibuang");
    } catch (e) {
      notify(false, "Gagal", e instanceof Error ? e.message : "Terjadi kesalahan jaringan.");
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {rule?.revisionNote && (
        <section aria-label="Permintaan revisi" className="flex flex-col gap-1 rounded-2xl border-2 border-cyan-800 bg-white p-4">
          <h2 className="text-base font-bold text-main">Permintaan revisi dari peninjau</h2>
          <p className="max-w-none break-words text-sm text-main">{rule.revisionNote}</p>
        </section>
      )}

      {rule && (
        <p className="max-w-none rounded-2xl bg-cyan-700 p-4 text-base font-bold text-white shadow-md">
          Draft versi {rule.version}: {rule.needLabel}
        </p>
      )}

      <section aria-label="Isi aturan" className={CARD}>
        <div className="flex flex-col gap-1">
          <label htmlFor="kebutuhan" className="text-sm font-bold text-main">
            Kebutuhan pemicu
          </label>
          <select
            id="kebutuhan"
            value={needCode}
            disabled={lockedNeed || busy !== null}
            onChange={(e) => setNeedCode(e.target.value)}
            className="min-h-12 w-full rounded-lg border border-input bg-white px-3 text-base text-main focus:outline-none focus:ring-4 focus:ring-cyan-900"
          >
            <option value="">Pilih kebutuhan</option>
            {needs.map((n) => (
              <option key={n.code} value={n.code}>
                {n.categoryLabel}: {n.label}
              </option>
            ))}
          </select>
          {lockedNeed && (
            <span className="text-xs text-secondary">Versi lanjutan tetap memakai kebutuhan pemicu yang sama.</span>
          )}
        </div>

        <TextField
          id="saran"
          label="Saran tindakan untuk petugas"
          variant="textarea"
          rows={3}
          value={actionText}
          onChange={(e) => setActionText(e.target.value)}
          maxLength={RULE_ACTION_MAX_LENGTH}
          helperText="Kalimat pendek dan jelas. Jangan menulis diagnosis."
          disabled={busy !== null}
        />

        <div className="flex flex-col gap-2">
          <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
            <legend className="mb-1 text-sm font-bold text-main">Ikon</legend>
            <div className="grid grid-cols-2 gap-2 [&>*:last-child:nth-child(odd)]:col-span-2">
              {RULE_ICONS.map((i) => (
                <button
                  key={i.name}
                  type="button"
                  aria-pressed={iconName === i.name}
                  disabled={busy !== null}
                  onClick={() => setIconName(i.name)}
                  className={`min-h-12 rounded-2xl bg-white px-3 py-2 text-center text-sm font-bold text-main focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900 ${
                    iconName === i.name ? "border-2 border-cyan-800" : "border border-cyan-200"
                  }`}
                >
                  {i.label}
                </button>
              ))}
            </div>
          </fieldset>
        </div>

        <TextField
          id="sumber"
          label="Sumber atau alasan"
          variant="textarea"
          rows={3}
          value={rationale}
          onChange={(e) => setRationale(e.target.value)}
          maxLength={RULE_RATIONALE_MAX_LENGTH}
          helperText="Dari mana saran ini berasal, agar dapat dipertanggungjawabkan."
          disabled={busy !== null}
        />

        <TextField
          id="catatan-perubahan"
          label={rule && rule.version > 1 ? "Catatan perubahan (wajib)" : "Catatan perubahan"}
          variant="textarea"
          rows={2}
          value={changeNote}
          onChange={(e) => setChangeNote(e.target.value)}
          maxLength={RULE_NOTE_MAX_LENGTH}
          helperText="Ringkas apa yang berubah dan mengapa. Tampil di Riwayat."
          disabled={busy !== null}
        />
      </section>

      <section aria-label="Pratinjau untuk petugas" className="flex flex-col gap-2">
        <h2 className="text-lg font-bold text-main">Pratinjau untuk petugas</h2>
        <RulePreview iconName={iconName || "Hand"} actionText={actionText} rationale={rationale} />
      </section>

      {msg && (
        <StatusBanner key={msg.n} variant={msg.ok ? "success" : "error"} title={msg.title} message={msg.text} />
      )}

      <div className="flex flex-col gap-3">
        <Button isLoading={busy === "save"} disabled={busy !== null && busy !== "save"} onClick={() => void onSave()} className="w-full">
          Simpan Draft
        </Button>
        <Button
          variant="secondary"
          isLoading={busy === "submit"}
          disabled={busy !== null && busy !== "submit"}
          onClick={() => void onSubmit()}
          className="w-full rounded-2xl! border-2! border-cyan-800! bg-white!"
        >
          Ajukan Tinjauan
        </Button>
        {rule && (
          <Button
            variant="secondary"
            disabled={busy !== null}
            onClick={() => setConfirmDiscard(true)}
            className="w-full rounded-2xl! border-2! border-cyan-800! bg-white!"
          >
            Buang Draft
          </Button>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => void onDiscard()}
        title="Buang draft ini?"
        description="Draft akan dihapus. Versi terbit sebelumnya tidak berubah."
        confirmLabel="Ya, Buang"
      />
    </div>
  );
}
