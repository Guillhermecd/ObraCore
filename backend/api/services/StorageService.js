const fs = require('fs');
const path = require('path');
const {
  S3Client,
  CreateBucketCommand,
  HeadBucketCommand,
  GetObjectCommand,
  ListBucketsCommand,
  PutObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

function booleanEnv(value, fallback) {
  if (value === undefined || value === '') {
    return fallback;
  }
  return value === 'true';
}

function storageConfig() {
  return {
    endpoint: process.env.S3_ENDPOINT || process.env.STORAGE_ENDPOINT || 'http://localhost:9000',
    region: process.env.S3_REGION || process.env.STORAGE_REGION || 'us-east-1',
    bucket: process.env.S3_BUCKET || process.env.STORAGE_BUCKET || 'bimd-template',
    accessKeyId:
      process.env.S3_ACCESS_KEY_ID || process.env.STORAGE_ACCESS_KEY_ID || 'minioadmin',
    secretAccessKey:
      process.env.S3_SECRET_ACCESS_KEY || process.env.STORAGE_SECRET_ACCESS_KEY || 'minioadmin',
    forcePathStyle: booleanEnv(
      process.env.S3_FORCE_PATH_STYLE || process.env.STORAGE_FORCE_PATH_STYLE,
      true,
    ),
    presignedExpiresIn: Number(process.env.S3_PRESIGNED_URL_EXPIRES_IN || 900),
  };
}

const DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

module.exports = {
  config: storageConfig,

  /**
   * Recebe o upload de um único campo `file` do Skipper (parser de upload do
   * Sails), devolvendo o arquivo (ou `undefined` se nenhum foi enviado).
   * Fonte única — antes copiada idêntica em cada controller que recebe
   * arquivo (import, comprovante, foto de perfil).
   */
  receiveUploadedFile(req, { maxBytes = DEFAULT_MAX_UPLOAD_BYTES } = {}) {
    return new Promise((resolve, reject) => {
      req.file('file').upload({ maxBytes }, (error, files) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(files[0]);
      });
    });
  },

  client() {
    const config = storageConfig();
    return new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  },

  async verify() {
    const config = storageConfig();
    const client = this.client();
    const buckets = await client.send(new ListBucketsCommand({}));
    const bucketExists = (buckets.Buckets || []).some((bucket) => bucket.Name === config.bucket);

    if (!bucketExists) {
      await client.send(new CreateBucketCommand({ Bucket: config.bucket }));
    }

    await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
  },

  async uploadLocalFile({ filePath, filename, contentType, keyPrefix }) {
    const config = storageConfig();
    const extension = path.extname(filename || '').toLowerCase();
    const key = `${keyPrefix}/${Date.now()}-${Math.random().toString(16).slice(2)}${extension}`;

    await this.client().send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: fs.createReadStream(filePath),
        ContentType: contentType || 'application/octet-stream',
      }),
    );

    return {
      bucket: config.bucket,
      key,
      contentType: contentType || 'application/octet-stream',
      originalFilename: filename,
      url: await this.getPresignedUrl(key),
    };
  },

  async getPresignedUrl(key) {
    const config = storageConfig();
    return getSignedUrl(
      this.client(),
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: key,
      }),
      { expiresIn: config.presignedExpiresIn },
    );
  },
};
