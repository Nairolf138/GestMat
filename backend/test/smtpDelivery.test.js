process.env.JWT_SECRET = 'test';
process.env.NOTIFY_EMAIL = 'notifications@example.test';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');

test('the outbox delivers once through a real local SMTP exchange', async (t) => {
  const received = [];
  const server = net.createServer((socket) => {
    socket.write('220 localhost ESMTP\r\n');
    let buffer = '';
    let data = '';
    let receiving = false;
    socket.on('data', (chunk) => {
      buffer += chunk.toString();
      let end;
      while ((end = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (receiving) {
          if (line === '.') {
            received.push(data);
            data = '';
            receiving = false;
            socket.write('250 2.0.0 queued\r\n');
          } else data += `${line}\r\n`;
        } else if (/^EHLO |^HELO /i.test(line))
          socket.write('250 localhost\r\n');
        else if (/^MAIL FROM:|^RCPT TO:/i.test(line))
          socket.write('250 2.1.0 OK\r\n');
        else if (line === 'DATA') {
          receiving = true;
          socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');
        } else if (line === 'QUIT') {
          socket.write('221 Bye\r\n');
          socket.end();
        } else socket.write('250 OK\r\n');
      }
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  process.env.SMTP_URL = `smtp://127.0.0.1:${server.address().port}`;
  const {
    queueMail,
    processMailOutbox,
  } = require('../src/services/mailOutboxService');
  const mongod = await MongoMemoryReplSet.create();
  const client = new MongoClient(mongod.getUri());
  await client.connect();
  t.after(async () => {
    await client.close();
    await mongod.stop();
  });
  const db = client.db();
  await queueMail(db, 'smtp:batch:recipient:one@example.test', {
    to: 'one@example.test',
    subject: 'Décisions groupées',
    text: 'Son accepté\nLumière refusée',
  });
  await processMailOutbox(db);
  await processMailOutbox(db);
  assert.equal(received.length, 1);
  assert.match(received[0], /To: one@example\.test/i);
  assert.match(received[0], /From: notifications@example\.test/i);
  assert.match(received[0], /Message-ID:\s*<[a-f0-9]{64}@example\.test>/i);
  assert.match(received[0], /Son accept=C3=A9/);
  assert.match(received[0], /Lumi=C3=A8re refus=C3=A9e/);
  assert.equal(
    await db.collection('mailOutbox').countDocuments({ status: 'sent' }),
    1,
  );
});
