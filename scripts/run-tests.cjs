// All repository test suites; existing esbuild and Node only. No live API writes.
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const esbuild = require('esbuild');
(async () => {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'jmcareer-tests-'));
  const root = path.resolve(__dirname, '..');
  const suites = ['tests/employmentPrograms.test.ts', 'supabase/functions/employment-programs/handler.test.ts'];
  const files = [];
  for (const [index, suite] of suites.entries()) {
    const file = path.join(output, `${index}.test.cjs`);
    await esbuild.build({ entryPoints: [path.join(root, suite)], bundle: true, platform: 'node', format: 'cjs',
      outfile: file, define: { 'import.meta.env': '{}' }, loader: { '.css': 'empty' } });
    files.push(file);
  }
  const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
})().catch(() => { console.error('Local tests could not run.'); process.exitCode = 1; });
