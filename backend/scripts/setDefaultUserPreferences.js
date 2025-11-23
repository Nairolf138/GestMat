const dotenv = require('dotenv');
const { connectDB, closeDB } = require('../src/config/db');
const { mergePreferences } = require('../src/models/User');

async function main() {
  dotenv.config();
  const db = await connectDB();
  let updatedCount = 0;

  try {
    const users = db.collection('users');
    const cursor = users.find();
    while (await cursor.hasNext()) {
      const user = await cursor.next();
      const mergedPreferences = mergePreferences(undefined, user.preferences);
      if (
        !user.preferences ||
        JSON.stringify(user.preferences) !== JSON.stringify(mergedPreferences)
      ) {
        await users.updateOne(
          { _id: user._id },
          { $set: { preferences: mergedPreferences } },
        );
        updatedCount += 1;
      }
    }

    console.log(`Updated preferences for ${updatedCount} user(s)`);
  } catch (err) {
    console.error('Failed to set default preferences:', err.message);
  } finally {
    await closeDB();
  }
}

main();
