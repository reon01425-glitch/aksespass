"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  CircleHelp,
  GlassWater,
  HandHelping,
  HeartPulse,
  Mic,
  MicOff,
  RotateCcw,
  Toilet,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import { Button, StatusBanner, TextField } from "@/components";
import { KomunikaMessageList, useKomunikaThread } from "@/components/komunikacare-thread";
import { messageText } from "@/lib/komunikacare/board";

type TabId = "papan" | "suara" | "teks";

const TABS: { id: TabId; label: string }[] = [
  { id: "papan", label: "Papan Bergambar" },
  { id: "suara", label: "Teks ke Suara" },
  { id: "teks", label: "Teks Langsung" },
];

const BOARD_ITEMS: { id: string; label: string; sentence: string; Icon: LucideIcon }[] = [
  { id: "nyeri", label: "Nyeri", sentence: "Saya merasa nyeri.", Icon: HeartPulse },
  { id: "haus", label: "Haus", sentence: "Saya haus. Mohon air minum.", Icon: GlassWater },
  { id: "toilet", label: "Toilet", sentence: "Saya perlu ke toilet.", Icon: Toilet },
  { id: "ulang", label: "Ulangi", sentence: "Mohon ulangi, lebih pelan dan jelas.", Icon: RotateCcw },
  { id: "bantuan", label: "Butuh Bantuan", sentence: "Saya butuh bantuan.", Icon: HandHelping },
  { id: "tidak-paham", label: "Tidak Mengerti", sentence: "Saya belum mengerti. Mohon tulis atau tunjukkan.", Icon: CircleHelp },
];

const QUICK_PHRASES = [
  "Mohon tulis, saya tidak mendengar.",
  "Mohon bicara menghadap saya.",
  "Saya butuh waktu untuk membaca.",
  "Mohon ulangi pelan-pelan.",
];

/* ---------- Web Speech API (tanpa tipe bawaan di TypeScript DOM lib) ---------- */
interface RecognitionAlternative {
  transcript: string;
  confidence: number;
}
interface RecognitionResult {
  isFinal: boolean;
  length: number;
  [index: number]: RecognitionAlternative;
}
interface RecognitionEvent {
  resultIndex: number;
  results: { length: number; [index: number]: RecognitionResult };
}
interface RecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => RecognitionLike;

function getRecognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Layar baca besar untuk petugas. */
function BigText({ text, label }: { text: string; label: string }) {
  return (
    <div
      role="region"
      aria-label={label}
      aria-live="polite"
      className="min-h-40 w-full p-5 rounded-2xl bg-white border-2 border-cyan-800 text-main"
    >
      {text ? (
        <div className="text-4xl font-bold break-words leading-tight">{text}</div>
      ) : (
        <p className="text-lg text-secondary">Belum ada teks.</p>
      )}
    </div>
  );
}

/* ---------------------------------- P15.1 ---------------------------------- */
type SendFn = (kind: "icon" | "text", body: string) => void;

