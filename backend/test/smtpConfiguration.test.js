process.env.JWT_SECRET = 'test';
process.env.SMTP_URL = '';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sendMail } = require('../src/utils/sendMail');

test('a missing SMTP configuration cannot be reported as a successful send', async () => {
  await assert.rejects(
    sendMail({
      to: 'user@example.test',
      subject: 'Notification',
      text: 'Sensitive content',
    }),
    /SMTP_URL is not configured/,
  );
});
