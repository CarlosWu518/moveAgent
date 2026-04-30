#!/usr/bin/env node
import('../dist/index.js').catch(async () => {
  // Fallback to tsx for dev mode
  const { spawnSync } = await import('node:child_process')
  const path = await import('node:path')
  const url = await import('node:url')
  const __dirname = path.dirname(url.fileURLToPath(import.meta.url))
  const entry = path.resolve(__dirname, '../src/index.ts')
  const result = spawnSync('npx', ['tsx', entry, ...process.argv.slice(2)], {
    stdio: 'inherit',
    shell: true
  })
  process.exit(result.status ?? 1)
})
