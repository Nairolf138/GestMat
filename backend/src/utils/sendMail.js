const nodemailer = require('nodemailer');
const { SMTP_URL } = require('../config');

let transporter;

function getTransporter() {
  if (!transporter) {
    if (SMTP_URL) {
      transporter = nodemailer.createTransport(SMTP_URL);
    } else {
      transporter = {
        sendMail: async (opts) => {
          console.log('Email disabled. Would send:', opts);
        },
      };
    }
  }
  return transporter;
}

async function sendMail(options) {
  const transport = getTransporter();
  await transport.sendMail(options);
}

module.exports = { sendMail };
