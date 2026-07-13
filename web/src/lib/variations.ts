/** Render a flag variation's value for display (strings plain, else JSON). */
export function variationLabel(variations: unknown[], index: number): string {
  const v = variations[index]
  if (v === undefined) return `#${index}`
  return typeof v === 'string' ? v : JSON.stringify(v)
}
