// All repository test suites; existing esbuild and Node only. No live API writes.
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const esbuild = require('esbuild');
(async () => {
  const output = await fs.mkdtemp(path.join(os.tmpdir(), 'jmcareer-tests-'));
  const root = path.resolve(__dirname, '..');
  const suites = ['tests/employmentNavigation.test.ts', 'tests/employmentCustomerPreview.test.ts', 'tests/customerProgramIntegration.test.ts', 'tests/publicEmploymentPrograms.test.ts', 'tests/customerProgramAdapter.test.ts', 'tests/employmentPrograms.test.ts', 'tests/adminSessionRenewal.test.ts', 'tests/adminSessionHook.test.ts', 'supabase/functions/employment-programs/handler.test.ts', 'tests/smartCare.test.ts', 'supabase/functions/smartcare-solutions/handler.test.ts'];
  const files = [];
  for (const [index, suite] of suites.entries()) {
    const file = path.join(output, `${index}.test.cjs`);
    await esbuild.build({ entryPoints: [path.join(root, suite)], bundle: true, platform: 'node', format: 'cjs',
      outfile: file, define: { 'import.meta.env': ['tests/customerProgramIntegration.test.ts', 'tests/employmentNavigation.test.ts'].includes(suite)
        ? JSON.stringify({ VITE_SUPABASE_URL: 'https://fixture.invalid', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture' }) : '{}' },
      loader: { '.css': 'empty', '.png': 'empty', '.mp4': 'empty' },
      plugins: suite === 'tests/adminSessionHook.test.ts' ? [{ name: 'local-session-fixture', setup(build) {
        build.onResolve({ filter: /\/lib\/supabase$/ }, () => ({ path: path.join(root, 'tests/fixtures/adminSessionClient.ts') }));
      } }] : [] });
    files.push(file);
  }
  const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
})().catch(() => { console.error('Local tests could not run.'); process.exitCode = 1; });
