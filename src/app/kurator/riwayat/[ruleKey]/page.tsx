import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageShell, RulePreview, StatusBanner } from "@/components";
import { CURATION_NOTICES, listRuleHistory, RULE_REQUIRED_APPROVALS, RULE_STATUS_LABELS } from "@/lib/curation";
import { requireCuratorSession } from "@/lib/curation/page";
import { HistoryActionsClient } from "./history-actions-client";

export const instant = false;

export const metadata: Metadata = {
  title: "Riwayat Aturan — AKSESPASS",
  description: "Versi, pengesah, dan ringkasan perubahan satu aturan.",
};

function fmt(iso: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(iso));
}

/** K6: riwayat versi satu aturan, dengan pengesah dan catatan perubahan. */
export default async function RiwayatAturanPage({
  params,
  searchParams,
}: {
  params: Promise<{ ruleKey: string }>;
  searchParams: Promise<{ info?: string }>;
}) {
  const session = await requireCuratorSession();
  const { ruleKey } = await params;
  const versions = await listRuleHistory(session, ruleKey);
  const { info } = await searchParams;
  const notice = info ? CURATION_NOTICES[info] : undefined;
  if (versions.length === 0) notFound();
  const open = versions.find((v) => v.status === "draft" || v.status === "in_review") ?? null;
  const published = versions.find((v) => v.status === "published") ?? null;

  return (
    <PageShell title="Riwayat Aturan" backHref="/kurator" backLabel="Kembali ke Pustaka" curatorNav>
      <div className="flex flex-col gap-5">
        {notice && <StatusBanner variant="success" title={notice.title} message={notice.message} />}
        <section aria-label="Ringkasan" className="flex flex-col gap-1 rounded-2xl bg-cyan-700 p-5 text-white shadow-md">
          <span className="text-lg font-bold text-white">{versions[0].needLabel}</span>
          <span className="text-sm text-white">
            {versions.length} versi. {published ? `Terbit: versi ${published.version}.` : "Belum ada versi terbit."}
          </span>
        </section>

        <HistoryActionsClient
          ruleKey={ruleKey}
          open={open ? { id: open.id, status: open.status, isMine: open.isMine, version: open.version } : null}
          canCreateVersion={Boolean(published) && !open}
        />

        <ol aria-label="Daftar versi" className="m-0 flex list-none flex-col gap-4 p-0">
          {versions.map((v) => {
            const round = v.reviews.filter((r) => r.round === v.reviewRound);
            return (
              <li key={v.id} data-testid="versi-aturan" className="flex flex-col gap-3 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-1">
                  <h2 className="text-lg font-bold text-main">
                    Versi {v.version}, {RULE_STATUS_LABELS[v.status]}
                  </h2>
                  <span className="text-sm text-secondary">
                    Ditulis oleh {v.authorName || "kurator"}. Diperbarui {fmt(v.updatedAt)}.
                  </span>
                  {v.publishedAt && (
                    <span className="text-sm text-main">
                      Terbit {fmt(v.publishedAt)}. Pengesah: {v.approvedBy}.
                    </span>
                  )}
                  {v.status === "in_review" && (
                    <span className="text-sm text-main">
                      {v.approvals} dari {RULE_REQUIRED_APPROVALS} persetujuan.
                    </span>
                  )}
                </div>
                <RulePreview iconName={v.iconName} actionText={v.actionText} rationale={v.rationale} />
                {v.changeNote && (
                  <p className="max-w-none text-sm text-main">
                    <span className="font-bold">Perubahan: </span>
                    {v.changeNote}
                  </p>
                )}
                {v.revisionNote && v.status === "draft" && (
                  <p className="max-w-none text-sm text-main">
                    <span className="font-bold">Permintaan revisi: </span>
                    {v.revisionNote}
                  </p>
                )}
                {round.length > 0 && (
                  <ul className="m-0 flex list-none flex-col gap-1 p-0 text-sm text-main">
                    {round.map((r) => (
                      <li key={`${r.reviewerName}-${r.createdAt}`}>
                        {r.reviewerName}: {r.decision === "approve" ? "Setuju" : "Minta revisi"}
                        {r.note ? `. ${r.note}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </PageShell>
  );
}
