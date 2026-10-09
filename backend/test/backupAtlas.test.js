const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
const script = path.resolve(__dirname, '../scripts/backupAtlas.js');
test('backup requires paused writers and never overwrites a previous dump', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gestmat-backup-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const output = path.join(dir, 'backup.gz');
  fs.writeFileSync(output, 'existing');
  const configuration = path.join(dir, '.env');
  fs.writeFileSync(
    configuration,
    'MONGODB_URI=mongodb://fake-user:fake-secret@localhost/test',
  );
  const args = [
    '--env',
    configuration,
    '--database',
    'test',
    '--output',
    output,
  ];
  assert.notEqual(spawnSync(process.execPath, [script, ...args]).status, 0);
  assert.notEqual(
    spawnSync(process.execPath, [script, ...args, '--writes-paused']).status,
    0,
  );
  assert.equal(fs.readFileSync(output, 'utf8'), 'existing');
});
test('backup passes a private config path to the tool, cleans it and creates a protected checksum', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gestmat-backup-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const output = path.join(dir, 'backup.gz'),
    configuration = path.join(dir, '.env'),
    capture = path.join(dir, 'args.json');
  fs.writeFileSync(
    configuration,
    'MONGODB_URI=mongodb://fake-user:fake-secret@localhost/test',
  );
  // Fake executable; no database connection is attempted in this test.
  fs.writeFileSync(
    path.join(dir, 'mongodump'),
    `#!${process.execPath}\nconst fs=require('node:fs'); const args=process.argv.slice(2); fs.writeFileSync(${JSON.stringify(capture)},JSON.stringify(args)); fs.writeFileSync(args.find(x=>x.startsWith('--archive=')).slice(10),'fake dump');`,
    { mode: 0o700 },
  );
  const result = spawnSync(
    process.execPath,
    [
      script,
      '--env',
      configuration,
      '--database',
      'test',
      '--output',
      output,
      '--writes-paused',
    ],
    {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${dir}${path.delimiter}${process.env.PATH}`,
      },
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.ok(fs.existsSync(`${output}.sha256`));
  assert.equal(fs.statSync(output).mode & 0o777, 0o600);
  const args = JSON.parse(fs.readFileSync(capture));
  assert.ok(!args.join(' ').includes('fake-secret'));
  assert.equal(
    fs.existsSync(args.find((x) => x.startsWith('--config=')).slice(9)),
    false,
  );
  assert.ok(!result.stdout.includes('fake-secret'));
});
