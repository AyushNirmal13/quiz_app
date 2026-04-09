import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3Client = new S3Client({
  region: process.env.AWS_REGION as string,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

export const uploadToS3 = async (buffer: Buffer, originalName: string, mimeType: string) => {
  const timestamp = Date.now();
  const safeName = originalName.replace(/[^a-zA-Z0-9.]/g, "_");
  const s3Key = `uploads/${timestamp}-${safeName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: s3Key,
    Body: buffer,
    ContentType: mimeType,
  });

  await s3Client.send(command);

  return {
    s3Key,
    fileUrl: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`,
  };
};

export const deleteFromS3 = async (s3Key: string) => {
  const command = new DeleteObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: s3Key,
  });
  await s3Client.send(command);
};

export const generatePresignedDownloadUrl = async (s3Key: string, expiresIn: number = 3600) => {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: s3Key,
  });
  return await getSignedUrl(s3Client, command, { expiresIn });
};

export const generatePresignedUploadUrl = async (fileName: string, mimeType: string, expiresIn: number = 3600) => {
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9.]/g, "_");
  const s3Key = `uploads/${timestamp}-${safeName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: s3Key,
    ContentType: mimeType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

  return {
    uploadUrl,
    s3Key,
    fileUrl: `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`,
  };
};
