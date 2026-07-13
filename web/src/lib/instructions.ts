import type { FlagInstruction } from '@/types/flag'

/**
 * A short human summary of one semantic instruction, for change-request rows.
 * Lives in `lib` so both the approvals list and the propose dialog can use it.
 */
export function instructionText(ins: FlagInstruction): string {
  switch (ins.kind) {
    case 'turnFlagOn':
      return 'Turn targeting on'
    case 'turnFlagOff':
      return 'Turn targeting off'
    case 'updateOffVariation':
      return `Set off variation to #${ins.variation}`
    case 'updateFallthroughVariation':
      return `Set default variation to #${ins.variation}`
    case 'addTargets':
      return `Serve #${ins.variation} to ${(ins.values ?? []).join(', ')}`
    case 'removeTargets':
      return `Stop serving #${ins.variation} to ${(ins.values ?? []).join(', ')}`
    case 'addRule':
      return `Add a targeting rule serving #${ins.variation}`
    case 'removeRule':
      return 'Remove a targeting rule'
    default:
      return ins.kind
  }
}

/** Joins a set of instructions into one readable line. */
export function instructionsText(instructions: FlagInstruction[]): string {
  return instructions.map(instructionText).join('; ')
}
