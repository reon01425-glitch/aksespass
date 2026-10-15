/** Tampilan berkelompok kode kartu: ABCD-EFGH. Terpisah dari index.ts agar aman diimpor komponen klien. */
export function formatCardCode(code: string): string {
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}
