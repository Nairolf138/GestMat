import { RequestHandler } from 'express';
export default function readOnlyGuard(enabled: boolean): RequestHandler {
  return (req, res, next) => {
    if (!enabled) return next();
    res.set('X-Gestmat-Read-Only', 'true');
    if (
      ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ||
      (req.method === 'POST' &&
        ['/auth/login', '/auth/refresh', '/auth/logout'].includes(req.path))
    )
      return next();
    res.set('Retry-After', '60');
    res.status(503).json({
      message:
        'GestMat est temporairement en consultation seule. Les modifications sont suspendues.',
      readOnly: true,
    });
  };
}
