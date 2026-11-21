import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env, integrationStatus } from "@/lib/env";
import { NotConfiguredError } from "@/lib/errors";
import { randomToken, slugify } from "@/lib/utils";

const ALLOWED = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif", "application/pdf": "pdf" } as const;
export type AllowedType = keyof typeof ALLOWED;

let client: S3Client | null = null;
function s3() {
  if (!integrationStatus().storage) throw new NotConfiguredError("Le stockage de fichiers (R2/S3)");
  const e = env();
  client ??= new S3Client({ region: e.S3_REGION ?? "auto", endpoint: e.S3_ENDPOINT, credentials: { accessKeyId: e.S3_ACCESS_KEY_ID!, secretAccessKey: e.S3_SECRET_ACCESS_KEY! } });
  return client;
}

/** URL d'envoi présignée (5 min), limitée au type et à la taille déclarés. */
export async function presignUpload(args: { folder: "products" | "blog" | "documents"; filename: string; contentType: string; size: number }) {
  const ext = ALLOWED[args.contentType as AllowedType];
  if (!ext) throw new Error("Type de fichier non autorisé");
  if (args.size > 8 * 1024 * 1024) throw new Error("Fichier trop volumineux (8 Mo max)");
  const key = `${args.folder}/${new Date().toISOString().slice(0, 7)}/${slugify(args.filename.replace(/\.[^.]+$/, "")).slice(0, 60) || "fichier"}-${randomToken(6)}.${ext}`;
  const url = await getSignedUrl(s3(), new PutObjectCommand({ Bucket: env().S3_BUCKET, Key: key, ContentType: args.contentType, ContentLength: args.size }), { expiresIn: 300 });
  const publicBase = env().S3_PUBLIC_URL?.replace(/\/$/, "");
  return { uploadUrl: url, key, publicUrl: publicBase ? `${publicBase}/${key}` : null };
}
