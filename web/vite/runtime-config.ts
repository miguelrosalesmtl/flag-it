import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { loadEnv, type Plugin } from 'vite'

/**
 * Generates `public/config.json` from `.env` when Vite starts.
 *
 * WHY THIS EXISTS
 *
 * The app is built once and promoted across environments, so nothing about an
 * environment may be compiled into the bundle. Configuration is fetched at
 * runtime from `/config.json` — in production, written by `docker/entrypoint.sh`
 * from the container's environment.
 *
 * That is correct, but it would make local development a chore: you would be
 * hand-editing a JSON file instead of a `.env` like every other project. So this
 * plugin lets you edit `.env`, and generates the same `config.json` the app boots
 * from. Local development therefore exercises the EXACT production boot path
 * (fetch → validate → render) rather than a second, divergent mechanism that
 * would let a broken config.json reach production undetected.
 *
 * The variable names are deliberately the same ones `docker/entrypoint.sh` reads
 * (`APP_*`), so there is one vocabulary from your laptop to production.
 *
 * Note they are NOT prefixed `VITE_`, which means Vite will not inline them into
 * the bundle. They are inputs to this generator, never to your components.
 */
export function runtimeConfig(): Plugin {
  return {
    name: 'runtime-config',
    // `config` rather than `configResolved`: this must run before the dev server
    // starts serving public/, so the file is on disk by the first request.
    config(_userConfig, { mode, command }) {
      const env = loadEnv(mode, process.cwd(), 'APP_')

      // A BUILD is always mocking=false, whatever `.env` says. MSW is gated behind
      // `import.meta.env.DEV` and physically cannot run in a production bundle, so
      // writing `true` here would be a lie that sends the app looking for fixtures
      // that will never be served. Only `vite dev` honours the flag.
      const enableMocking =
        command === 'serve' ? (env.APP_ENABLE_MOCKING ?? 'true') === 'true' : false

      const runtime = {
        apiUrl: env.APP_API_URL ?? '/api',
        environment: env.APP_ENVIRONMENT ?? 'development',
        enableMocking,
      }

      const target = resolve(process.cwd(), 'public/config.json')
      writeFileSync(target, `${JSON.stringify(runtime, null, 2)}\n`)

      console.log(
        `  runtime config  public/config.json  ` +
          `[${runtime.environment}] api=${runtime.apiUrl} mocking=${enableMocking ? 'on' : 'off'}`,
      )
    },
  }
}
