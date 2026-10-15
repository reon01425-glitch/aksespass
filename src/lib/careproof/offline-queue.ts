/**
 * Antrean lokal jawaban konfirmasi CareProof (P16) saat pasien offline.
 *
 * Disimpan di localStorage per pengguna. Hanya memuat id kunjungan, status, kode
 * kebutuhan yang belum terpenuhi, dan waktu; tanpa catatan bebas atau data profil.
 * Setiap item punya clientId. Mengirim ulang item yang sama aman: server hanya
 * menimpa jawaban pasien sendiri, dan menolak (409) bila sudah final.
 * Penyimpanan peramban BUKAN cadangan permanen; item dihapus segera setelah sinkron.
 */
export type QueuedStatus = "terpenuhi" | "sebagian" | "belum";

export interface QueuedConfirmation {
  clientId: string;
  visitId: string;
  status: QueuedStatus;
  unmetNeedCodes: string[];
  queuedAt: string;
}

export const CONFIRM_QUEUE_KEY_PREFIX = "aksespass:confirm-queue:v1:";
export const CONFIRM_QUEUE_MAX = 20;

export function confirmQueueKey(userId: string): string {
  return `${CONFIRM_QUEUE_KEY_PREFIX}${userId}`;
}

function isQueued(x: unknown): x is QueuedConfirmation {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.clientId === "string" &&
    typeof o.visitId === "string" &&
    (o.status === "terpenuhi" || o.status === "sebagian" || o.status === "belum") &&
    Array.isArray(o.unmetNeedCodes) &&
    o.unmetNeedCodes.every((c) => typeof c === "string") &&
    typeof o.queuedAt === "string"
  );
}

export function readConfirmQueue(
  userId: string,
  storage: Pick<Storage, "getItem"> | undefined = safeStorage()
): QueuedConfirmation[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(confirmQueueKey(userId));
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isQueued) : [];
  } catch {
    return [];
  }
}

function writeConfirmQueue(
  userId: string,
  items: QueuedConfirmation[],
  storage: Pick<Storage, "setItem" | "removeItem"> | undefined = safeStorage()
): boolean {
  if (!storage) return false;
  try {
    if (items.length === 0) storage.removeItem(confirmQueueKey(userId));
    else storage.setItem(confirmQueueKey(userId), JSON.stringify(items));
    return true;
  } catch {
    return false;
  }
}

/**
 * Menambah jawaban ke antrean. Satu kunjungan hanya punya satu item:
 * jawaban baru menggantikan yang lama. Mengembalikan false bila gagal disimpan.
 */
export function enqueueConfirmation(
  userId: string,
  item: Omit<QueuedConfirmation, "clientId" | "queuedAt"> & {
    clientId?: string;
    queuedAt?: string;
  },
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | undefined = safeStorage()
): boolean {
  const current = readConfirmQueue(userId, storage).filter(
    (q) => q.visitId !== item.visitId
  );
  const next: QueuedConfirmation = {
    clientId: item.clientId ?? newClientId(),
    visitId: item.visitId,
    status: item.status,
    unmetNeedCodes: item.status === "terpenuhi" ? [] : item.unmetNeedCodes,
    queuedAt: item.queuedAt ?? new Date().toISOString(),
  };
  const items = [...current, next].slice(-CONFIRM_QUEUE_MAX);
  return writeConfirmQueue(userId, items, storage);
}

export function removeQueuedConfirmation(
  userId: string,
  clientId: string,
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | undefined = safeStorage()
): void {
  writeConfirmQueue(
    userId,
    readConfirmQueue(userId, storage).filter((q) => q.clientId !== clientId),
    storage
  );
}

export type FlushOutcome = "synced" | "dropped" | "retry";

/**
 * Mengirim antrean berurutan. Hasil per item:
 * - synced: server menerima.
 * - dropped: server menolak permanen (mis. 404/409/400); item dibuang agar tidak menyumbat.
 * - retry: galat jaringan atau 5xx; berhenti dan simpan sisanya untuk nanti.
 */
export async function flushConfirmQueue(
  userId: string,
  send: (item: QueuedConfirmation) => Promise<FlushOutcome>,
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | undefined = safeStorage()
): Promise<{ synced: number; dropped: number; remaining: number }> {
  let synced = 0;
  let dropped = 0;
  for (const item of readConfirmQueue(userId, storage)) {
    let outcome: FlushOutcome;
    try {
      outcome = await send(item);
    } catch {
      outcome = "retry";
    }
    if (outcome === "retry") break;
    removeQueuedConfirmation(userId, item.clientId, storage);
    if (outcome === "synced") synced += 1;
    else dropped += 1;
  }
  return { synced, dropped, remaining: readConfirmQueue(userId, storage).length };
}

function newClientId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function safeStorage(): Storage | undefined {
  try {
    return typeof window !== "undefined" ? window.localStorage : undefined;
  } catch {
    return undefined;
  }
}
