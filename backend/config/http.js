module.exports.http = {
  middleware: {
    order: ['bodyParser', 'compress', 'poweredBy', 'router', 'www', 'favicon'],
  },
};
