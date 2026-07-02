module.exports.policies = {
  '*': 'isAuthenticated',
  health: true,
  'auth/register': true,
  'auth/login': true,
  'auth/verify-email': true,
  'auth/resend-verification': true,
  'auth/forgot-password': true,
  'auth/reset-password': true,
};
