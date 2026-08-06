export function capitalizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
