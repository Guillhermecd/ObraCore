const origins = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

module.exports.security = {
  cors: {
    allRoutes: true,
    allowOrigins: origins,
    allowCredentials: false,
    allowRequestHeaders: 'content-type,authorization',
  },
  csrf: false,
};
