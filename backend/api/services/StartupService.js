const { MongoClient } = require('mongodb');

module.exports = {
  async validateDependencies() {
    await this.validateMongo();
    await this.validateStorage();
    await this.validateMailpit();
  },

  async validateMongo() {
    const url = process.env.MONGODB_URI || process.env.MONGO_URL || 'mongodb://localhost:27017/bimd_template';
    const client = new MongoClient(url, { serverSelectionTimeoutMS: 3000 });

    try {
      await client.connect();
      await client.db().command({ ping: 1 });
    } catch (error) {
      throw new Error(`MongoDB não encontrado em ${url}. ${error.message}`, { cause: error });
    } finally {
      await client.close().catch(() => undefined);
    }
  },

  async validateStorage() {
    const config = sails.services.storageservice.config();

    try {
      await sails.services.storageservice.verify();
    } catch (error) {
      throw new Error(`MinIO não encontrado em ${config.endpoint}. ${error.message}`, { cause: error });
    }
  },

  async validateMailpit() {
    const host = process.env.SMTP_HOST || '127.0.0.1';
    const port = process.env.SMTP_PORT || '1025';

    try {
      await sails.services.emailservice.verify();
    } catch (error) {
      sails.log.warn(
        `Mailpit não está disponível em ${host}:${port}. Funcionalidades de e-mail podem falhar em desenvolvimento. ${error.message}`,
      );
    }
  },
};
