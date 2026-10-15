/** Konstanta dan tipe aman-klien untuk tindak lanjut fasilitas (tanpa impor server). */
export type FacilityActionStatus = "baru" | "dikerjakan" | "selesai";
export const FACILITY_ACTION_NOTE_MAX_LENGTH = 280;
export const FACILITY_ACTION_STATUS_LABELS: Record<FacilityActionStatus, string> = {
  baru: "Baru",
  dikerjakan: "Sedang Dikerjakan",
  selesai: "Selesai",
};
export interface FacilityActionItem {
  id: string;
  category: string;
  categoryLabel: string;
  status: FacilityActionStatus;
  stepNote: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}
