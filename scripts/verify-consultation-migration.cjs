// Optional local PostgreSQL verification; module path points to a temporary PGlite install.
// No project credentials, network, or production database access.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { PGlite } = require(path.join(process.argv[2], 'node_modules/@electric-sql/pglite'));
(async () => {
  const db = new PGlite();
  try {
    await db.exec('create role anon; create role authenticated; create role service_role bypassrls; create schema auth; create table auth.users(id uuid primary key);');
    const migration = fs.readdirSync(path.join(__dirname, '../supabase/migrations')).find(name => name.endsWith('_consultation_settings.sql'));
    await db.exec(fs.readFileSync(path.join(__dirname, '../supabase/migrations', migration), 'utf8'));
    const seed = (await db.query('select urls from public.consultation_settings')).rows[0].urls;
    assert.equal(Object.keys(seed).length, 6);
    const valid = [seed.default, 'https://forms.gle/abc', 'https://docs.google.com/forms/d/abc/viewform?usp=sharing'];
    const invalid = ['', 'http://forms.gle/abc', 'https://forms.gle.evil.com/abc', 'https://user@forms.gle/abc', 'https://forms.gle:443/abc', 'https://forms.gle/abc/../bad', 'https://forms.gle/abc?redirect=https://evil.com', 'https://forms.gle/abc#fragment', 'https://forms.gle/abc\n'];
    for (const url of valid) assert.equal((await db.query('select public.consultation_valid_url($1) as valid', [url])).rows[0].valid, true, url);
    for (const url of invalid) assert.equal((await db.query('select public.consultation_valid_url($1) as valid', [url])).rows[0].valid, false, url);
    for (const role of ['anon', 'authenticated']) {
      await db.exec(`set role ${role}`);
      await assert.rejects(db.query('select * from public.consultation_settings'));
      await assert.rejects(db.query("update public.consultation_settings set urls = '{}'"));
      await db.exec('reset role');
    }
    await db.exec('set role service_role');
    const next = { ...seed, default: 'https://forms.gle/new', smartcare: 'https://forms.gle/smart' };
    await db.query("update public.consultation_settings set urls=$1::jsonb where id='consultation'", [JSON.stringify(next)]);
    assert.deepEqual((await db.query('select urls from public.consultation_settings')).rows[0].urls, next);
    await assert.rejects(db.query("update public.consultation_settings set urls=$1::jsonb where id='consultation'", [JSON.stringify({ ...next, default: '' })]));
    await assert.rejects(db.query("update public.consultation_settings set urls=$1::jsonb where id='consultation'", [JSON.stringify({ ...next, smartcare: 'https://evil.com' })]));
    assert.deepEqual((await db.query('select urls from public.consultation_settings')).rows[0].urls, next);
    await assert.rejects(db.query("delete from public.consultation_settings"));
    console.log('PASS: migration, seed, URL constraints, fixed IDs, anonymous/authenticated denial, atomic UPDATE and failed-write preservation (local PostgreSQL).');
  } finally { await db.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
