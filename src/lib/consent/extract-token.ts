/**
 * Fungsi murni ekstraksi token ConsentQR dari masukan teks mentah
 * (hasil kamera QR atau ketikan manual):
 * 1. Bagian setelah "#" bila ada (URL fragmen /s#<token>);
 * 2. Selain itu teks apa adanya;
 * 3. Potong ke maksimum 64 karakter.
 * Validitas nilai token dinilai oleh server di /api/scan.
 */
export function extractToken(input: string): string {
  if (!input || typeof input !== "string") {
    return "";
  }

  let text = input;
  const hashIndex = text.indexOf("#");
  if (hashIndex !== -1) {
    text = text.slice(hashIndex + 1);
  }

  return text.slice(0, 64);
}
