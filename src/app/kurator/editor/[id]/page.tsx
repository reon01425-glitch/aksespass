import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageShell, StatusBanner } from "@/components";
import { CURATION_NOTICES, getRuleVersion, listNeedOptions } from "@/lib/curation";
import { requireCuratorSession } from "@/lib/curation/page";
import { RuleEditorClient } from "../rule-editor-client";

export const instant = false;

export const metadata: Metadata = {
  title: "Editor Aturan — AKSESPASS",
  description: "Ubah draf aturan saran tindakan.",
};

/** K4: editor draf. Hanya penulis yang dapat membuka draf miliknya. */
export default async function EditorAturanPage({
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
  if (rule.status === "in_review") redirect(`/kurator/tinjau/${rule.id}`);
  if (rule.status !== "draft") redirect(`/kurator/riwayat/${rule.ruleKey}`);
  if (!rule.isMine) redirect(`/kurator/riwayat/${rule.ruleKey}`);
  const needs = await listNeedOptions(session);
  const { info } = await searchParams;
  const notice = info ? CURATION_NOTICES[info] : undefined;
  return (
    <PageShell
      title="Editor Aturan"
      backHref={`/kurator/riwayat/${rule.ruleKey}`}
      backLabel="Kembali ke Riwayat"
      curatorNav
    >
      {notice && <StatusBanner variant="success" title={notice.title} message={notice.message} />}
      <RuleEditorClient needs={needs} rule={rule} />
    </PageShell>
  );
}
