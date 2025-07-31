const dotenv = require('dotenv');
const { connectDB, closeDB } = require('../src/config/db');
const { createStructure } = require('../src/models/Structure');

async function main() {
  dotenv.config();
  const names = process.argv.slice(2);
  if (names.length === 0) {
    console.error('Usage: node scripts/createStructures.js <name1> [name2 ...]');
    process.exit(1);
  }
  const db = await connectDB();
  try {
    for (const name of names) {
      await createStructure(db, { name });
      console.log(`Structure '${name}' created`);
    }
  } catch (err) {
    console.error('Failed to create structures:', err.message);
  } finally {
    await closeDB();
  }
}

main();
