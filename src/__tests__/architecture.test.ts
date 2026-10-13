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

  it("tabel patient_profiles dan patient_profile_needs hanya muncul di src/lib/consent, src/db, dan tes", () => {
    const violations: string[] = [];

    for (const file of allSrcFiles) {
      if (isTestFile(file)) continue;

      const relPath = path.relative(srcDir, file);
      // Diizinkan di src/lib/consent/ dan src/db/ (serta migrasi)
      if (
        relPath.startsWith("lib/consent/") ||
        relPath.startsWith("lib\\consent\\") ||
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
      `Tabel patient_profiles/patient_profile_needs ditemukan di luar src/lib/consent dan src/db: ${violations.join(", ")}`
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
});

