const dotenv = require('dotenv');
const { connectDB, closeDB } = require('../src/config/db');
const {
  ADMIN_ROLE,
  REGISSEUR_GENERAL_ROLE,
  REGISSEUR_LUMIERE_ROLE,
  REGISSEUR_SON_ROLE,
  REGISSEUR_PLATEAU_ROLE,
  AUTRE_ROLE,
} = require('../src/config/roles');
const { seedRoles } = require('../src/models/Role');

const ROLES = [
  ADMIN_ROLE,
  REGISSEUR_SON_ROLE,
  REGISSEUR_LUMIERE_ROLE,
  REGISSEUR_PLATEAU_ROLE,
  REGISSEUR_GENERAL_ROLE,
  AUTRE_ROLE,
];

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
