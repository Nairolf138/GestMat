// Dry-run by default. --apply must be used only after the backup/restore rehearsal.
require('dotenv').config();
const { MongoClient } = require('mongodb');
const {
  migrateVehicleManagers,
} = require('../src/services/vehicleManagerMigration');
async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');
  if (
    process.argv.some((value) => value.startsWith('--') && value !== '--apply')
  )
    throw new Error('Unknown option');
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    const report = await migrateVehicleManagers(
      client.db(),
      process.argv.includes('--apply'),
    );
    console.log(JSON.stringify(report, null, 2));
    if (report.blocked.length) process.exitCode = 1;
  } finally {
    await client.close();
  }
}
main().catch((err) => {
  console.error(err.report ? JSON.stringify(err.report, null, 2) : err.message);
  process.exitCode = 1;
});
