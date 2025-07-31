const { MongoClient } = require('mongodb');
let client;
async function connectDB() {
    client = new MongoClient(process.env.MONGODB_URI || 'mongodb://localhost/gestmat');
    await client.connect();
    const db = client.db();
    await db.collection('loanrequests').createIndex({ status: 1 });
    await db.collection('equipments').createIndex({ structure: 1 });
    return db;
}
function closeDB() {
    if (client) {
        return client.close();
    }
    return Promise.resolve();
}
module.exports = { connectDB, closeDB };
