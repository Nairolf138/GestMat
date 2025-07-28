const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (!transporter) {
    if (process.env.SMTP_URL) {
      transporter = nodemailer.createTransport(process.env.SMTP_URL);
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
