const { createHash } = require('crypto');
if (!crypto.hash) {
  crypto.hash = (alg, data, enc='hex') =>
    createHash(alg).update(data).digest(enc);
}
