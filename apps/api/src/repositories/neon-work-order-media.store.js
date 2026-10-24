import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const DEFAULT_BUCKET = 'work-order-media';

export function createNeonWorkOrderMediaStore({ bucket = DEFAULT_BUCKET, client } = {}) {
  let s3Client = client;
  const getClient = () => {
    if (!s3Client) {
      s3Client = new S3Client({
        region: process.env.AWS_REGION,
        endpoint: process.env.AWS_ENDPOINT_URL_S3,
        forcePathStyle: true,
      });
    }
    return s3Client;
  };

  return {
    isConfigured() {
      return Boolean(process.env.AWS_REGION && process.env.AWS_ENDPOINT_URL_S3
        && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
    },

    async upload({ key, body, contentType }) {
      await getClient().send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        ContentLength: body.length,
        CacheControl: 'private, no-store',
      }));
    },

    async download(key) {
      const object = await getClient().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const bytes = await object.Body?.transformToByteArray();
      if (!bytes) throw new Error('Stored media object is empty.');
      return Buffer.from(bytes);
    },

    async delete(key) {
      await getClient().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    },
  };
}
