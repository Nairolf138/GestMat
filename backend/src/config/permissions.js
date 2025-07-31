const { ADMIN_ROLE } = require('./roles');

const PERMISSIONS = {
  MANAGE_STRUCTURES: [ADMIN_ROLE],
  MANAGE_USERS: [ADMIN_ROLE],
};

module.exports = PERMISSIONS;
