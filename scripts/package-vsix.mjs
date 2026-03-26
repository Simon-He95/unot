import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)))
const packageJson = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf8'))
const stageDir = mkdtempSync(join(tmpdir(), 'unot-vsce-'))
const distDir = join(rootDir, 'dist')
const outputFile = join(rootDir, `${packageJson.name}-${packageJson.version}.vsix`)
const [mode = 'package', ...rawVsceArgs] = process.argv.slice(2)
const vsceArgs = rawVsceArgs[0] === '--' ? rawVsceArgs.slice(1) : rawVsceArgs
const vsceBin = join(
  rootDir,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'vsce.cmd' : 'vsce',
)

function run(command, args, cwd = rootDir) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
  })

  if (result.status !== 0)
    process.exit(result.status ?? 1)
}

if (mode === 'publish' && vsceArgs[0] && !vsceArgs[0].startsWith('-')) {
  console.error('Positional version arguments are not supported by this publish helper. Bump package.json first, then run publish again.')
  process.exit(1)
}

try {
  run('pnpm', ['--filter', '.', 'deploy', '--prod', '--legacy', stageDir])
  cpSync(distDir, join(stageDir, 'dist'), { recursive: true })
  run(vsceBin, ['package', '--out', outputFile], stageDir)

  if (mode === 'publish')
    run(vsceBin, ['publish', '--packagePath', outputFile, ...vsceArgs])
}
finally {
  rmSync(stageDir, { recursive: true, force: true })
}
