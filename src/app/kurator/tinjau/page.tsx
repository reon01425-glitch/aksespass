import type { Metadata } from "next";
import Link from "next/link";
import { PageShell, StatusBanner } from "@/components";
import { CURATION_NOTICES, listRuleLines, RULE_REQUIRED_APPROVALS } from "@/lib/curation";
import { requireCuratorSession } from "@/lib/curation/page";

export const instant = false;

export const metadata: Metadata = {
  title: "Tinjau Aturan — AKSESPASS",
  description: "Aturan yang menunggu persetujuan kurator.",
};

/** K5 (daftar): aturan yang sedang dalam tinjauan. */
export default async function TinjauPage({ searchParams }: { searchParams: Promise<{ info?: string }> }) {
  const session = await requireCuratorSession();
  const lines = await listRuleLines(session);
  const { info } = await searchParams;
  const notice = info ? CURATION_NOTICES[info] : undefined;
  const items = lines
    .map((l) => l.open)
    .filter((o): o is NonNullable<typeof o> => o !== null && o.status === "in_review");

  return (
    <PageShell title="Tinjau Aturan" curatorNav>
      <div className="flex flex-col gap-5">
        {notice && <StatusBanner variant="success" title={notice.title} message={notice.message} />}
        <p className="max-w-none rounded-2xl border-2 border-cyan-800 bg-white p-4 text-sm leading-6 text-secondary">
          Aturan terbit setelah {RULE_REQUIRED_APPROVALS} kurator berbeda menyetujuinya. Penulis tidak
          dapat meninjau aturannya sendiri. Satu permintaan revisi mengembalikan aturan ke draft.
        </p>

        {items.length === 0 ? (
          <p role="status" className="max-w-none rounded-2xl border border-dashed border-cyan-800 bg-white p-6 text-center text-sm font-bold text-main">
            Tidak ada aturan dalam tinjauan.
          </p>
        ) : (
          <ul aria-label="Aturan dalam tinjauan" className="m-0 grid list-none grid-cols-2 gap-3 p-0 [&>*:last-child:nth-child(odd)]:col-span-2">
            {items.map((r) => (
              <li key={r.id} className="flex">
                <Link
                  href={`/kurator/tinjau/${r.id}`}
                  data-testid="kartu-tinjau"
                  className="flex min-h-12 w-full flex-col gap-1 rounded-2xl border border-cyan-800 bg-white p-4 shadow-sm transition-colors hover:bg-cyan-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-cyan-900"
                >
                  <span className="text-base font-bold text-main">{r.needLabel}</span>
                  <span className="text-sm font-bold text-main">
                    Versi {r.version}, {r.approvals} dari {RULE_REQUIRED_APPROVALS} setuju
                  </span>
                  <span className="line-clamp-3 break-words text-sm text-secondary">{r.actionText}</span>
                  <span className="text-sm text-main">
                    {r.isMine ? "Ditulis oleh Anda" : r.iVoted ? "Anda sudah memberi suara" : `Ditulis oleh ${r.authorName}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
