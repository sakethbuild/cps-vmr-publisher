import { PutBucketCorsCommand, S3Client } from "@aws-sdk/client-s3";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env: ${name}`);
    process.exit(1);
  }
  return value;
}

async function main() {
  const accountId = requireEnv("R2_ACCOUNT_ID");
  const accessKeyId = requireEnv("R2_ACCESS_KEY_ID");
  const secretAccessKey = requireEnv("R2_SECRET_ACCESS_KEY");
  const bucket = requireEnv("R2_BUCKET");

  const allowedOriginsRaw = process.env.R2_CORS_ALLOWED_ORIGINS;
  const allowedOrigins = allowedOriginsRaw
    ? allowedOriginsRaw
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : ["http://localhost:3000"];

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedOrigins: allowedOrigins,
            AllowedMethods: ["PUT", "GET", "HEAD"],
            AllowedHeaders: ["Content-Type", "Content-Length"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }),
  );

  console.log(`CORS configured on bucket ${bucket}`);
  console.log(`Allowed origins:`);
  for (const origin of allowedOrigins) {
    console.log(`  - ${origin}`);
  }
  console.log(
    `\nAdd your production Vercel URL after first deploy by setting:`,
  );
  console.log(
    `  R2_CORS_ALLOWED_ORIGINS="http://localhost:3000,https://your-app.vercel.app" npm run configure:r2-cors`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
