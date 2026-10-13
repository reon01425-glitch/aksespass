export type TodayVisitStatusCode =
  | "unrecorded"
  | "pending_confirmation"
  | "confirmed";

export interface TodayVisit {
  id: string;
  shortRef: string;
  time: string;
  statusCode: TodayVisitStatusCode;
  statusText: string;
  iconName: "FileEdit" | "Clock" | "CheckCheck";
  confirmation?: {
    status: "terpenuhi" | "sebagian" | "belum";
    confirmedBy: "patient" | "companion" | "on_site";
  };
}

/**
 * Format jam dalam WIB (Asia/Jakarta, UTC+7).
 * Contoh: "14:30 WIB"
 */
export function formatVisitTimeWIB(date: Date): string {
  const formatter = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${formatter.format(date)} WIB`;
}

/**
 * Pemetaan status murni untuk kunjungan di T3:
 * - recorded_at kosong -> "Belum dicatat"
 * - recorded_at ada tetapi belum ada konfirmasi -> "Menunggu konfirmasi"
 * - ada konfirmasi -> "Dikonfirmasi: Terpenuhi/Sebagian/Belum (oleh pasien/pendamping/di tempat)"
 */
export function mapVisitStatus(
  recordedAt: Date | string | null,
  confirmationStatus: "terpenuhi" | "sebagian" | "belum" | null,
  confirmedBy: "patient" | "companion" | "on_site" | null
): {
  statusCode: TodayVisitStatusCode;
  statusText: string;
  iconName: "FileEdit" | "Clock" | "CheckCheck";
} {
  if (!recordedAt) {
    return {
      statusCode: "unrecorded",
      statusText: "Belum dicatat",
      iconName: "FileEdit",
    };
  }

  if (!confirmationStatus) {
    return {
      statusCode: "pending_confirmation",
      statusText: "Menunggu konfirmasi",
      iconName: "Clock",
    };
  }

  const statusMap: Record<string, string> = {
    terpenuhi: "Terpenuhi",
    sebagian: "Sebagian",
    belum: "Belum",
  };

  const byMap: Record<string, string> = {
    patient: "oleh pasien",
    companion: "oleh pendamping",
    on_site: "di tempat",
  };

  const statusLabel = statusMap[confirmationStatus] || confirmationStatus;
  const byLabel = (confirmedBy && byMap[confirmedBy]) || (confirmedBy ?? "");

  const statusText = byLabel
    ? `Dikonfirmasi: ${statusLabel} (${byLabel})`
    : `Dikonfirmasi: ${statusLabel}`;

  return {
    statusCode: "confirmed",
    statusText,
    iconName: "CheckCheck",
  };
}
