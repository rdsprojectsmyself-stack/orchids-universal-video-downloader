// CRITICAL: JWT_SECRET must be set in environment variables
// No fallback to prevent security issues in production
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}

module.exports = {
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiration: process.env.JWT_EXPIRATION || '24h',
  adminEmail: process.env.ADMIN_EMAIL || 'dhanaprabha216@gmail.com'
};
