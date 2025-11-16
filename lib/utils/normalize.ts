// lib/utils/normalize.ts
export function normalizeName(name: string) {
  if (!name) return "";
  return name
    .replace(/[^؀-ۿ\u0600-\u06FFa-zA-Z0-9 ]/g, "") // keep Arabic/Persian range & Latin & digits & spaces
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[أآا]/g, "ا")
    .replace(/[ۀة]/g, "ه")
    .replace(/[یي]/g, "ی");
}
