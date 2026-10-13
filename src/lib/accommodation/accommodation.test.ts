import { describe, expect, it } from "vitest";
import {
  buildSuggestions,
  getPublishedRules,
  type AccommodationRuleRow,
} from "./index";

describe("src/lib/accommodation (Smart Accommodation Engine)", () => {
  const dummyRules: AccommodationRuleRow[] = [
    {
      id: "66666666-6666-4666-8666-666666666101",
      trigger_need_code: "komunikasi_bisindo",
      action_text: "Gunakan frasa dasar BISINDO atau papan komunikasi; pastikan wajah dan tangan terlihat jelas.",
      icon_name: "Hand",
      rationale: "Disusun bersama komunitas Tuli contoh dan tenaga kesehatan layanan primer.",
      version: 1,
      status: "published",
      approved_by: "Komunitas Tuli Contoh & Tim Layanan Inklusif",
      category: "komunikasi",
    },
    {
      id: "66666666-6666-4666-8666-666666666102",
      trigger_need_code: "komunikasi_tertulis",
      action_text: "Siapkan teks tertulis singkat untuk menjelaskan langkah pemeriksaan dan aturan pakai obat.",
      icon_name: "FileText",
      rationale: "Mencegah salah paham instruksi layanan pada pasien yang mengutamakan teks.",
      version: 1,
      status: "published",
      approved_by: "Komunitas Tuli Contoh & Tim Layanan Inklusif",
      category: "komunikasi",
    },
    {
      id: "66666666-6666-4666-8666-666666666103",
      trigger_need_code: "komunikasi_bicara_hadap",
      action_text: "Hadap pasien langsung saat berbicara dan hindari berbicara sambil membelakangi pasien.",
      icon_name: "MessageSquare",
      rationale: "Memudahkan pasien menangkap ekspresi wajah dan gerak bibir secara jelas.",
      version: 1,
      status: "published",
      approved_by: "Komunitas Tuli Contoh & Tim Layanan Inklusif",
      category: "komunikasi",
    },
    {
      id: "66666666-6666-4666-8666-666666666104",
      trigger_need_code: "komunikasi_papan_gambar",
      action_text: "Sediakan papan komunikasi bergambar agar pasien dapat menunjuk kebutuhan atau respons.",
      icon_name: "LayoutGrid",
      rationale: "Mendukung komunikasi dua arah tanpa tekanan verbal.",
      version: 1,
      status: "published",
      approved_by: "Komunitas Neurodivergen Contoh & Tim Layanan Inklusif",
      category: "komunikasi",
    },
    {
      id: "66666666-6666-4666-8666-666666666105",
      trigger_need_code: "antrean_visual_getar",
      action_text: "Tampilkan nomor giliran secara visual atau hampiri pasien saat gilirannya tiba.",
      icon_name: "BellRing",
      rationale: "Pasien tidak bergantung pada panggilan pengeras suara di ruang tunggu.",
      version: 1,
      status: "published",
      approved_by: "Komunitas Tuli Contoh & Tim Layanan Inklusif",
      category: "pendengaran",
    },
    {
      id: "66666666-6666-4666-8666-666666666106",
      trigger_need_code: "panduan_verbal",
      action_text: "Sapa pasien dengan menyebut nama dan peran Anda, lalu beri panduan lisan menuju ruang periksa.",
      icon_name: "Volume2",
      rationale: "Memberikan orientasi ruang yang jelas dan aman bagi pasien low vision/tunanetra.",
      version: 1,
      status: "published",
      approved_by: "Komunitas Tunanetra Contoh & Tim Layanan Inklusif",
      category: "penglihatan",
    },
    {
      id: "66666666-6666-4666-8666-666666666107",
      trigger_need_code: "teks_huruf_besar",
      action_text: "Tunjukkan informasi dengan ukuran huruf besar dan bacakan poin utama secara jelas.",
      icon_name: "Type",
      rationale: "Memudahkan keterbacaan materi informasi bagi pasien low vision.",
      version: 1,
      status: "published",
      approved_by: "Komunitas Tunanetra Contoh & Tim Layanan Inklusif",
      category: "penglihatan",
    },
    {
      id: "66666666-6666-4666-8666-666666666108",
      trigger_need_code: "jalur_kursi_roda",
      action_text: "Siapkan ruang periksa lantai dasar dengan jalur landai bebas hambatan.",
      icon_name: "Accessibility",
      rationale: "Memastikan akses mandiri dan aman bagi pengguna kursi roda atau alat bantu jalan.",
      version: 1,
      status: "published",
      approved_by: "Komunitas Mobilitas Contoh & Tim Layanan Inklusif",
      category: "mobilitas",
    },
    {
      id: "66666666-6666-4666-8666-666666666109",
      trigger_need_code: "bantuan_transfer",
      action_text: "Tanyakan cara bantu yang diinginkan sebelum membantu pasien berpindah dari kursi roda.",
      icon_name: "HeartHandshake",
      rationale: "Menjaga keamanan fisik dan menghormati kemandirian pasien saat berpindah posisi.",
      version: 1,
      status: "published",
      approved_by: "Komunitas Mobilitas Contoh & Tim Layanan Inklusif",
      category: "mobilitas",
    },
    {
      id: "66666666-6666-4666-8666-666666666110",
      trigger_need_code: "lingkungan_tenang",
      action_text: "Arahkan pasien ke area tunggu yang lebih tenang dan kurangi kebisingan mendadak.",
      icon_name: "VolumeX",
      rationale: "Mengurangi beban sensorik berlebih selama menunggu giliran layanan.",
      version: 1,
      status: "published",
      approved_by: "Komunitas Neurodivergen Contoh & Tim Layanan Inklusif",
      category: "sensorik_lingkungan",
    },
    {
      id: "66666666-6666-4666-8666-666666666111",
      trigger_need_code: "penjelasan_bertahap",
      action_text: "Jelaskan tahapan pemeriksaan satu per satu sebelum memulai dan beri waktu respons cukup.",
      icon_name: "ListChecks",
      rationale: "Membantu pasien memahami urutan layanan dengan tenang tanpa terburu-buru.",
      version: 1,
      status: "published",
      approved_by: "Komunitas Neurodivergen Contoh & Tim Layanan Inklusif",
      category: "sensorik_lingkungan",
    },
    {
      id: "66666666-6666-4666-8666-666666666112",
      trigger_need_code: "pendamping_di_ruang",
      action_text: "Izinkan pendamping resmi ikut mendampingi pasien di dalam ruang layanan.",
      icon_name: "Users",
      rationale: "Mendukung kenyamanan dan kelancaran komunikasi sesuai pilihan pasien.",
      version: 1,
      status: "published",
      approved_by: "Tim Kurator Komunitas Contoh",
      category: "pendampingan",
    },
    // Aturan draft (tidak boleh muncul)
    {
      id: "66666666-6666-4666-8666-666666666113",
      trigger_need_code: "antrean_visual_getar",
      action_text: "Contoh aturan draft: sinkronisasi layar nomor antrean ruang tunggu otomatis (belum terbit).",
      icon_name: "BellRing",
      rationale: "Draft usulan peningkatan layar antrean fasilitas.",
      version: 2,
      status: "draft",
      approved_by: null,
      category: "pendengaran",
    },
  ];

  describe("buildSuggestions (Fungsi Murni)", () => {
    it("profil Tuli menghasilkan saran sesuai aturan seed, aturan draft tidak muncul", () => {
      const tuliNeedCodes = [
        "komunikasi_bisindo",
        "komunikasi_tertulis",
        "komunikasi_bicara_hadap",
        "antrean_visual_getar",
      ];

      const res = buildSuggestions(dummyRules, tuliNeedCodes);

      expect(res.suggestions).toHaveLength(4);
      expect(res.uncoveredNeeds).toHaveLength(0);

      // Verifikasi bahwa aturan draft (id 113) tidak muncul
      const ids = res.suggestions.flatMap((s) => s.ruleIds);
      expect(ids).not.toContain("66666666-6666-4666-8666-666666666113");
      expect(ids).toContain("66666666-6666-4666-8666-666666666105");

      // Verifikasi urutan kategori: komunikasi lebih dulu dari pendengaran
      expect(res.suggestions[0].category).toBe("komunikasi");
      expect(res.suggestions[3].category).toBe("pendengaran");
    });

    it("profil autistik menghasilkan saran sesuai aturan seed", () => {
      const autistikNeedCodes = [
        "lingkungan_tenang",
        "penjelasan_bertahap",
        "komunikasi_papan_gambar",
      ];

      const res = buildSuggestions(dummyRules, autistikNeedCodes);

      expect(res.suggestions).toHaveLength(3);
      expect(res.uncoveredNeeds).toHaveLength(0);

      const actionTexts = res.suggestions.map((s) => s.actionText);
      expect(actionTexts).toContain(
        "Sediakan papan komunikasi bergambar agar pasien dapat menunjuk kebutuhan atau respons."
      );
      expect(actionTexts).toContain(
        "Arahkan pasien ke area tunggu yang lebih tenang dan kurangi kebisingan mendadak."
      );
      expect(actionTexts).toContain(
        "Jelaskan tahapan pemeriksaan satu per satu sebelum memulai dan beri waktu respons cukup."
      );
    });

    it("profil low vision menghasilkan saran sesuai aturan seed", () => {
      const lowVisionNeedCodes = [
        "panduan_verbal",
        "teks_huruf_besar",
        "pendamping_di_ruang",
      ];

      const res = buildSuggestions(dummyRules, lowVisionNeedCodes);

      expect(res.suggestions).toHaveLength(3);
      expect(res.uncoveredNeeds).toHaveLength(0);

      const icons = res.suggestions.map((s) => s.iconName);
      expect(icons).toContain("Volume2");
      expect(icons).toContain("Type");
      expect(icons).toContain("Users");
    });

    it("profil mobilitas menghasilkan saran sesuai aturan seed", () => {
      const mobilitasNeedCodes = [
        "jalur_kursi_roda",
        "bantuan_transfer",
        "pendamping_di_ruang",
      ];

      const res = buildSuggestions(dummyRules, mobilitasNeedCodes);

      expect(res.suggestions).toHaveLength(3);
      expect(res.uncoveredNeeds).toHaveLength(0);

      const icons = res.suggestions.map((s) => s.iconName);
      expect(icons).toContain("Accessibility");
      expect(icons).toContain("HeartHandshake");
      expect(icons).toContain("Users");
    });

    it("kebutuhan tanpa aturan muncul sebagai 'belum ada saran'", () => {
      const mixedCodes = ["komunikasi_bisindo", "kebutuhan_kustom_baru"];

      const res = buildSuggestions(dummyRules, mixedCodes, {
        kebutuhan_kustom_baru: {
          label: "Kebutuhan Kustom Baru",
          category: "komunikasi",
        },
      });

      expect(res.suggestions).toHaveLength(1);
      expect(res.suggestions[0].actionText).toContain("BISINDO");

      expect(res.uncoveredNeeds).toHaveLength(1);
      expect(res.uncoveredNeeds[0]).toEqual({
        code: "kebutuhan_kustom_baru",
        label: "Kebutuhan Kustom Baru",
      });
    });

    it("kode kebutuhan yang tidak dibagikan tidak menghasilkan saran", () => {
      // Pasien hanya membagikan 1 kebutuhan, meskipun database punya 12 aturan
      const singleSharedNeed = ["komunikasi_tertulis"];

      const res = buildSuggestions(dummyRules, singleSharedNeed);

      expect(res.suggestions).toHaveLength(1);
      expect(res.suggestions[0].actionText).toContain("Siapkan teks tertulis");
      expect(res.uncoveredNeeds).toHaveLength(0);
    });

    it("teks duplikat dari dua aturan berbeda digabungkan menjadi satu saran", () => {
      const duplicateRules: AccommodationRuleRow[] = [
        {
          id: "rule-1",
          trigger_need_code: "kebutuhan_a",
          action_text: "Sediakan air minum dan tempat duduk tenang.",
          icon_name: "VolumeX",
          rationale: "Alasan A",
          version: 1,
          status: "published",
          approved_by: "Tim A",
          category: "sensorik_lingkungan",
        },
        {
          id: "rule-2",
          trigger_need_code: "kebutuhan_b",
          action_text: "Sediakan air minum dan tempat duduk tenang.",
          icon_name: "VolumeX",
          rationale: "Alasan B",
          version: 2,
          status: "published",
          approved_by: "Tim B",
          category: "sensorik_lingkungan",
        },
      ];

      const res = buildSuggestions(duplicateRules, ["kebutuhan_a", "kebutuhan_b"]);

      expect(res.suggestions).toHaveLength(1);
      expect(res.suggestions[0].ruleIds).toEqual(["rule-1", "rule-2"]);
      expect(res.suggestions[0].version).toBe(2);
      expect(res.suggestions[0].source).toBe("Tim B");
    });
  });

  describe("getPublishedRules (Integrasi DB)", () => {
    it("mengambil aturan terbitan langsung dari database", async () => {
      const rules = await getPublishedRules([
        "komunikasi_bisindo",
        "antrean_visual_getar",
      ]);

      expect(rules.length).toBeGreaterThanOrEqual(2);
      // Aturan draft tidak boleh terbawa dari DB
      for (const r of rules) {
        expect(r.status).toBe("published");
      }
    });
  });
});
