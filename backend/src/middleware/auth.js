const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config');

function auth(allowedRoles = []) {
  return (req, res, next) => {
    const token =
      req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    if (!token) return res.status(401).json({ message: 'No token provided' });

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;

      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ message: 'Access denied' });
      }

      next();
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  };
}

module.exports = auth;
