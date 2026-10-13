import { withContext } from "../../db";
import { NEED_CATEGORIES, type NeedCategory } from "../consent/constants";

export interface AccommodationRuleRow {
  id: string;
  trigger_need_code: string;
  action_text: string;
  icon_name: string;
  rationale: string;
  version: number;
  status: "draft" | "in_review" | "published";
  published_at?: Date | string | null;
  approved_by?: string | null;
  need_label?: string;
  category?: string;
  need_sort_order?: number;
}

export interface AccommodationSuggestion {
  id: string;
  ruleIds: string[];
  actionText: string;
  iconName: string;
  source: string;
  version: number;
  category: string;
  triggerNeedCodes: string[];
}

export interface UncoveredNeed {
  code: string;
  label: string;
}

export interface SuggestionsResult {
  suggestions: AccommodationSuggestion[];
  uncoveredNeeds: UncoveredNeed[];
}

/**
 * Pemetaan bawaan kode kebutuhan ke label ramah pengguna untuk fallback
 * ketika rules tidak memiliki baris join needs_catalog.
 */
export const DEFAULT_NEED_LABELS: Record<string, { label: string; category: NeedCategory }> = {
  komunikasi_bisindo: { label: "Bahasa Isyarat (BISINDO)", category: "komunikasi" },
  komunikasi_tertulis: { label: "Instruksi dan Penjelasan Tertulis", category: "komunikasi" },
  komunikasi_bicara_hadap: { label: "Bicara Menghadap Pasien", category: "komunikasi" },
  komunikasi_papan_gambar: { label: "Papan Komunikasi Bergambar", category: "komunikasi" },
  antrean_visual_getar: { label: "Panggilan Antrean Visual atau Getar", category: "pendengaran" },
  panduan_verbal: { label: "Panduan Langkah Verbal", category: "penglihatan" },
  teks_huruf_besar: { label: "Materi Cetak dan Teks Huruf Besar", category: "penglihatan" },
  jalur_kursi_roda: { label: "Jalur dan Ruang Periksa Kursi Roda", category: "mobilitas" },
  bantuan_transfer: { label: "Bantuan Berpindah (Transfer)", category: "mobilitas" },
  lingkungan_tenang: { label: "Area Tunggu Tenang dan Minim Bising", category: "sensorik_lingkungan" },
  penjelasan_bertahap: { label: "Penjelasan Bertahap dan Waktu Ekstra", category: "sensorik_lingkungan" },
  pendamping_di_ruang: { label: "Pendamping Ikut Masuk Ruang Periksa", category: "pendampingan" },
};

/**
 * Fungsi murni buildSuggestions:
 * - Mengembalikan satu saran per aturan (ikon, teks pendek, sumber, versi)
 * - Teks duplikat digabung menjadi satu saran dengan kumpulan ruleIds
 * - Diurutkan berdasarkan kategori baku
 * - Aturan Draft atau status selain 'published' diabaikan
 * - Kode kebutuhan yang tidak dibagikan (tidak ada di needCodes) diabaikan
 * - Kebutuhan yang ada di needCodes namun tidak memiliki aturan published dikembalikan terpisah sebagai "belum ada saran"
 */
