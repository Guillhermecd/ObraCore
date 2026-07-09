module.exports.bootstrap = async function bootstrap() {
  await sails.services.startupservice.validateDependencies();
  await sails.services.groupservice.ensureIndexes();
  await sails.services.authservice.ensureInitialUser();
};
