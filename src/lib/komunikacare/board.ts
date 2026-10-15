/** Kalimat papan bergambar (P15.1). Client-safe: tanpa impor server. */
export const BOARD_SENTENCES: Record<string, { label: string; sentence: string }> = {
  nyeri: { label: "Nyeri", sentence: "Saya merasa nyeri." },
  haus: { label: "Haus", sentence: "Saya haus. Mohon air minum." },
  toilet: { label: "Toilet", sentence: "Saya perlu ke toilet." },
  ulang: { label: "Ulangi", sentence: "Mohon ulangi, lebih pelan dan jelas." },
  bantuan: { label: "Butuh Bantuan", sentence: "Saya butuh bantuan." },
  "tidak-paham": {
    label: "Tidak Mengerti",
    sentence: "Saya belum mengerti. Mohon tulis atau tunjukkan.",
  },
};

export const KOMUNIKACARE_TEXT_MAX_LENGTH = 300;

export interface KomunikaMessage {
  id: string;
  sender: "patient" | "staff";
  kind: "icon" | "text";
  /** kind=icon: id papan; kind=text: teks bebas. */
  body: string;
  createdAt: string;
}

/** Teks yang dibaca manusia untuk sebuah pesan. */
export function messageText(m: Pick<KomunikaMessage, "kind" | "body">): string {
  if (m.kind === "icon") return BOARD_SENTENCES[m.body]?.sentence ?? "";
  return m.body;
}
