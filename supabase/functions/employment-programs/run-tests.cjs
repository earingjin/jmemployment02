// Use the repository's existing esbuild; no dependency installation or DB access.
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const esbuild = require('esbuild');
(async () => {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'employment-programs-test-'));
  const file = path.join(output, 'handler.test.cjs');
  await esbuild.build({ entryPoints: [path.join(__dirname, 'handler.test.ts')], bundle: true, platform: 'node', format: 'cjs', outfile: file });
  const result = spawnSync(process.execPath, ['--test', file], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
})().catch(() => { console.error('Local function tests could not run.'); process.exitCode = 1; });
