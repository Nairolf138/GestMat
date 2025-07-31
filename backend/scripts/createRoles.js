const dotenv = require('dotenv');
const { connectDB, closeDB } = require('../src/config/db');
const ROLES = require('../src/config/roles');
const { seedRoles } = require('../src/models/Role');

async function main() {
  dotenv.config();
  const db = await connectDB();
  try {
    await seedRoles(db, ROLES);
    console.log('Roles inserted');
  } catch (err) {
    console.error('Failed to insert roles:', err.message);
  } finally {
    await closeDB();
  }
}

main();
