#!/usr/bin/env node
/**
 * Print every presentational ("dumb") component and the props it accepts.
 *
 * The component layers are exactly the directories the ESLint boundary rule
 * forbids from importing api/store/hook, so anything listed here is guaranteed
 * to be a pure function of its props. Run `pnpm storybook` to poke at them live.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOTS = ['src/components', 'src/features']
const IS_COMPONENT_DIR = /(^|\/)components(\/|$)/

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

const files = ROOTS.filter((r) => {
  try {
    return statSync(r).isDirectory()
  } catch {
    return false
  }
})
  .flatMap(walk)
  .filter((f) => f.endsWith('.tsx'))
  .filter((f) => !f.endsWith('.test.tsx') && !f.endsWith('.stories.tsx'))
  .filter((f) => IS_COMPONENT_DIR.test(f) || f.startsWith('src/components'))
  .sort()

let total = 0

for (const file of files) {
  const source = readFileSync(file, 'utf8')

  const components = [...source.matchAll(/export function ([A-Z]\w*)\s*\(/g)].map((m) => m[1])
  if (components.length === 0) continue

  // Props declared as an interface: list each field.
  const propsBlocks = Object.fromEntries(
    [...source.matchAll(/export interface (\w+)Props \{([\s\S]*?)\n\}/g)].map((m) => [m[1], m[2]]),
  )

  // Props declared as a type alias (e.g. ComponentProps<'button'> & VariantProps<…>):
  // there are no discrete fields to list, so show the alias itself.
  const propsAliases = Object.fromEntries(
    [...source.matchAll(/export type (\w+)Props = ([^\n]+)/g)].map((m) => [
      m[1],
      m[2].replace(/\s*$/, ''),
    ]),
  )

  const hasStory = files.length >= 0 && existsStory(file)
  console.log(
    `\n\x1b[1m${relative('.', file)}\x1b[0m${hasStory ? '' : '  \x1b[33m(no story)\x1b[0m'}`,
  )

  for (const name of components) {
    total++
    const body = propsBlocks[name]
    const props = body
      ? [...body.matchAll(/^\s*(?:\/\*\*.*?\*\/\s*)?(\w+)(\??):\s*([^\n]+?)$/gm)].map(
          (m) => `${m[1]}${m[2]}: ${m[3].replace(/\s*$/, '')}`,
        )
      : []

    console.log(`  \x1b[36m<${name}>\x1b[0m`)
    if (props.length > 0) {
      for (const p of props) console.log(`    ${p}`)
    } else if (propsAliases[name]) {
      console.log(`    ${propsAliases[name]}`)
    } else {
      console.log('    \x1b[2mprops inferred inline (see the component)\x1b[0m')
    }
  }
}

function existsStory(file) {
  const story = file.replace(/\.tsx$/, '.stories.tsx')
  try {
    return statSync(story).isFile()
  } catch {
    return false
  }
}

console.log(
  `\n\x1b[2m${total} presentational component(s). These cannot import api/store/hook — enforced by pnpm lint.\x1b[0m`,
)
console.log(`\x1b[2mRun \`pnpm storybook\` to render them and edit their props live.\x1b[0m\n`)
