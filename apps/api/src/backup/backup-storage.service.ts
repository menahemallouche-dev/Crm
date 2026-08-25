import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import * as fs from "fs";
import * as fsp from "fs/promises";
import * as path from "path";
import { BackupStorage } from "@prisma/client";

/**
 * Storage backend for backup archives. Local disk is always available and is
 * used as the default/staging location; when S3_* env vars are configured the
 * archive is additionally (or instead, see `preferS3`) uploaded to S3-compatible
 * storage — important on PaaS platforms (Railway, Render...) whose local
 * filesystem is wiped on every redeploy, which would otherwise silently lose
 * every backup taken between two deploys.
 */
@Injectable()
export class BackupStorageService {
  private readonly logger = new Logger(BackupStorageService.name);
  private readonly localDir: string;
  private s3: S3Client | null = null;

  constructor(private readonly config: ConfigService) {
    this.localDir = this.config.get<string>("BACKUP_LOCAL_DIR") ?? path.join(process.cwd(), "backups");
    if (this.isS3Enabled) {
      this.s3 = new S3Client({
        region: this.config.get<string>("S3_REGION") ?? "eu-west-3",
        endpoint: this.config.get<string>("S3_ENDPOINT") || undefined,
        forcePathStyle: !!this.config.get<string>("S3_ENDPOINT"), // needed for MinIO/R2-style endpoints
        credentials: {
          accessKeyId: this.config.get<string>("S3_ACCESS_KEY_ID")!,
          secretAccessKey: this.config.get<string>("S3_SECRET_ACCESS_KEY")!,
        },
      });
    }
  }

  get isS3Enabled(): boolean {
    return !!(this.config.get<string>("S3_ACCESS_KEY_ID") && this.config.get<string>("S3_SECRET_ACCESS_KEY"));
  }

  private get bucket(): string {
    return this.config.get<string>("S3_BUCKET") ?? "gecodis-crm";
  }

  /** Writes the archive locally and, when configured, uploads it to S3. Returns where it ended up living "of record". */
  async save(filename: string, data: Buffer): Promise<{ storage: BackupStorage; location: string }> {
    await fsp.mkdir(this.localDir, { recursive: true });
    const localPath = path.join(this.localDir, filename);
    await fsp.writeFile(localPath, data);

    if (this.s3) {
      const key = `backups/${filename}`;
      try {
        await this.s3.send(
          new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data, ContentType: "application/gzip" }),
        );
        // Local copy is just staging once S3 has it — the durable "location of record" is the S3 key,
        // which survives an ephemeral filesystem being wiped on the next deploy.
        return { storage: BackupStorage.S3, location: key };
      } catch (error) {
        this.logger.warn(
          `Échec de l'upload S3 pour ${filename} (${(error as Error).message}) — conservé en local uniquement.`,
        );
      }
    }
    return { storage: BackupStorage.LOCAL, location: localPath };
  }

  async load(storage: BackupStorage, location: string): Promise<Buffer> {
    if (storage === BackupStorage.S3) {
      if (!this.s3) throw new Error("S3 non configuré — impossible de récupérer cette sauvegarde");
      const res = await this.s3.send(new GetObjectCommand({ Bucket: this.bucket, Key: location }));
      const bytes = await res.Body!.transformToByteArray();
      return Buffer.from(bytes);
    }
    return fsp.readFile(location);
  }

  async delete(storage: BackupStorage, location: string): Promise<void> {
    if (storage === BackupStorage.S3) {
      if (this.s3) {
        await this.s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: location })).catch(() => undefined);
      }
      return;
    }
    await fsp.unlink(location).catch(() => undefined);
  }

  existsLocally(location: string): boolean {
    return fs.existsSync(location);
  }
}
