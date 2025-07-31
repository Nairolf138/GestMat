const nodemailer = require('nodemailer');
const { SMTP_URL } = require('../config');
const logger = require('./logger');

let transporter;

function getTransporter() {
  if (!transporter) {
    if (SMTP_URL) {
      transporter = nodemailer.createTransport(SMTP_URL);
    } else {
      transporter = {
        sendMail: async (opts) => {
          logger.info('Email disabled. Would send: %o', opts);
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
