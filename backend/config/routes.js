module.exports.routes = {
  'GET /api/health': { action: 'health' },

  'POST /api/auth/register': { action: 'auth/register' },
  'POST /api/auth/login': { action: 'auth/login' },
  'GET /api/auth/verify-email': { action: 'auth/verify-email' },
  'POST /api/auth/resend-verification': { action: 'auth/resend-verification' },
  'POST /api/auth/forgot-password': { action: 'auth/forgot-password' },
  'POST /api/auth/reset-password': { action: 'auth/reset-password' },

  'GET /api/profile': { action: 'profile/get-profile' },
  'PATCH /api/profile': { action: 'profile/update-profile' },
  'PATCH /api/profile/email': { action: 'profile/update-email' },
  'PATCH /api/profile/password': { action: 'profile/change-password' },
  'POST /api/profile/image': { action: 'profile/upload-image' },

  'GET /api/storage/presigned-url': { action: 'storage/presigned-url' },

  'GET /api/expense-categories': { action: 'expense-categories/list' },
  'POST /api/expense-categories': { action: 'expense-categories/create' },
  'DELETE /api/expense-categories/:id': { action: 'expense-categories/remove' },

  'GET /api/expense-sources': { action: 'expense-sources/list' },
  'POST /api/expense-sources': { action: 'expense-sources/create' },
  'DELETE /api/expense-sources/:id': { action: 'expense-sources/remove' },

  'GET /api/expenses': { action: 'expenses/list' },
  'POST /api/expenses': { action: 'expenses/create' },
  'PATCH /api/expenses/:id': { action: 'expenses/update' },
  'DELETE /api/expenses/:id': { action: 'expenses/remove' },
  'POST /api/expenses/import/preview': { action: 'expenses/import-preview' },
  'POST /api/expenses/import/commit': { action: 'expenses/import-commit' },
};
