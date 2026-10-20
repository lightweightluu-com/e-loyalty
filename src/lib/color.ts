export const HEX = /^#[0-9a-fA-F]{6}$/;

/** Lesbare Textfarbe (WCAG-Luminanz) auf einem Hex-Hintergrund. */
export function readableOn(hex: string): '#ffffff' | '#111111' {
  const [r, g, b] = [1, 3, 5].map(i => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#111111' : '#ffffff';
}