function PapanBergambar({ onSend }: { onSend: SendFn }) {
  const [selected, setSelected] = useState<string | null>(null);
  const item = BOARD_ITEMS.find((b) => b.id === selected);
  return (
    <div className="flex flex-col gap-5">
      <p className="text-base text-secondary">
        Tekan gambar. Kalimat besar akan muncul untuk dibaca petugas.
      </p>
      <BigText text={item ? item.sentence : ""} label="Pesan untuk petugas" />
      <ul className="m-0 grid list-none grid-cols-2 gap-3 p-0 [&>*:last-child:nth-child(odd)]:col-span-2">
        {BOARD_ITEMS.map(({ id, label, Icon }) => {
          const active = id === selected;
          return (
            <li key={id}>
              <button
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setSelected(id);
                  onSend("icon", id);
                }}
                className={`flex min-h-32 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 p-3 text-lg font-bold focus:outline-none focus:ring-4 focus:ring-cyan-900 ${
                  active
                    ? "bg-cyan-800 border-cyan-900 text-white"
                    : "bg-white border-cyan-700 text-cyan-900"
                }`}
              >
                <Icon aria-hidden="true" className="h-10 w-10" />
                <span className="break-words text-center">{label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ---------------------------------- P15.2 ---------------------------------- */
function TeksKeSuara({ onSend }: { onSend: SendFn }) {
  const [text, setText] = useState("");
  const [supported, setSupported] = useState(true);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    // Dukungan suara hanya diketahui di peramban setelah hidrasi.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = () => {
    const value = text.trim();
    if (!value) return;
    onSend("text", value);
    if (!supported) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = "id-ID";
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="text-base text-secondary">
        Ketik atau pilih kalimat, lalu tekan Ucapkan agar petugas mendengar.
        Teks yang sama tampil besar untuk dibaca.
      </p>

      {!supported && (
        <StatusBanner
          variant="warning"
          title="Suara tidak didukung"
          message="Peramban ini tidak bisa mengucapkan teks. Tunjukkan layar ini kepada petugas agar mereka membaca teksnya."
        />
      )}

      <TextField
        id="teks-ke-suara"
        label="Kalimat untuk petugas"
        variant="textarea"
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={300}
      />

      <ul className="flex flex-wrap gap-2" aria-label="Kalimat cepat">
        {QUICK_PHRASES.map((phrase) => (
          <li key={phrase}>
            <button
              type="button"
              onClick={() => setText(phrase)}
              className="min-h-12 rounded-lg border border-cyan-700 bg-cyan-100 px-4 py-2 text-left text-base font-bold text-cyan-900 focus:outline-none focus:ring-4 focus:ring-cyan-900"
            >
              {phrase}
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          onClick={speak}
          disabled={!text.trim()}
          className="w-full sm:w-auto flex items-center justify-center gap-2"
        >
          <Volume2 aria-hidden="true" className="h-5 w-5 shrink-0" />
          <span>Ucapkan</span>
        </Button>
        {speaking && (
          <Button type="button" variant="secondary" onClick={stop} className="w-full sm:w-auto">
            Berhenti
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          onClick={() => setText("")}
          disabled={!text}
          className="w-full sm:w-auto"
        >
          Hapus Teks
        </Button>
      </div>

      <BigText text={text.trim()} label="Teks untuk dibaca petugas" />
    </div>
  );
}

/* ---------------------------------- P15.3 ---------------------------------- */
function TeksLangsung({ synced }: { synced: boolean }) {
  const [supported, setSupported] = useState(true);
  const [listening, setListening] = useState(false);
  const [finalText, setFinalText] = useState("");
  const [interim, setInterim] = useState("");
  const [lowAccuracy, setLowAccuracy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const recRef = useRef<RecognitionLike | null>(null);

  useEffect(() => {
    // Dukungan pengenalan suara hanya diketahui di peramban setelah hidrasi.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(getRecognitionCtor() !== null);
    return () => recRef.current?.abort();
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    recRef.current?.abort();
    setError(null);
    setInterim("");

    const rec = new Ctor();
    rec.lang = "id-ID";
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let finals = "";
      let partial = "";
      let confidenceSum = 0;
      let confidenceCount = 0;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const alt = r[0];
        if (!alt) continue;
        if (r.isFinal) {
          finals += alt.transcript;
          if (alt.confidence > 0) {
            confidenceSum += alt.confidence;
            confidenceCount += 1;
          }
        } else {
          partial += alt.transcript;
        }
      }
      if (finals) setFinalText((prev) => `${prev}${prev ? " " : ""}${finals.trim()}`);
      setInterim(partial);
      if (confidenceCount > 0) setLowAccuracy(confidenceSum / confidenceCount < 0.6);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setError("Izin mikrofon ditolak. Izinkan mikrofon di pengaturan peramban, atau minta petugas menulis di kolom di bawah.");
      } else if (e.error === "no-speech") {
        setError("Tidak ada suara terdengar. Tekan Mulai Dengarkan lagi, atau minta petugas menulis.");
      } else if (e.error === "audio-capture") {
        setError("Mikrofon tidak ditemukan. Minta petugas menulis di kolom di bawah.");
      } else if (e.error !== "aborted") {
        setError("Pengenalan suara gagal. Minta petugas menulis di kolom di bawah.");
      }
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setError("Tidak dapat memulai pengenalan suara. Minta petugas menulis di kolom di bawah.");
    }
  }, []);

  const stop = () => {
    recRef.current?.stop();
    setListening(false);
  };

  const repeat = () => {
    setFinalText("");
    setInterim("");
    setLowAccuracy(false);
    start();
  };

  const shown = `${finalText}${interim ? `${finalText ? " " : ""}${interim}` : ""}`;

  return (
    <div className="flex flex-col gap-5">
      <StatusBanner
        variant="warning"
        title="Alat bantu, bukan pengganti juru bahasa isyarat"
        message="Hasil teks bisa keliru. Bila ragu, minta petugas menulis atau hadirkan juru bahasa isyarat."
      />

      {!supported && (
        <StatusBanner
          variant="warning"
          title="Teks langsung tidak tersedia"
          message="Peramban ini tidak mendukung pengenalan suara. Gunakan kolom ketik di bawah agar petugas menulis pesannya."
        />
      )}
      {error && <StatusBanner variant="error" title="Perlu perhatian" message={error} />}
      {lowAccuracy && (
        <StatusBanner
          variant="warning"
          title="Akurasi rendah"
          message="Tekan Ulangi, atau minta petugas menulis."
        />
      )}

      <BigText text={shown} label="Ucapan petugas sebagai teks" />

      <div className="flex flex-wrap gap-3">
        {!listening ? (
          <Button
            type="button"
            onClick={start}
            disabled={!supported}
            className="w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <Mic aria-hidden="true" className="h-5 w-5 shrink-0" />
            <span>Mulai Dengarkan</span>
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={stop}
            className="w-full sm:w-auto flex items-center justify-center gap-2"
          >
            <MicOff aria-hidden="true" className="h-5 w-5 shrink-0" />
            <span>Berhenti</span>
          </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          onClick={repeat}
          disabled={!supported}
          className="w-full sm:w-auto flex items-center justify-center gap-2"
        >
          <RotateCcw aria-hidden="true" className="h-5 w-5 shrink-0" />
          <span>Ulangi</span>
        </Button>
      </div>
      <p role="status" className="text-base font-bold text-main">
        {listening ? "Sedang mendengarkan…" : "Tidak mendengarkan"}
      </p>

      <TextField
        id="teks-petugas-menulis"
        label="Petugas menulis di sini"
        variant="textarea"
        rows={4}
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        maxLength={500}
        helperText="Cadangan bila suara tidak terbaca. Tulisan hanya ada di layar ini."
      />
      {typed.trim() && <BigText text={typed.trim()} label="Tulisan petugas" />}

      <p className="text-sm text-secondary">
        Privasi: di sebagian peramban (misalnya Chrome di Android), suara
        diproses layanan pengenalan suara pihak ketiga seperti Google. AKSESPASS
        tidak menyimpan atau mengirim suara maupun teks hasil pengenalan suara
        ke server kami.
        {synced
          ? " Pesan yang Anda kirim lewat gambar atau tombol Ucapkan, dan pesan tulisan petugas, disimpan sementara selama kunjungan ini dan dihapus saat pelayanan selesai."
          : " Teks hilang saat halaman ditutup."}
      </p>
    </div>
  );
}

/* ---------------------------------- Halaman --------------------------------- */
export function KomunikaCareClient({ visitId = null }: { visitId?: string | null }) {
  const [tab, setTab] = useState<TabId>("papan");
  const thread = useKomunikaThread(visitId);
  const [sendNote, setSendNote] = useState<{ ok: boolean; text: string } | null>(null);
  const onSend: SendFn = (kind, body) => {
    if (!visitId) return;
    void thread.send(kind, body).then((r) =>
      setSendNote(
        r.ok
          ? { ok: true, text: "Terkirim ke petugas." }
          : { ok: false, text: r.message ?? "Pesan tidak terkirim." }
      )
    );
  };
  const latestStaff = [...thread.messages].reverse().find((m) => m.sender === "staff");

  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    const index = TABS.findIndex((t) => t.id === tab);
    let next = index;
    if (e.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (e.key === "ArrowLeft") next = (index - 1 + TABS.length) % TABS.length;
    else return;
    e.preventDefault();
    setTab(TABS[next].id);
    document.getElementById(`tab-${TABS[next].id}`)?.focus();
  };

  return (
    <div className="flex flex-col gap-6 max-w-full w-full">
      {visitId && (
        <section aria-label="Percakapan dengan petugas" className="flex flex-col gap-3">
          {thread.ended && (
            <p role="status" className="text-base font-bold text-main">
              Pelayanan selesai. Percakapan ditutup dan pesan dihapus.
            </p>
          )}
          {!thread.online && !thread.ended && (
            <StatusBanner
              variant="warning"
              title="Sambungan terputus"
              message="Pesan petugas belum bisa dimuat. Mencoba lagi otomatis."
            />
          )}
          {sendNote && !sendNote.ok && (
            <StatusBanner variant="error" title="Perlu perhatian" message={sendNote.text} />
          )}
          {sendNote?.ok && (
            <p role="status" className="text-base font-bold text-main">
              {sendNote.text}
            </p>
          )}
          <h2 className="text-xl font-bold text-main">Pesan dari petugas</h2>
          {latestStaff ? (
            <div
              role="region"
              aria-label="Pesan terbaru dari petugas"
              aria-live="assertive"
              data-testid="pesan-petugas-besar"
              className="w-full p-5 rounded-2xl bg-white border-2 border-cyan-800 text-main"
            >
              <div className="text-4xl font-bold break-words leading-tight">
                {messageText(latestStaff)}
              </div>
            </div>
          ) : (
            <p className="text-base text-secondary">Belum ada pesan dari petugas.</p>
          )}
          {thread.messages.length > 1 && (
            <details>
              <summary className="min-h-12 cursor-pointer py-3 text-base font-bold text-cyan-900">
                Riwayat percakapan
              </summary>
              <KomunikaMessageList
                messages={thread.messages}
                viewer="patient"
                label="Riwayat percakapan"
              />
            </details>
          )}
        </section>
      )}
      <div role="tablist" aria-label="Cara berkomunikasi" className="grid grid-cols-3 gap-2">
        {TABS.map(({ id, label }) => {
          const active = id === tab;
          return (
            <button
              key={id}
              id={`tab-${id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`panel-${id}`}
              tabIndex={active ? 0 : -1}
              onClick={() => setTab(id)}
              onKeyDown={onKeyDown}
              className={`min-h-14 rounded-lg border-2 px-2 py-2 text-sm font-bold break-words focus:outline-none focus:ring-4 focus:ring-cyan-900 ${
                active
                  ? "bg-cyan-800 border-cyan-900 text-white"
                  : "bg-white border-cyan-700 text-cyan-900"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === "papan" && <PapanBergambar onSend={onSend} />}
        {tab === "suara" && <TeksKeSuara onSend={onSend} />}
        {tab === "teks" && <TeksLangsung synced={visitId !== null} />}
      </div>
    </div>
  );
}
