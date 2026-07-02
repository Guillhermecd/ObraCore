module.exports = {
  models: {
    migrate: 'safe',
  },
  blueprints: {
    shortcuts: false,
    actions: false,
    rest: false,
  },
  session: {
    cookie: {
      secure: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  },
  log: {
    level: 'info',
  },
};
