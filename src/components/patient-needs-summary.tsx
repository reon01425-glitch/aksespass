import React from "react";
import {
  Hand,
  FileText,
  MessageSquare,
  LayoutGrid,
  BellRing,
  Volume2,
  Type,
  Accessibility,
  HeartHandshake,
  VolumeX,
  ListChecks,
  Users,
  CircleCheck,
} from "lucide-react";

export interface PatientNeedSummaryItem {
  code?: string;
  kode?: string;
  label: string;
  iconName?: string;
  ikon?: string;
  category?: string;
  kategori?: string;
}

export interface PatientNeedsSummaryProps {
  preferredName?: string;
  namaPanggilan?: string;
  needs: PatientNeedSummaryItem[];
  patientNote?: string | null;
  catatan?: string | null;
  showPrivacyNotes?: boolean;
  className?: string;
}

export function getNeedSummaryIcon(
  iconName?: string
): React.ReactElement {
  const name = (iconName || "").toLowerCase();
  const iconProps = {
    className: "w-6 h-6 shrink-0 text-cyan-800",
    "aria-hidden": true,
  };

  switch (name) {
    case "hand":
      return <Hand {...iconProps} />;
    case "filetext":
      return <FileText {...iconProps} />;
    case "messagesquare":
      return <MessageSquare {...iconProps} />;
    case "layoutgrid":
      return <LayoutGrid {...iconProps} />;
    case "bellring":
      return <BellRing {...iconProps} />;
    case "volume2":
      return <Volume2 {...iconProps} />;
    case "type":
      return <Type {...iconProps} />;
    case "accessibility":
      return <Accessibility {...iconProps} />;
    case "hearthandshake":
      return <HeartHandshake {...iconProps} />;
    case "volumex":
      return <VolumeX {...iconProps} />;
    case "listchecks":
      return <ListChecks {...iconProps} />;
    case "users":
      return <Users {...iconProps} />;
    default:
      return <CircleCheck {...iconProps} />;
  }
}

const CATEGORY_DISPLAY_LABELS: Record<string, string> = {
  komunikasi: "Komunikasi",
  penglihatan: "Penglihatan",
  pendengaran: "Pendengaran",
  mobilitas: "Mobilitas",
  sensorik_lingkungan: "Sensorik dan Lingkungan",
  pendampingan: "Pendampingan",
};

const CATEGORY_ORDER = [
  "komunikasi",
  "penglihatan",
  "pendengaran",
  "mobilitas",
  "sensorik_lingkungan",
  "pendampingan",
];

export function PatientNeedsSummary({
  preferredName,
  namaPanggilan,
  needs,
  patientNote,
  catatan,
  showPrivacyNotes = true,
  className = "",
}: PatientNeedsSummaryProps) {
  const displayName = (preferredName ?? namaPanggilan ?? "").trim();
  const note = (patientNote ?? catatan ?? null)?.trim() || null;

  // Kelompokkan kebutuhan per kategori
  const groupedNeeds = new Map<string, PatientNeedSummaryItem[]>();
  for (const item of needs) {
    const cat = item.category || item.kategori || "lainnya";
    if (!groupedNeeds.has(cat)) {
      groupedNeeds.set(cat, []);
    }
    groupedNeeds.get(cat)!.push(item);
  }

  // Ambil kategori yang ada urutannya
  const sortedCategories = CATEGORY_ORDER.filter((cat) =>
    groupedNeeds.has(cat)
  );
  // Tambah kategori non-standar jika ada
  for (const cat of groupedNeeds.keys()) {
    if (!sortedCategories.includes(cat)) {
      sortedCategories.push(cat);
    }
  }

  return (
    <div className={`flex flex-col gap-6 max-w-full w-full ${className}`.trim()}>
      {/* Kartu Nama Panggilan */}
      <div className="p-4 rounded-xl bg-white border border-cyan-800 shadow-sm">
        <span className="text-sm font-normal text-secondary block">
          Nama Panggilan
        </span>
        <span className="text-2xl font-bold text-main block mt-1 break-words">
          {displayName || "—"}
        </span>
      </div>

      {/* Daftar Kebutuhan Per Kategori */}
      <div className="flex flex-col gap-5">
        <h3 className="text-base font-bold text-main border-b border-cyan-100 pb-2">
          Kebutuhan Layanan Terpilih
        </h3>

        {sortedCategories.length === 0 ? (
          <p className="text-sm font-normal text-secondary">
            Belum ada kebutuhan yang dipilih.
          </p>
        ) : (
          sortedCategories.map((category) => {
            const items = groupedNeeds.get(category) || [];
            const categoryLabel =
              CATEGORY_DISPLAY_LABELS[category] || category;

            return (
              <div key={category} className="flex flex-col gap-2">
                <span className="text-sm font-bold text-main">
                  {categoryLabel}
                </span>
                <ul className="flex flex-col gap-2 m-0 p-0 list-none">
                  {items.map((item, idx) => {
                    const key = item.code || item.kode || `${category}-${idx}`;
                    const iconName = item.iconName || item.ikon;
                    return (
                      <li
                        key={key}
                        className="flex items-center gap-3 p-3 rounded-lg bg-surface border border-cyan-700 min-h-12"
                      >
                        {getNeedSummaryIcon(iconName)}
                        <span className="text-base font-bold text-main break-words flex-1">
                          {item.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })
        )}
      </div>

      {/* Catatan untuk Petugas (bila ada) */}
      {note && (
        <div className="p-4 rounded-xl bg-white border border-cyan-800 shadow-sm">
          <span className="text-sm font-bold text-main block mb-1">
            Catatan untuk Petugas
          </span>
          <p className="text-base font-normal text-main break-words whitespace-pre-wrap">
            {note}
          </p>
        </div>
      )}

      {/* Keterangan Privasi */}
      {showPrivacyNotes && (
        <div className="p-4 rounded-xl bg-cyan-100 border border-cyan-400 text-sm text-secondary flex flex-col gap-1">
          <p className="font-bold text-main">Diagnosis tidak diminta</p>
          <p className="font-normal text-secondary">
            Petugas hanya melihat bagian yang Anda pilih saat membuat ConsentQR.
          </p>
        </div>
      )}
    </div>
  );
}
