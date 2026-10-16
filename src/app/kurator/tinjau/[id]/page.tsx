import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell, RulePreview, StatusBanner } from "@/components";
import { CURATION_NOTICES, getRuleVersion, RULE_REQUIRED_APPROVALS, RULE_STATUS_LABELS } from "@/lib/curation";
import { requireCuratorSession } from "@/lib/curation/page";
import { ReviewClient } from "./review-client";

export const instant = false;

export const metadata: Metadata = {
  title: "Tinjau dan Setujui — AKSESPASS",
  description: "Beri suara pada satu versi aturan.",
};

function fmt(iso: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(iso));
}

/** K5: tinjau satu versi aturan dan beri suara. */
export default async function TinjauAturanPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ info?: string }>;
}) {
  const session = await requireCuratorSession();
  const { id } = await params;
  const rule = await getRuleVersion(session, id);
  if (!rule) notFound();
  const { info } = await searchParams;
  const notice = info ? CURATION_NOTICES[info] : undefined;
  const round = rule.reviews.filter((r) => r.round === rule.reviewRound);

  return (
    <PageShell
      title="Tinjau Aturan"
      backHref="/kurator/tinjau"
      backLabel="Kembali ke daftar tinjauan"
      curatorNav
    >
      <div className="flex flex-col gap-5">
        {notice && <StatusBanner variant="success" title={notice.title} message={notice.message} />}
        <section aria-label="Ringkasan" className="flex flex-col gap-2 rounded-2xl bg-cyan-700 p-5 text-white shadow-md">
          <span className="text-lg font-bold text-white">{rule.needLabel}, versi {rule.version}</span>
          <span className="text-sm text-white">
            Status: {RULE_STATUS_LABELS[rule.status]}. {rule.approvals} dari {RULE_REQUIRED_APPROVALS} persetujuan.
          </span>
          <span className="text-sm text-white">Ditulis oleh {rule.authorName || "kurator"}.</span>
        </section>

        <section aria-label="Isi aturan" className="flex flex-col gap-2">
          <h2 className="text-lg font-bold text-main">Isi aturan</h2>
          <RulePreview iconName={rule.iconName} actionText={rule.actionText} rationale={rule.rationale} />
          {rule.changeNote && (
            <p className="max-w-none rounded-2xl border border-cyan-800 bg-white p-4 text-sm text-main">
              <span className="font-bold">Catatan perubahan: </span>
              {rule.changeNote}
            </p>
          )}
        </section>

        <section aria-label="Suara peninjau" className="flex flex-col gap-2">
          <h2 className="text-lg font-bold text-main">Suara peninjau</h2>
          {round.length === 0 ? (
            <p className="max-w-none rounded-2xl border border-dashed border-cyan-800 bg-white p-4 text-sm text-secondary">
              Belum ada suara pada putaran ini.
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {round.map((r) => (
                <li key={`${r.reviewerName}-${r.createdAt}`} className="flex flex-col gap-1 rounded-2xl border border-cyan-800 bg-white p-4">
                  <span className="text-base font-bold text-main">
                    {r.reviewerName}: {r.decision === "approve" ? "Setuju" : "Minta revisi"}
                  </span>
                  {r.note && <span className="break-words text-sm text-main">{r.note}</span>}
                  <span className="text-xs text-secondary">{fmt(r.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <ReviewClient
          ruleId={rule.id}
          status={rule.status}
          isMine={rule.isMine}
          iVoted={rule.iVoted}
          ruleKey={rule.ruleKey}
        />
      </div>
    </PageShell>
  );
}
