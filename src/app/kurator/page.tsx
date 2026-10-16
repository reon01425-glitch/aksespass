import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { HeroCard, PageShell, StatusBanner } from "@/components";
import { CURATION_NOTICES, listRuleLines } from "@/lib/curation";
import { requireCuratorSession } from "@/lib/curation/page";
import { RuleLibraryClient } from "./rule-library-client";

export const instant = false;

export const metadata: Metadata = {
  title: "Pustaka Aturan — AKSESPASS",
  description: "Pustaka aturan saran tindakan untuk petugas, dikurasi komunitas.",
};

/** K3: pustaka aturan, dikelompokkan menurut kategori kebutuhan. */
export default async function KuratorPage({ searchParams }: { searchParams: Promise<{ info?: string }> }) {
  const session = await requireCuratorSession();
  const lines = await listRuleLines(session);
  const { info } = await searchParams;
  const notice = info ? CURATION_NOTICES[info] : undefined;
  const waiting = lines.filter((l) => l.open?.status === "in_review" && !l.open.isMine && !l.open.iVoted).length;

  return (
    <PageShell title="Pustaka Aturan" curatorNav>
      <div className="flex flex-col gap-5">
        {notice && <StatusBanner variant="success" title={notice.title} message={notice.message} />}
        <HeroCard
          Icon={ClipboardCheck}
          title={`${waiting} Aturan Menunggu Tinjauan Anda`}
          description={
            waiting > 0
              ? "Buka untuk menyetujui atau meminta revisi."
              : "Tidak ada aturan yang menunggu suara Anda."
          }
          href="/kurator/tinjau"
        />

        <Link
          href="/kurator/editor/baru"
          className="flex min-h-12 items-center justify-center rounded-2xl border-2 border-cyan-800 bg-white px-4 font-bold text-cyan-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
        >
          Aturan Baru
        </Link>

        <RuleLibraryClient lines={lines} />
      </div>
    </PageShell>
  );
}
