/**
 * Two-letter avatar fallback derived from a display name, e.g. "Ada Lovelace"
 * becomes "AL". Returns null for an empty name so callers can render their own
 * fallback glyph.
 */
export const getInitials = (name) =>
  (name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || null