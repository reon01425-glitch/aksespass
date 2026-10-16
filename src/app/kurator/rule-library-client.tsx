"use client";

import { useState } from "react";
import Link from "next/link";
import { RULE_REQUIRED_APPROVALS, type RuleLineItem } from "@/lib/curation/shared";

type Tab = "semua" | "terbit" | "draft";

const TABS: { id: Tab; label: string }[] = [
  { id: "semua", label: "Semua" },
  { id: "terbit", label: "Terbit" },
  { id: "draft", label: "Draft" },
];

const CARD =
  "flex min-h-12 flex-col gap-1 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm transition-colors hover:bg-cyan-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900";

function RuleCard({ line, suggestion }: { line: RuleLineItem; suggestion: string | null }) {
  const { published, open } = line;
  return (
    <Link href={`/kurator/riwayat/${line.ruleKey}`} className={CARD} data-testid="kartu-aturan">
      <span className="text-base font-bold text-main">{line.needLabel}</span>
      {suggestion && <span className="text-sm font-bold text-main">{suggestion}</span>}
      <span className="text-sm font-bold text-main">
        {published ? `Terbit, versi ${published.version}` : "Belum terbit"}
      </span>
      {published && (
        <span className="line-clamp-3 break-words text-sm text-secondary">{published.actionText}</span>
      )}
      {!published && open && (
        <span className="line-clamp-3 break-words text-sm text-secondary">{open.actionText}</span>
      )}
      {open && (
        <span className="text-sm text-main">
          {open.status === "draft"
            ? `Draft versi ${open.version}${open.isMine ? " (milik Anda)" : ""}`
            : `Versi ${open.version} dalam tinjauan, ${open.approvals} dari ${RULE_REQUIRED_APPROVALS} setuju`}
        </span>
      )}
    </Link>
  );
}

/** K3: pustaka dengan tab Semua, Terbit, Draft (Draft mencakup yang sedang dalam tinjauan). */
export function RuleLibraryClient({ lines }: { lines: RuleLineItem[] }) {
  const [tab, setTab] = useState<Tab>("semua");

  const visible = lines.filter((l) =>
    tab === "terbit" ? l.published !== null : tab === "draft" ? l.open !== null : true
  );
  const count = (t: Tab) =>
    lines.filter((l) => (t === "terbit" ? l.published !== null : t === "draft" ? l.open !== null : true)).length;

  // Beberapa aturan boleh memakai kebutuhan pemicu yang sama; beri nomor agar kartunya mudah dibedakan.
  const needTotals = new Map<string, number>();
  for (const l of lines) needTotals.set(l.needCode, (needTotals.get(l.needCode) ?? 0) + 1);
  const needSeen = new Map<string, number>();
  const suggestionOf = new Map<string, string | null>();
  for (const l of lines) {
    const n = (needSeen.get(l.needCode) ?? 0) + 1;
    needSeen.set(l.needCode, n);
    suggestionOf.set(l.ruleKey, (needTotals.get(l.needCode) ?? 0) > 1 ? `Saran ${n} dari ${needTotals.get(l.needCode)}` : null);
  }

  const groups = new Map<string, RuleLineItem[]>();
  for (const l of visible) {
    const g = groups.get(l.categoryLabel) ?? [];
    g.push(l);
    groups.set(l.categoryLabel, g);
  }

  return (
    <div className="flex flex-col gap-5">
      <div role="tablist" aria-label="Filter aturan" className="grid grid-cols-3 gap-2">
        {TABS.map((t) => {
          const selected = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={selected}
              aria-controls="panel-aturan"
              onClick={() => setTab(t.id)}
              className={`min-h-12 rounded-2xl bg-white px-2 py-2 text-center text-sm font-bold text-main focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900 ${
                selected ? "border-2 border-cyan-800" : "border border-cyan-200"
              }`}
            >
              {t.label} ({count(t.id)})
            </button>
          );
        })}
      </div>

      <div id="panel-aturan" role="tabpanel" aria-labelledby={`tab-${tab}`} className="flex flex-col gap-5">
        {[...groups.entries()].map(([label, items]) => (
          <section key={label} aria-label={label} className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-main">{label}</h2>
            <div className="grid grid-cols-2 gap-3 [&>*:last-child:nth-child(odd)]:col-span-2">
              {items.map((l) => (
                <RuleCard key={l.ruleKey} line={l} suggestion={suggestionOf.get(l.ruleKey) ?? null} />
              ))}
            </div>
          </section>
        ))}

        {visible.length === 0 && (
          <p role="status" className="max-w-none rounded-2xl border border-dashed border-cyan-800 bg-white p-6 text-center text-sm font-bold text-main">
            {tab === "draft" ? "Tidak ada draft atau aturan dalam tinjauan." : tab === "terbit" ? "Belum ada aturan terbit." : "Belum ada aturan. Buat dengan tombol Aturan Baru."}
          </p>
        )}
      </div>
    </div>
  );
}
