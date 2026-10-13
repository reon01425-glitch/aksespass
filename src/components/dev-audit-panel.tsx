"use client";

import React, { useState } from "react";

export function DevAuditPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [is200Percent, setIs200Percent] = useState(false);

  // Results state
  const [axeSummary, setAxeSummary] = useState<string | null>(null);
  const [touchSummary, setTouchSummary] = useState<string | null>(null);
  const [scrollSummary, setScrollSummary] = useState<string | null>(null);
  const [isRunningAxe, setIsRunningAxe] = useState(false);

  // 1. Accessibility Check via axe-core
  const runAxeAudit = async () => {
    setIsRunningAxe(true);
    setAxeSummary("Menjalankan axe-core...");
    try {
      const axe = (await import("axe-core")).default;
      const results = await axe.run({
        exclude: [["#dev-audit-panel"]],
      });
      (window as unknown as { __lastAxeResults: unknown }).__lastAxeResults = results;

      if (results.violations.length === 0) {
        setAxeSummary("✓ 0 pelanggaran aksesibilitas ditemukan oleh axe-core.");
      } else {
        const details = results.violations
          .map(
            (v, idx) =>
              `${idx + 1}. [${v.impact?.toUpperCase()}] ${v.id}: ${v.help} (${v.nodes.length} elemen)`
          )
          .join("\n");
        setAxeSummary(
          `✗ Ditemukan ${results.violations.length} pelanggaran:\n${details}`
        );
      }
    } catch (err) {
      setAxeSummary(`Galat saat menjalankan axe: ${String(err)}`);
    } finally {
      setIsRunningAxe(false);
    }
  };

  // 2. Touch Target Check (< 48x48 px)
  const runTouchAudit = () => {
    const candidates = Array.from(
      document.querySelectorAll<HTMLElement>(
        'button, a, input, select, textarea, [role="button"], [role="switch"], [role="checkbox"], [role="radio"]'
      )
    ).filter((el) => {
      if (el.closest("#dev-audit-panel")) return false;
      // Skip visually hidden controls (wrapped by larger target)
      if (
        el.classList.contains("sr-only") ||
        el.getAttribute("aria-hidden") === "true" ||
        el.offsetParent === null
      ) {
        return false;
      }
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });

    const failed: string[] = [];
    for (const el of candidates) {
      const rect = el.getBoundingClientRect();
      if (rect.width < 47.9 || rect.height < 47.9) {
        // If it's inside a label that is at least 48x48, it is accessible via that label
        const parentLabel = el.closest("label");
        if (parentLabel && parentLabel !== el) {
          const pRect = parentLabel.getBoundingClientRect();
          if (pRect.width >= 47.9 && pRect.height >= 47.9) {
            continue;
          }
        }
        const text = (
          el.textContent ||
          el.getAttribute("aria-label") ||
          el.id ||
          el.tagName
        )
          .trim()
          .slice(0, 30);
        failed.push(
          `<${el.tagName.toLowerCase()}> "${text}": ${Math.round(
            rect.width
          )}×${Math.round(rect.height)} px`
        );
      }
    }

    if (failed.length === 0) {
      setTouchSummary(
        `✓ Semua elemen interaktif memenuhi ukuran ≥ 48×48 px (${candidates.length} diperiksa).`
      );
    } else {
      setTouchSummary(
        `✗ Ditemukan ${failed.length} elemen < 48×48 px:\n` + failed.join("\n")
      );
    }
  };

  // 3. Horizontal Scroll Check
  const runScrollAudit = () => {
    const scrollWidth = document.documentElement.scrollWidth;
    const clientWidth = document.documentElement.clientWidth;
    const innerWidth = window.innerWidth;
    const hasScroll = scrollWidth > clientWidth;

    if (!hasScroll) {
      setScrollSummary(
        `✓ Tidak ada scroll horizontal (scrollWidth: ${scrollWidth}px <= clientWidth: ${clientWidth}px, window: ${innerWidth}px).`
      );
    } else {
      setScrollSummary(
        `✗ ADA SCROLL HORIZONTAL: scrollWidth (${scrollWidth}px) > clientWidth (${clientWidth}px)! Selisih: ${
          scrollWidth - clientWidth
        }px.`
      );
    }
  };

  // 4. Toggle 200% text zoom
  const toggleTextZoom = () => {
    const nextVal = !is200Percent;
    setIs200Percent(nextVal);
    if (nextVal) {
      document.documentElement.style.fontSize = "200%";
    } else {
      document.documentElement.style.fontSize = "";
    }
  };

  return (
    <aside
      id="dev-audit-panel"
      data-dev-panel="true"
      aria-label="Panel Pemeriksaan Pengembangan"
      className="fixed bottom-4 right-4 z-50 flex flex-col items-end font-sans text-sm text-cyan-900 max-w-[calc(100vw-2rem)]"
    >
      {isOpen ? (
        <div className="w-80 sm:w-96 max-w-full p-4 rounded-xl bg-white border-2 border-cyan-700 shadow-2xl flex flex-col gap-3 max-h-[85vh] overflow-y-auto">
          <div className="flex items-center justify-between border-b border-cyan-100 pb-2">
            <span className="font-bold text-base text-cyan-900">
              🛠️ Panel Pemeriksaan Dev
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2 py-1 bg-cyan-100 rounded text-cyan-900 font-bold hover:bg-cyan-200"
              aria-label="Tutup Panel Dev"
            >
              ✕
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={isRunningAxe}
              onClick={runAxeAudit}
              className="w-full h-11 px-3 bg-cyan-700 text-white font-bold rounded-lg hover:bg-cyan-800 disabled:opacity-50 text-left flex items-center justify-between"
            >
              <span>🔍 Cek Aksesibilitas (axe)</span>
              {isRunningAxe && <span className="text-xs">...</span>}
            </button>
            {axeSummary && (
              <pre className="p-2 bg-cyan-50 border border-cyan-200 rounded text-xs whitespace-pre-wrap text-cyan-900 font-mono">
                {axeSummary}
              </pre>
            )}

            <button
              type="button"
              onClick={runTouchAudit}
              className="w-full h-11 px-3 bg-cyan-700 text-white font-bold rounded-lg hover:bg-cyan-800 text-left"
            >
              🎯 Cek Target Sentuh (≥ 48px)
            </button>
            {touchSummary && (
              <pre className="p-2 bg-cyan-50 border border-cyan-200 rounded text-xs whitespace-pre-wrap text-cyan-900 font-mono">
                {touchSummary}
              </pre>
            )}

            <button
              type="button"
              onClick={runScrollAudit}
              className="w-full h-11 px-3 bg-cyan-700 text-white font-bold rounded-lg hover:bg-cyan-800 text-left"
            >
              ↔️ Cek Scroll Horizontal
            </button>
            {scrollSummary && (
              <pre className="p-2 bg-cyan-50 border border-cyan-200 rounded text-xs whitespace-pre-wrap text-cyan-900 font-mono">
                {scrollSummary}
              </pre>
            )}

            <div className="pt-2 border-t border-cyan-100 flex items-center justify-between">
              <span className="font-bold">Simulasi Teks 200%:</span>
              <button
                type="button"
                onClick={toggleTextZoom}
                className={`px-3 py-1.5 rounded-lg font-bold border ${
                  is200Percent
                    ? "bg-cyan-700 text-white border-cyan-800"
                    : "bg-cyan-100 text-cyan-900 border-cyan-700 hover:bg-cyan-200"
                }`}
              >
                {is200Percent ? "Aktif (200%)" : "Nonaktif (100%)"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="h-12 px-4 rounded-full bg-cyan-700 text-white font-bold shadow-lg hover:bg-cyan-800 flex items-center gap-2 border-2 border-white focus:outline-none focus:ring-4 focus:ring-cyan-900"
          aria-label="Buka Panel Pemeriksaan Aksesibilitas"
        >
          <span>🛠️ Dev Audit</span>
        </button>
      )}
    </aside>
  );
}
