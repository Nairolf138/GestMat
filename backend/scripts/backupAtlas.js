// Run manually with all database writers stopped. Never restores or stops production.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const dotenv = require('dotenv');
function main() {
  const args = process.argv.slice(2);
  const values = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--writes-paused') {
      values.paused = true;
      continue;
    }
    if (!['--env', '--database', '--output'].includes(args[i]) || !args[i + 1])
      throw new Error(
        'Usage: --env FILE --database NAME --output FILE --writes-paused',
      );
    values[args[i].slice(2)] = args[++i];
  }
  if (!values.paused || !values.env || !values.database || !values.output)
    throw new Error(
      'Explicit env, database, output and --writes-paused are required',
    );
  if (!/^[A-Za-z0-9_-]+$/.test(values.database))
    throw new Error('Invalid database name');
  const uri = dotenv.parse(fs.readFileSync(values.env)).MONGODB_URI;
  if (!uri?.startsWith('mongodb'))
    throw new Error('MONGODB_URI missing from configuration');
  const output = path.resolve(values.output);
  // Never overwrite a previous backup or checksum.
  const fd = fs.openSync(output, 'wx', 0o600);
  fs.closeSync(fd);
  if (fs.existsSync(`${output}.sha256`)) {
    fs.unlinkSync(output);
    throw new Error('Checksum already exists');
  }
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'gestmat-dump-'));
  try {
    const config = path.join(temporary, 'dump.yml');
    fs.writeFileSync(config, `uri: ${JSON.stringify(uri)}\n`, { mode: 0o600 });
    const result = spawnSync(
      'mongodump',
      [
        `--config=${config}`,
        `--db=${values.database}`,
        `--archive=${output}`,
        '--gzip',
      ],
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
    );
    if (result.error || result.status !== 0) {
      fs.writeFileSync(
        `${output}.error.log`,
        result.stderr || String(result.error?.code || 'mongodump failed'),
        { mode: 0o600 },
      );
      fs.unlinkSync(output);
      throw new Error(
        'Dump failed; see protected .error.log. No backup was validated.',
      );
    }
    if (fs.statSync(output).size === 0) {
      fs.unlinkSync(output);
      throw new Error('Dump is empty');
    }
    const hash = crypto
      .createHash('sha256')
      .update(fs.readFileSync(output))
      .digest('hex');
    fs.writeFileSync(
      `${output}.sha256`,
      `${hash}  ${path.basename(output)}\n`,
      { mode: 0o600, flag: 'wx' },
    );
    process.stdout.write(
      'Dump and checksum created. Copy off VPS and test isolated restoration before deployment.\n',
    );
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}
try {
  main();
} catch (err) {
  process.stderr.write(`${err.message}\n`);
  process.exitCode = 1;
}
