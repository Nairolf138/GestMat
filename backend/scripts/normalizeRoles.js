const dotenv = require('dotenv');
const { connectDB, closeDB } = require('../src/config/db');
const { normalizeRole } = require('../src/utils/roleAccess');

async function main() {
  dotenv.config();
  const db = await connectDB();
  try {
    const users = db.collection('users');
    const all = users.find();
    while (await all.hasNext()) {
      const user = await all.next();
      const normalized = normalizeRole(user.role);
      if (user.role !== normalized) {
        await users.updateOne({ _id: user._id }, { $set: { role: normalized } });
      }
    }
    console.log('User roles normalized');
  } catch (err) {
    console.error('Failed to normalize roles:', err.message);
  } finally {
    await closeDB();
  }
}

main();
