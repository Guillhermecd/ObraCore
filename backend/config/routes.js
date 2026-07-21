module.exports.routes = {
  'GET /api/health': { action: 'health' },
  'GET /api/public/branding': { action: 'public/branding' },

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

  'GET /api/dashboard/overview': { action: 'dashboard/overview' },
  'GET /api/dashboard/movimentacoes': { action: 'dashboard/movimentacoes' },

  'GET /api/groups': { action: 'groups/list' },
  'POST /api/groups': { action: 'groups/create' },
  'PATCH /api/groups/:id': { action: 'groups/update' },
  'DELETE /api/groups/:id': { action: 'groups/remove' },
  'GET /api/groups/:id/members': { action: 'groups/members' },
  'DELETE /api/groups/:id/members/:userId': { action: 'groups/remove-member' },

  'POST /api/group-invites': { action: 'group-invites/create' },
  'GET /api/group-invites/sent': { action: 'group-invites/list-sent' },
  'GET /api/group-invites/received': { action: 'group-invites/list-received' },
  'POST /api/group-invites/:id/accept': { action: 'group-invites/accept' },
  'POST /api/group-invites/:id/decline': { action: 'group-invites/decline' },
  'POST /api/group-invites/:id/cancel': { action: 'group-invites/cancel' },

  'GET /api/expense-categories': { action: 'expense-categories/list' },
  'POST /api/expense-categories': { action: 'expense-categories/create' },
  'DELETE /api/expense-categories/:id': { action: 'expense-categories/remove' },

  'GET /api/expense-sources': { action: 'expense-sources/list' },
  'POST /api/expense-sources': { action: 'expense-sources/create' },
  'DELETE /api/expense-sources/:id': { action: 'expense-sources/remove' },

  'GET /api/expenses': { action: 'expenses/list' },
  'GET /api/expenses/export': { action: 'expenses/export' },
  'POST /api/expenses': { action: 'expenses/create' },
  'PATCH /api/expenses/:id': { action: 'expenses/update' },
  'DELETE /api/expenses/:id': { action: 'expenses/remove' },
  'POST /api/expenses/:id/comprovante': { action: 'expenses/upload-comprovante' },
  'POST /api/expenses/import/preview': { action: 'expenses/import-preview' },
  'POST /api/expenses/import/commit': { action: 'expenses/import-commit' },
};
