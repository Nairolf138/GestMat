const { MongoClient } = require('mongodb');
const { MONGODB_URI } = require('.');

let client;
async function connectDB() {
    client = new MongoClient(MONGODB_URI);
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
