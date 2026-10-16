/** Konstanta dan tipe aman-klien untuk kurasi aturan (K3-K6), tanpa impor server. */
export type RuleStatus = "draft" | "in_review" | "published" | "superseded";

export const RULE_STATUS_LABELS: Record<RuleStatus, string> = {
  draft: "Draft",
  in_review: "Dalam Tinjauan",
  published: "Terbit",
  superseded: "Digantikan",
};

/** Pemberitahuan setelah berpindah halaman, dibawa lewat parameter ?info= (tanpa data aturan). */
export const CURATION_NOTICES: Record<string, { title: string; message: string }> = {
  disimpan: { title: "Draft tersimpan", message: "Saran petugas belum berubah sampai aturan terbit." },
  diajukan: { title: "Diajukan untuk tinjauan", message: "Aturan menunggu persetujuan 2 kurator lain." },
  terbit: { title: "Aturan terbit", message: "Saran ini kini dipakai petugas." },
  suara: { title: "Suara tersimpan", message: "Terbit setelah 2 kurator berbeda menyetujui." },
  revisi: { title: "Permintaan revisi terkirim", message: "Aturan kembali ke draft penulis." },
  dibuang: { title: "Draft dibuang", message: "Versi terbit sebelumnya tidak berubah." },
};

export const RULE_ACTION_MAX_LENGTH = 240;
export const RULE_RATIONALE_MAX_LENGTH = 400;
export const RULE_NOTE_MAX_LENGTH = 280;
/** Jumlah peninjau berbeda (selain penulis) yang harus menyetujui sebelum aturan terbit. */
export const RULE_REQUIRED_APPROVALS = 2;

/** Ikon yang dikenali tampilan petugas (renderRuleIcon). */
export const RULE_ICONS: readonly { name: string; label: string }[] = [
  { name: "Hand", label: "Tangan (isyarat)" },
  { name: "FileText", label: "Dokumen (tulisan)" },
  { name: "MessageSquare", label: "Percakapan" },
  { name: "LayoutGrid", label: "Papan gambar" },
  { name: "BellRing", label: "Panggilan visual atau getar" },
  { name: "Volume2", label: "Suara (verbal)" },
  { name: "VolumeX", label: "Minim bising" },
  { name: "Type", label: "Teks besar" },
  { name: "Accessibility", label: "Mobilitas" },
  { name: "HeartHandshake", label: "Bantuan berpindah" },
  { name: "ListChecks", label: "Langkah bertahap" },
  { name: "Users", label: "Pendamping" },
];

export interface RuleReviewItem {
  round: number;
  reviewerName: string;
  decision: "approve" | "revise";
  note: string;
  createdAt: string;
}

export interface RuleVersionItem {
  id: string;
  ruleKey: string;
  version: number;
  status: RuleStatus;
  needCode: string;
  needLabel: string;
  category: string;
  actionText: string;
  iconName: string;
  rationale: string;
  changeNote: string;
  revisionNote: string;
  authorName: string;
  isMine: boolean;
  reviewRound: number;
  publishedAt: string | null;
  approvedBy: string | null;
  updatedAt: string;
  approvals: number;
  reviews: RuleReviewItem[];
  /** Kurator yang sedang masuk sudah memberi suara pada putaran ini. */
  iVoted: boolean;
}

export interface RuleLineItem {
  ruleKey: string;
  needCode: string;
  needLabel: string;
  category: string;
  categoryLabel: string;
  published: RuleVersionItem | null;
  open: RuleVersionItem | null;
  versionCount: number;
}
