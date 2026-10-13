import fs from "node:fs";
import path from "node:path";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const rootDir = path.resolve(__dirname, "..", "..");
const srcDir = path.resolve(rootDir, "src");

function getAllSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllSourceFiles(fullPath));
    } else if (
      entry.isFile() &&
      /\.(ts|tsx|js|jsx|mjs)$/.test(entry.name) &&
      !entry.name.endsWith(".d.ts")
    ) {
      files.push(fullPath);
    }
  }
  return files;
}

function isTestFile(filePath: string): boolean {
  return (
    filePath.includes("/__tests__/") ||
    filePath.endsWith(".test.ts") ||
    filePath.endsWith(".test.tsx") ||
    filePath.endsWith(".spec.ts") ||
    filePath.endsWith(".spec.tsx")
  );
}

describe("Tes Arsitektur Kode (Statik & Tanpa DB)", () => {
  const allSrcFiles = getAllSourceFiles(srcDir);

  it("pg hanya diimpor di src/db (di luar tes dan skrip)", () => {
    const violations: string[] = [];

    for (const file of allSrcFiles) {
      if (isTestFile(file)) continue;

      const relPath = path.relative(srcDir, file);
      if (relPath.startsWith("db/") || relPath.startsWith("db\\")) {
        continue;
      }

      const content = fs.readFileSync(file, "utf8");
      if (
        /(?:from\s+['"]pg['"]|require\(['"]pg['"]\)|from\s+['"]pg\/|require\(['"]pg\/)/.test(
          content
        )
      ) {
        violations.push(relPath);
      }
    }

    expect(
      violations,
      `Modul 'pg' ditemukan di luar src/db: ${violations.join(", ")}`
    ).toEqual([]);
  });

  it("string 'audit_events' hanya muncul di src/lib/audit, migrasi, dan tes", () => {
    const violations: string[] = [];

    for (const file of allSrcFiles) {
      if (isTestFile(file)) continue;

      const relPath = path.relative(srcDir, file);
      // Boleh di src/lib/audit dan src/db/migrations
      if (
        relPath.startsWith("lib/audit/") ||
        relPath.startsWith("lib\\audit\\") ||
        relPath.startsWith("db/migrations/") ||
        relPath.startsWith("db\\migrations\\")
      ) {
        continue;
      }

      const content = fs.readFileSync(file, "utf8");
      if (content.includes("audit_events")) {
        violations.push(relPath);
      }
    }

    expect(
      violations,
      `String 'audit_events' ditemukan di luar src/lib/audit dan migrasi: ${violations.join(", ")}`
    ).toEqual([]);
  });

  it("console. hanya muncul di file logger (di dalam src, di luar tes)", () => {
    const violations: string[] = [];

    for (const file of allSrcFiles) {
      if (isTestFile(file)) continue;

      const relPath = path.relative(srcDir, file);
      // Hanya diizinkan di src/lib/privacy/logger.ts
      if (
        relPath === "lib/privacy/logger.ts" ||
        relPath === "lib\\privacy\\logger.ts"
      ) {
        continue;
      }

      const content = fs.readFileSync(file, "utf8");
      if (/\bconsole\.(log|error|warn|info|debug|trace|table)\b/.test(content)) {
        violations.push(relPath);
      }
    }

    expect(
      violations,
      `Pemanggilan console ditemukan di luar src/lib/privacy/logger.ts: ${violations.join(", ")}`
    ).toEqual([]);
  });

  it("ESLint API: console.log(1) di file src/app/** memicu error; di file logger tidak", async () => {
    const eslint = new ESLint();

    const appVirtualFile = path.resolve(srcDir, "app", "page.tsx");
    const [appResult] = await eslint.lintText("console.log(1);\n", {
      filePath: appVirtualFile,
    });

    const hasAppConsoleError = appResult.messages.some(
      (m) => m.ruleId === "no-console" && m.severity === 2
    );
    expect(
      hasAppConsoleError,
      "ESLint seharusnya menghasilkan error no-console pada file di src/app/**"
    ).toBe(true);

    const loggerVirtualFile = path.resolve(
      srcDir,
      "lib",
      "privacy",
      "logger.ts"
    );
    const [loggerResult] = await eslint.lintText("console.log(1);\n", {
      filePath: loggerVirtualFile,
    });

    const hasLoggerConsoleError = loggerResult.messages.some(
      (m) => m.ruleId === "no-console"
    );
    expect(
      hasLoggerConsoleError,
      "ESLint TIDAK boleh menghasilkan error no-console pada file logger"
    ).toBe(false);
  });

  it("file middleware/proxy (src/proxy.ts atau src/middleware.ts) tidak mengimpor src/db atau pg", () => {
    const candidateFiles = [
      path.resolve(srcDir, "proxy.ts"),
      path.resolve(srcDir, "proxy.js"),
      path.resolve(srcDir, "middleware.ts"),
      path.resolve(srcDir, "middleware.js"),
    ];

    const existingFiles = candidateFiles.filter((f) => fs.existsSync(f));
    expect(
      existingFiles.length,
      "File proxy.ts atau middleware.ts harus ada di src/"
    ).toBeGreaterThanOrEqual(1);

    for (const filePath of existingFiles) {
      const content = fs.readFileSync(filePath, "utf8");
      const relPath = path.relative(srcDir, filePath);

      expect(
        /(?:from\s+['"].*\/db['"]|require\(['"].*\/db['"]\))/.test(content),
        `File ${relPath} mengimpor modul db: ${content}`
      ).toBe(false);

      expect(
        /(?:from\s+['"]pg['"]|require\(['"]pg['"]\)|from\s+['"]pg\/|require\(['"]pg\/)/.test(
          content
        ),
        `File ${relPath} mengimpor driver pg: ${content}`
      ).toBe(false);
    }
  });

  it("tabel patient_profiles dan patient_profile_needs hanya muncul di src/lib/consent, src/lib/passport, src/db, dan tes", () => {
    const violations: string[] = [];

    for (const file of allSrcFiles) {
      if (isTestFile(file)) continue;

      const relPath = path.relative(srcDir, file);
      // Diizinkan di src/lib/consent/, src/lib/passport/, dan src/db/ (serta migrasi)
      if (
        relPath.startsWith("lib/consent/") ||
        relPath.startsWith("lib\\consent\\") ||
        relPath.startsWith("lib/passport/") ||
        relPath.startsWith("lib\\passport\\") ||
        relPath.startsWith("db/") ||
        relPath.startsWith("db\\")
      ) {
        continue;
      }

      const content = fs.readFileSync(file, "utf8");
      if (
        content.includes("patient_profiles") ||
        content.includes("patient_profile_needs")
      ) {
        violations.push(relPath);
      }
    }

    expect(
      violations,
      `Tabel patient_profiles/patient_profile_needs ditemukan di luar src/lib/consent, src/lib/passport, dan src/db: ${violations.join(", ")}`
    ).toEqual([]);
  });

  it("src/app tidak mengimpor src/db atau pg (di luar file tes)", () => {
    const violations: string[] = [];

    for (const file of allSrcFiles) {
      if (isTestFile(file)) continue;

      const relPath = path.relative(srcDir, file);
      if (!relPath.startsWith("app/") && !relPath.startsWith("app\\")) {
        continue;
      }

      const content = fs.readFileSync(file, "utf8");
      if (
        /(?:from\s+['"].*\/db['"]|require\(['"].*\/db['"]\)|from\s+['"]@\/db['"]|require\(['"]@\/db['"]\))/.test(
          content
        )
      ) {
        violations.push(`${relPath} mengimpor src/db`);
      }

      if (
        /(?:from\s+['"]pg['"]|require\(['"]pg['"]\)|from\s+['"]pg\/|require\(['"]pg\/)/.test(
          content
        )
      ) {
        violations.push(`${relPath} mengimpor pg`);
      }
    }

    expect(
      violations,
      `Ditemukan impor src/db atau pg di dalam src/app: ${violations.join(", ")}`
    ).toEqual([]);
  });

  it("route scan (src/app/api/scan/route.ts) hanya mengimpor dari lib/auth, lib/consent, lib/http", () => {
    const scanRoutePath = path.resolve(srcDir, "app", "api", "scan", "route.ts");
    expect(
      fs.existsSync(scanRoutePath),
      "File src/app/api/scan/route.ts harus ada"
    ).toBe(true);

    const content = fs.readFileSync(scanRoutePath, "utf8");
    const importRegex = /(?:from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g;
    let match: RegExpExecArray | null;
    const imports: string[] = [];

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1] || match[2];
      imports.push(importPath);
    }

    expect(imports.length).toBeGreaterThan(0);

    for (const imp of imports) {
      const isAllowed =
        imp.endsWith("/lib/auth") ||
        imp.endsWith("/lib/consent") ||
        imp.endsWith("/lib/http") ||
        imp === "@/lib/auth" ||
        imp === "@/lib/consent" ||
        imp === "@/lib/http";

      expect(
        isAllowed,
        `Import '${imp}' di src/app/api/scan/route.ts tidak diizinkan. Hanya lib/auth, lib/consent, lib/http yang diperbolehkan.`
      ).toBe(true);
    }
  });

  it("tidak ada kode hex di src di luar blok token globals.css dan tokens.ts", () => {
    const violations: { file: string; matches: string[] }[] = [];

    for (const file of allSrcFiles) {
      if (isTestFile(file)) continue;

      const relPath = path.relative(srcDir, file);
      // Diizinkan di src/app/globals.css dan src/lib/tokens.ts
      if (
        relPath === "app/globals.css" ||
        relPath === "app\\globals.css" ||
        relPath === "lib/tokens.ts" ||
        relPath === "lib\\tokens.ts"
      ) {
        continue;
      }

      const content = fs.readFileSync(file, "utf8");
      const matches = content.match(
        /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g
      );
      if (matches && matches.length > 0) {
        violations.push({ file: relPath, matches });
      }
    }

    expect(
      violations,
      `Kode warna hex ditemukan di luar globals.css dan tokens.ts: ${JSON.stringify(
        violations
      )}`
    ).toEqual([]);
  });

  it("tidak ada kelas warna palet Tailwind selain yang tercantum di design.md §2 dan token langkah 2", () => {
    const forbiddenFamilies = [
      "gray",
      "zinc",
      "neutral",
      "stone",
      "orange",
      "yellow",
      "lime",
      "green",
      "teal",
      "sky",
      "blue",
      "indigo",
      "violet",
      "purple",
      "fuchsia",
      "pink",
      "rose",
    ];

    const allowedShades: Record<string, string[]> = {
      cyan: ["50", "100", "200", "400", "600", "700", "800", "900"],
      slate: ["200", "500", "600"],
      emerald: ["50", "200", "700"],
      amber: ["50", "200", "700"],
      red: ["50", "200", "700"],
    };

    const violations: string[] = [];

    for (const file of allSrcFiles) {
      if (isTestFile(file)) continue;

      const relPath = path.relative(srcDir, file);
      const content = fs.readFileSync(file, "utf8");

      // Cek forbidden color families
      for (const family of forbiddenFamilies) {
        const regex = new RegExp(
          `(?:bg|text|border|ring|divide|from|to|via)-${family}-\\d+`,
          "g"
        );
        const matches = content.match(regex);
        if (matches) {
          violations.push(
            `${relPath} memakai warna terlarang: ${matches.join(", ")}`
          );
        }
      }

      // Cek allowed colors tapi unallowed shades
      const colorRegex =
        /(?:bg|text|border|ring|divide|from|to|via)-(cyan|slate|emerald|amber|red)-(\d+)/g;
      let m: RegExpExecArray | null;
      while ((m = colorRegex.exec(content)) !== null) {
        const [, color, shade] = m;
        if (!allowedShades[color]?.includes(shade)) {
          violations.push(
            `${relPath} memakai shade tidak terdaftar ${m[0]}`
          );
        }
      }
    }

    expect(
      violations,
      `Pelanggaran palet Tailwind ditemukan: ${violations.join("; ")}`
    ).toEqual([]);
  });

  it("token warna status hanya dipakai di StatusBanner dan CareProofScale (architecture.md §14)", () => {
    const violations: string[] = [];

    for (const file of allSrcFiles) {
      if (isTestFile(file)) continue;

      const relPath = path.relative(srcDir, file);
      // Diizinkan di StatusBanner, CareProofScale, tokens.ts, dan halaman katalog dev
      if (
        relPath === "components/status-banner.tsx" ||
        relPath === "components\\status-banner.tsx" ||
        relPath === "components/care-proof-scale.tsx" ||
        relPath === "components\\care-proof-scale.tsx" ||
        relPath === "lib/tokens.ts" ||
        relPath === "lib\\tokens.ts" ||
        relPath.startsWith("app/dev/katalog") ||
        relPath.startsWith("app\\dev\\katalog")
      ) {
        continue;
      }

      const content = fs.readFileSync(file, "utf8");
      const statusClassRegex =
        /(?:bg|text|border|ring|divide)-(?:emerald|amber|red|success|warning|error)[a-zA-Z0-9_-]*/g;
      const matches = content.match(statusClassRegex);
      if (matches && matches.length > 0) {
        violations.push(`${relPath}: ${matches.join(", ")}`);
      }
    }

    expect(
      violations,
      `Warna status ditemukan di luar StatusBanner, CareProofScale, dan katalog: ${violations.join(
        "; "
      )}`
    ).toEqual([]);
  });

  it("tidak ada font-medium/font-semibold, atribut placeholder, atau kelas animate-*", () => {
    const violations: string[] = [];

    for (const file of allSrcFiles) {
      if (isTestFile(file)) continue;

      const relPath = path.relative(srcDir, file);
      const content = fs.readFileSync(file, "utf8");

      if (content.includes("font-medium")) {
        violations.push(`${relPath} mengandung font-medium`);
      }
      if (content.includes("font-semibold")) {
        violations.push(`${relPath} mengandung font-semibold`);
      }
      if (/\bplaceholder\s*=/i.test(content)) {
        violations.push(`${relPath} mengandung atribut placeholder`);
      }
      if (/\banimate-[a-zA-Z0-9_-]+/i.test(content)) {
        violations.push(`${relPath} mengandung kelas animate-*`);
      }
    }

    expect(
      violations,
      `Pelanggaran tipografi/placeholder/animasi ditemukan: ${violations.join(
        "; "
      )}`
    ).toEqual([]);
  });

  it("kata 'diagnos' tidak muncul di src/app dan src/components (tidak ada kolom, label, atau input diagnosis; hanya kalimat privasi)", () => {
    const violations: string[] = [];

    for (const file of allSrcFiles) {
      if (isTestFile(file)) continue;

      const relPath = path.relative(srcDir, file);
      if (
        !relPath.startsWith("app/") &&
        !relPath.startsWith("app\\") &&
        !relPath.startsWith("components/") &&
        !relPath.startsWith("components\\")
      ) {
        continue;
      }

      const content = fs.readFileSync(file, "utf8");

      // 1. Dilarang keras ada input, textarea, select, label, name, id, prop, atau identifier 'diagnos'
      const forbiddenIdentifierRegex =
        /(?:<input[^>]*diagnos|<textarea[^>]*diagnos|<select[^>]*diagnos|<label[^>]*diagnos|name=['"][^'"]*diagnos|id=['"][^'"]*diagnos|data-testid=['"][^'"]*diagnos|\bdiagnos[a-z]*\s*:|\bdiagnos[a-z]*\s*=)/i;
      const idMatch = content.match(forbiddenIdentifierRegex);
      if (idMatch) {
        violations.push(`${relPath} mengandung identifier/input diagnosis: ${idMatch[0]}`);
      }

      // 2. Setiap baris yang memuat 'diagnos' harus berupa pernyataan privasi resmi bahwa diagnosis TIDAK diminta
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (/\bdiagnos/i.test(line)) {
          const isAllowedPrivacyDisclaimer =
            /tidak meminta diagnosis|tidak perlu menulis diagnosis|diagnosis tidak diminta/i.test(
              line
            );
          if (!isAllowedPrivacyDisclaimer) {
            violations.push(
              `${relPath} baris ${i + 1}: kemunculan kata diagnos di luar kalimat privasi yang diizinkan: "${line.trim()}"`
            );
          }
        }
      }
    }

    expect(
      violations,
      `Pelanggaran kata 'diagnos' ditemukan di src/app atau src/components: ${violations.join(
        "; "
      )}`
    ).toEqual([]);
  });
});

