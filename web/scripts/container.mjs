#!/usr/bin/env node
/**
 * Forwards its arguments to whichever container engine is installed.
 *
 * The `docker:*` package scripts go through here rather than calling `docker`
 * directly, because plenty of machines run Podman instead — often with `docker`
 * as a *shell alias*, which npm scripts (run via `sh`) cannot see. Resolving the
 * real binary means `pnpm docker:build` works on both without anyone editing a
 * script.
 */
import { spawnSync } from 'node:child_process'

const ENGINES = ['docker', 'podman']

function resolveEngine() {
  for (const engine of ENGINES) {
    const found = spawnSync('sh', ['-c', `command -v ${engine}`], { encoding: 'utf8' })
    if (found.status === 0 && found.stdout.trim()) return engine
  }
  return null
}

const engine = resolveEngine()

if (!engine) {
  console.error(
    `\nNo container engine found. Install Docker (https://docs.docker.com/get-docker/)\n` +
      `or Podman (https://podman.io/), then re-run.\n`,
  )
  process.exit(1)
}

const args = process.argv.slice(2)
console.error(`> ${engine} ${args.join(' ')}\n`)

const { status } = spawnSync(engine, args, { stdio: 'inherit' })
process.exit(status ?? 1)
