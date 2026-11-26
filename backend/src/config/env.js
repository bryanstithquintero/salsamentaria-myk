require('dotenv').config({ quiet: true });

const NODE_ENV = process.env.NODE_ENV || 'development';

const env = {
  NODE_ENV,
  isProd: NODE_ENV === 'production',
  isTest: NODE_ENV === 'test',
  PORT: Number(process.env.PORT) || 4000,
  JWT_SECRET: process.env.JWT_SECRET || (NODE_ENV === 'production' ? '' : 'clave-solo-para-desarrollo'),
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  CORS_ORIGIN: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  TIME_ZONE: 'America/Bogota',
};

if (env.isProd && !env.JWT_SECRET) {
  throw new Error('JWT_SECRET es obligatorio en producción');
}

module.exports = env;
