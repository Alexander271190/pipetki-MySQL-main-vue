'use strict';
const { logError } = require('../utils/error-logger');

function errorHandler(err, req, res, next) {
  // Если уже отправили ответ — не дублируем
  if (res.headersSent) return next(err);

  const status = Number(err.status) || 500;
  const message = err.message || 'Internal Server Error';

  // 5xx пишем здесь (есть stack для дебага). 403/409 пишет errorLogger.
  const shouldLog = status >= 500;
  if (shouldLog) {
    logError({
      level: status >= 500 ? 'error' : 'warn',
      source: 'http',
      message: `${req.method} ${req.originalUrl || req.url} — ${message}`,
      stack: err.stack || null,
      req,
      statusCode: status,
    }).catch(() => {});
  }

  res.status(status).json({ error: message });
}

module.exports = { errorHandler };
