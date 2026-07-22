// First letter of up to two words, e.g. "Spin Doctors" -> "SD". Used as the
// logo fallback in the hero crest and the small table logos.
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('')
}
