import type { Metadata } from "next";
import { PageShell } from "@/components";
import { listNeedOptions } from "@/lib/curation";
import { requireCuratorSession } from "@/lib/curation/page";
import { RuleEditorClient } from "../rule-editor-client";

export const instant = false;

export const metadata: Metadata = {
  title: "Aturan Baru — AKSESPASS",
  description: "Susun aturan saran tindakan baru sebagai draf.",
};

/** K4: editor untuk aturan baru. */
export default async function AturanBaruPage() {
  const session = await requireCuratorSession();
  const needs = await listNeedOptions(session);
  return (
    <PageShell title="Aturan Baru" backHref="/kurator" backLabel="Kembali ke Pustaka" curatorNav>
      <RuleEditorClient needs={needs} rule={null} />
    </PageShell>
  );
}
