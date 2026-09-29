export const BASES_OPERATIVAS = [
  "Dock Sud",
  "Bernal",
  "Berazategui",
  "Quilmes",
  "Hudson",
  "Samborombón",
  "Polo Hudson",
  "La Huella",
  "Madariaga",
  "Mar Chiquita",
  "Maipu",
  "Mar del Plata",
  "Sede Central"
];

export function formatEmployeeName(rawName: string): string {
  if (!rawName) return "";
  const cleaned = rawName.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map(word => {
      const lower = word.toLowerCase();
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

