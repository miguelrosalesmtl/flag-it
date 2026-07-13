/** Render a flag variation's value for display (strings plain, else JSON). */
export function variationLabel(variations: unknown[], index: number): string {
  const v = variations[index]
  if (v === undefined) return `#${index}`
  return typeof v === 'string' ? v : JSON.stringify(v)
}

/** An even percentage split across `count` variations, summing to exactly 100. */
export function evenPercents(count: number): number[] {
  if (count <= 0) return []
  const base = Math.floor(100 / count)
  const out = Array(count).fill(base)
  out[0] += 100 - base * count // remainder on the first bucket
  return out
}

/**
 * Build a rollout payload from per-variation percentages. Weights are out of
 * 100000 (the backend's unit), so a percentage maps to percent × 1000. An
 * optional `bucketBy` attribute buckets by something other than the context key
 * (e.g. "accountId" keeps a whole account on one variation).
 */
export function rolloutFromPercents(
  percents: number[],
  opts: { bucketBy?: string; contextKind?: string; seed?: number } = {},
): {
  variations: { variation: number; weight: number }[]
  bucketBy?: string
  contextKind?: string
  seed?: number
} {
  return {
    variations: percents.map((p, i) => ({ variation: i, weight: Math.round(p * 1000) })),
    ...(opts.bucketBy ? { bucketBy: opts.bucketBy } : {}),
    ...(opts.contextKind ? { contextKind: opts.contextKind } : {}),
    ...(opts.seed !== undefined ? { seed: opts.seed } : {}),
  }
}

/** Percentages (rounded) from a rollout payload, aligned to `count` variations. */
export function percentsFromRollout(
  rollout: { variations: { variation: number; weight: number }[] } | undefined,
  count: number,
): number[] {
  const out = Array(count).fill(0)
  for (const wv of rollout?.variations ?? []) {
    if (wv.variation >= 0 && wv.variation < count) out[wv.variation] = Math.round(wv.weight / 1000)
  }
  return out
}
