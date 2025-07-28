const { MongoClient } = require('mongodb');
let client;
async function connectDB() {
    client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost/gestmat');
    await client.connect();
    return client.db();
}
module.exports = { connectDB };
