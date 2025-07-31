const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const { connectDB, closeDB } = require('../src/config/db');
const { createUser } = require('../src/models/User');
const { ADMIN_ROLE } = require('../src/config/roles');

async function main() {
  dotenv.config();
  const [username, password] = process.argv.slice(2);
  if (!username || !password) {
    console.error('Usage: node scripts/createAdmin.js <username> <password>');
    process.exit(1);
  }
  const db = await connectDB();
  try {
    const hashed = await bcrypt.hash(password, 10);
    await createUser(db, { username, password: hashed, role: ADMIN_ROLE });
    console.log('Admin user created');
  } catch (err) {
    console.error('Failed to create admin user:', err.message);
  } finally {
    await closeDB();
  }
}

main();
