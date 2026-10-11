const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture } = require('./utils/workflowFixture');
const {
  createLoanRequest,
  updateLoanRequest,
} = require('../src/services/loanService');
test('status mail targets only changed domains and keeps the deciding actor', async (t) => {
  const f = await fixture(t);
  const loan = await createLoanRequest(
    f.db,
    f.payload(['Son', 'Lumière']),
    f.user('requester'),
  );
  f.messages.length = 0;
  await updateLoanRequest(f.db, f.user('sound'), loan._id.toString(), {
    decisions: [
      {
        lineId: loan.items[0].lineId,
        status: 'refused',
        note: 'Indisponible',
      },
    ],
  });
  assert.deepEqual(
    f.messages
      .filter((mail) => mail.to)
      .map((mail) => mail.to)
      .sort(),
    ['general@example.test', 'requester@example.test', 'sound@example.test'],
  );
  assert.equal(f.messages.filter((mail) => mail.bcc).length, 1);
  for (const mail of f.messages) {
    assert.ok(mail.text.includes('sound Person'));
    assert.ok(mail.text.includes('Indisponible'));
    assert.ok(!mail.text.includes('Lumière x'));
  }
});
test('archive still receives one event when no ordinary address remains', async (t) => {
  const f = await fixture(t);
  const loan = await createLoanRequest(f.db, f.payload(), f.user('requester'));
  await f.db.collection('users').updateMany({}, { $unset: { email: '' } });
  f.messages.length = 0;
  await updateLoanRequest(f.db, f.user('sound'), loan._id.toString(), {
    status: 'accepted',
  });
  assert.equal(f.messages.length, 1);
  assert.equal(f.messages[0].bcc, 'archive@example.test');
  assert.equal(f.messages[0].to, undefined);
});

test('an archive address owned by a sound user cannot receive light lines', async (t) => {
  const f = await fixture(t);
  await f.db.collection('users').insertOne({
    structure: f.owner,
    role: f.accounts.sound.role,
    email: 'archive@example.test',
  });
  await createLoanRequest(
    f.db,
    f.payload(['Son', 'Lumière']),
    f.user('requester'),
  );
  const archiveMails = f.messages.filter(
    (mail) => mail.to === 'archive@example.test',
  );
  assert.equal(archiveMails.length, 1);
  assert.equal(
    f.messages.filter((mail) => mail.bcc === 'archive@example.test').length,
    0,
  );
  assert.match(archiveMails[0].text, /- Son \(/);
  assert.doesNotMatch(archiveMails[0].text, /- Lumière \(/);
});

test('a mixed batch sends one scoped decision email per role and address', async (t) => {
  const f = await fixture(t);
  const types = ['Son', 'Lumière', 'Plateau', 'Vidéo', 'Autre'];
  const loan = await createLoanRequest(
    f.db,
    f.payload(types),
    f.user('requester'),
  );
  const allowed = {
    general: types,
    sound: ['Son', 'Vidéo', 'Autre'],
    light: ['Lumière', 'Vidéo', 'Autre'],
    stage: ['Plateau', 'Vidéo', 'Autre'],
    other: ['Autre'],
    requester: types,
  };
  for (const [name, expected] of Object.entries(allowed)) {
    const messages = f.messages.filter(
      (mail) => mail.to === `${name}@example.test`,
    );
    assert.equal(messages.length, 1, `creation: ${name}`);
    for (const type of types)
      assert.equal(
        messages[0].text.includes(`- ${type} (`),
        expected.includes(type),
        `creation: ${name}/${type}`,
      );
  }
  f.messages.length = 0;
  await updateLoanRequest(f.db, f.user('general'), loan._id.toString(), {
    decisions: loan.items.map((item, index) => ({
      lineId: item.lineId,
      status: index % 2 ? 'refused' : 'accepted',
      note: index % 2 ? 'Non disponible' : 'Disponible',
    })),
  });
  assert.equal(f.messages.filter((mail) => mail.bcc).length, 1);
  assert.equal(
    f.messages.filter((mail) => mail.to).length,
    Object.keys(allowed).length,
  );
  for (const [name, expected] of Object.entries(allowed)) {
    const messages = f.messages.filter(
      (mail) => mail.to === `${name}@example.test`,
    );
    assert.equal(messages.length, 1, `decision: ${name}`);
    const mail = messages[0];
    assert.match(mail.subject, /Décisions? sur \d+ lignes? de la demande/);
    assert.match(mail.text, /Statut des lignes concernées/);
    assert.doesNotMatch(mail.text, /Statut global de la demande/);
    assert.doesNotMatch(mail.text, /La demande .* a été refusée/);
    for (const type of types)
      assert.equal(
        mail.text.includes(`- ${type} (`),
        expected.includes(type),
        `decision: ${name}/${type}`,
      );
  }
});

test('accepting or refusing every line in one operation sends one email per address', async (t) => {
  const f = await fixture(t);
  for (const status of ['accepted', 'refused']) {
    const loan = await createLoanRequest(
      f.db,
      f.payload(['Son', 'Lumière']),
      f.user('requester'),
    );
    f.messages.length = 0;
    await updateLoanRequest(f.db, f.user('general'), loan._id.toString(), {
      decisions: loan.items.map((item) => ({ lineId: item.lineId, status })),
    });
    for (const address of new Set(
      f.messages.map((mail) => mail.to || mail.bcc),
    ))
      assert.equal(
        f.messages.filter((mail) => (mail.to || mail.bcc) === address).length,
        1,
        `${status}: ${address}`,
      );
    assert.ok(f.messages.find((mail) => mail.to === 'sound@example.test'));
    assert.ok(f.messages.find((mail) => mail.to === 'light@example.test'));
  }
});