export function buildSuggestions(
  rules: AccommodationRuleRow[],
  needCodes: string[],
  catalogMap: Record<string, { label: string; category?: string }> = DEFAULT_NEED_LABELS
): SuggestionsResult {
  const allowedNeedsSet = new Set(needCodes);

  // 1. Saring hanya aturan berstatus 'published' untuk kode kebutuhan yang diminta
  const publishedRules = rules.filter(
    (r) => r.status === "published" && allowedNeedsSet.has(r.trigger_need_code)
  );

  // 2. Kumpulkan kode kebutuhan yang terakomodasi
  const coveredNeedsSet = new Set(publishedRules.map((r) => r.trigger_need_code));

  // 3. Kebutuhan tanpa aturan terbitan (uncoveredNeeds)
  const uncoveredNeeds: UncoveredNeed[] = [];
  for (const code of needCodes) {
    if (!coveredNeedsSet.has(code)) {
      const label = catalogMap[code]?.label || code;
      uncoveredNeeds.push({ code, label });
    }
  }

  // 4. Gabungkan aturan dengan action_text identik (teks duplikat digabung)
  const groupedByText = new Map<
    string,
    {
      id: string;
      ruleIds: string[];
      actionText: string;
      iconName: string;
      source: string;
      version: number;
      category: string;
      triggerNeedCodes: Set<string>;
    }
  >();

  for (const rule of publishedRules) {
    const key = rule.action_text.trim();
    const source = rule.approved_by || rule.rationale || "Panduan Layanan Inklusif";
    const category =
      rule.category ||
      catalogMap[rule.trigger_need_code]?.category ||
      "komunikasi";

    const existing = groupedByText.get(key);
    if (!existing) {
      groupedByText.set(key, {
        id: rule.id,
        ruleIds: [rule.id],
        actionText: rule.action_text,
        iconName: rule.icon_name,
        source,
        version: rule.version,
        category,
        triggerNeedCodes: new Set([rule.trigger_need_code]),
      });
    } else {
      if (!existing.ruleIds.includes(rule.id)) {
        existing.ruleIds.push(rule.id);
      }
      existing.triggerNeedCodes.add(rule.trigger_need_code);
      if (rule.version > existing.version) {
        existing.version = rule.version;
        existing.source = source;
      }
    }
  }

  // 5. Urutkan per kategori kanonikal
  const categoryOrderMap = new Map<string, number>();
  NEED_CATEGORIES.forEach((cat, index) => {
    categoryOrderMap.set(cat, index);
  });

  const suggestions: AccommodationSuggestion[] = Array.from(groupedByText.values())
    .map((item) => ({
      id: item.id,
      ruleIds: item.ruleIds,
      actionText: item.actionText,
      iconName: item.iconName,
      source: item.source,
      version: item.version,
      category: item.category,
      triggerNeedCodes: Array.from(item.triggerNeedCodes),
    }))
    .sort((a, b) => {
      const orderA = categoryOrderMap.get(a.category) ?? 99;
      const orderB = categoryOrderMap.get(b.category) ?? 99;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.actionText.localeCompare(b.actionText);
    });

  return { suggestions, uncoveredNeeds };
}

/**
 * Mengambil aturan akomodasi terbitan (published) dari database untuk daftar kode kebutuhan.
 * Hanya membaca aturan berstatus 'published'.
 */
export async function getPublishedRules(
  needCodes: string[]
): Promise<AccommodationRuleRow[]> {
  if (!needCodes || needCodes.length === 0) {
    return [];
  }

  return await withContext(
    { role: "staff" },
    async (tx) => {
      const res = await tx.query<AccommodationRuleRow>(
        `SELECT
           ar.id,
           ar.trigger_need_code,
           ar.action_text,
           ar.icon_name,
           ar.rationale,
           ar.version,
           ar.status,
           ar.approved_by,
           nc.label AS need_label,
           nc.category,
           nc.sort_order AS need_sort_order
         FROM accommodation_rules ar
         JOIN needs_catalog nc ON nc.code = ar.trigger_need_code
         WHERE ar.trigger_need_code = ANY($1)
           AND ar.status = 'published'
         ORDER BY nc.sort_order, ar.version DESC, ar.created_at ASC;`,
        [needCodes]
      );
      return res.rows;
    }
  );
}

/**
 * Mengambil rekomendasi saran tindakan secara lengkap untuk petugas
 * berdasarkan kode kebutuhan yang dibagikan pasien.
 */
export async function getSuggestionsForNeeds(
  needCodes: string[]
): Promise<SuggestionsResult> {
  const rules = await getPublishedRules(needCodes);
  return buildSuggestions(rules, needCodes);
}
