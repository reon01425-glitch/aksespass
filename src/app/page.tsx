export default function HomePage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-[60ch] flex-1 flex-col items-start justify-center gap-4 px-4 py-8 focus:outline-none"
    >
      <h1 className="font-bold text-main">AKSESPASS</h1>
      <p className="text-base font-normal leading-[1.6] text-main">
        Bantu pasien menyampaikan kebutuhan layanan kepada petugas fasilitas
        kesehatan tanpa mengulang cerita, dengan kendali persetujuan sepenuhnya
        di tangan pasien.
      </p>
      <button
        type="button"
        className="h-12 px-6 bg-cyan-700 text-white font-bold rounded-lg shadow-sm focus:ring-4 focus:ring-cyan-900 focus:ring-offset-2 focus-visible:ring-4 focus-visible:ring-cyan-900 focus-visible:ring-offset-2"
      >
        Mulai
      </button>
    </main>
  );
}
