/** The clause operators (mirrors the backend vocabulary), with human labels. */
export const CLAUSE_OPERATORS: { value: string; label: string }[] = [
  { value: 'in', label: 'is one of' },
  { value: 'startsWith', label: 'starts with' },
  { value: 'endsWith', label: 'ends with' },
  { value: 'contains', label: 'contains' },
  { value: 'matches', label: 'matches regex' },
  { value: 'lessThan', label: 'less than' },
  { value: 'lessThanOrEqual', label: 'less than or equal' },
  { value: 'greaterThan', label: 'greater than' },
  { value: 'greaterThanOrEqual', label: 'greater than or equal' },
  { value: 'before', label: 'before (date)' },
  { value: 'after', label: 'after (date)' },
  { value: 'semVerEqual', label: 'semver equals' },
  { value: 'semVerLessThan', label: 'semver less than' },
  { value: 'semVerGreaterThan', label: 'semver greater than' },
  { value: 'segmentMatch', label: 'is in segment' },
]

/** Coerce a typed value: numbers and booleans parse; everything else stays a string. */
export function coerceValue(input: string): unknown {
  const t = input.trim()
  try {
    const parsed: unknown = JSON.parse(t)
    if (typeof parsed === 'number' || typeof parsed === 'boolean') return parsed
  } catch {
    // not JSON — keep the string
  }
  return t
}

/** Parse a comma-separated input into clause values (coerced). */
export function parseValues(input: string): unknown[] {
  return input
    .split(',')
    .map((v) => v.trim())
    .filter((v) => v !== '')
    .map(coerceValue)
}

/** Render clause values back to a comma-separated string for editing. */
export function displayValues(values: unknown[]): string {
  return values.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join(', ')
}

/** A human-readable one-liner for a clause (for read-only display). */
export function clauseText(clause: {
  contextKind?: string
  attribute?: string
  op: string
  values: unknown[]
  negate?: boolean
}): string {
  const label = CLAUSE_OPERATORS.find((o) => o.value === clause.op)?.label ?? clause.op
  const subject = clause.attribute
    ? `${clause.contextKind ?? 'user'}.${clause.attribute}`
    : 'segment'
  const op = clause.negate ? `not (${label})` : label
  return `${subject} ${op} [${displayValues(clause.values)}]`
}
