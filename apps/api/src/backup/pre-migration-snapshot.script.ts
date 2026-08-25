/**
 * Standalone safety-net script run by `npm run start:api` (see root package.json)
 * immediately BEFORE `prisma migrate deploy`. It takes a raw, table-level dump of
 * the database exactly as it currently is — before any structural change is
 * applied — so that if a migration turns out to be broken in production it can be
 * rolled back to this exact snapshot.
 *
 * Deliberately NOT built on the Prisma Client's typed model API: at this point in
 * the deploy chain the *code* (and therefore the generated Prisma Client) already
 * reflects the NEW schema, while the *database* still has the OLD structure — so
 * a model-based `findMany()` could reference a column that doesn't exist yet and
 * throw. Raw `SELECT * FROM "table"` has no such assumption: it dumps whatever
 * columns are actually there, whatever the schema version.
 *
 * Never blocks the deploy: any failure here is logged and swallowed so a backup
 * problem can never be the reason a legitimate deploy doesn't ship.
 */
import { PrismaClient } from "@prisma/client";
import * as zlib from "zlib";
import * as path from "path";
import * as fs from "fs/promises";
import { BACKUP_EXCLUDED_MODELS } from "./backup-model-order.util";

async function tableExists(prisma: PrismaClient, name: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ exists: boolean }[]>(
    `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1) as "exists"`,
    name,
  );
  return rows[0]?.exists ?? false;
}

export async function runPreMigrationSnapshot(migrationName?: string): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const hasMigrationsTable = await tableExists(prisma, "_prisma_migrations");
    if (!hasMigrationsTable) {
      console.log(
        "[pre-migration-backup] Base de données vierge (première installation) — aucune sauvegarde nécessaire.",
      );
      return;
    }

    const tables = await prisma.$queryRawUnsafe<{ table_name: string }[]>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
    );

    const dump: Record<string, unknown[]> = {};
    for (const { table_name: tableName } of tables) {
      if (tableName === "_prisma_migrations" || BACKUP_EXCLUDED_MODELS.has(tableName)) continue;
      dump[tableName] = await prisma.$queryRawUnsafe<unknown[]>(`SELECT * FROM "${tableName}"`);
    }

    if (Object.keys(dump).length === 0) {
      console.log("[pre-migration-backup] Aucune table applicative trouvée — rien à sauvegarder.");
      return;
    }

    const payload = JSON.stringify({
      version: 1,
      kind: "PRE_MIGRATION_RAW",
      exportedAt: new Date().toISOString(),
      tables: dump,
    });
    const buffer = zlib.gzipSync(Buffer.from(payload, "utf-8"));

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `backup-pre_migration-${timestamp}.json.gz`;
    const localDir = process.env.BACKUP_LOCAL_DIR || path.join(process.cwd(), "backups");
    await fs.mkdir(localDir, { recursive: true });
    const localPath = path.join(localDir, filename);
    await fs.writeFile(localPath, buffer);

    let storage: "LOCAL" | "S3" = "LOCAL";
    let location = localPath;

    if (process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) {
      try {
        const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
        const s3 = new S3Client({
          region: process.env.S3_REGION || "eu-west-3",
          endpoint: process.env.S3_ENDPOINT || undefined,
          forcePathStyle: !!process.env.S3_ENDPOINT,
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
          },
        });
        const key = `backups/${filename}`;
        await s3.send(
          new PutObjectCommand({
            Bucket: process.env.S3_BUCKET || "gecodis-crm",
            Key: key,
            Body: buffer,
            ContentType: "application/gzip",
          }),
        );
        storage = "S3";
        location = key;
      } catch (error) {
        console.warn(
          `[pre-migration-backup] Échec de l'upload S3 (${(error as Error).message}) — conservé en local uniquement.`,
        );
      }
    }

    const sizeBytes = buffer.byteLength;
    const modelCounts = Object.fromEntries(Object.entries(dump).map(([k, v]) => [k, v.length]));

    const hasBackupTable = await tableExists(prisma, "BackupRecord");
    if (hasBackupTable) {
      const id = `bkp_pm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      await prisma.$executeRawUnsafe(
        `INSERT INTO "BackupRecord"
           (id, type, status, storage, location, "sizeBytes", "modelCounts", "relatedMigration", "createdAt", "completedAt")
         VALUES ($1, 'PRE_MIGRATION', 'COMPLETED', $2::"BackupStorage", $3, $4, $5::jsonb, $6, now(), now())`,
        id,
        storage,
        location,
        sizeBytes,
        JSON.stringify(modelCounts),
        migrationName ?? null,
      );
    }

    console.log(
      `[pre-migration-backup] Snapshot pré-migration enregistré (${storage}, ${sizeBytes} octets, ${Object.keys(dump).length} tables).`,
    );
  } catch (error) {
    console.error(`[pre-migration-backup] ÉCHEC (non bloquant, le déploiement continue) : ${(error as Error).message}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  runPreMigrationSnapshot(process.argv[2]).then(() => process.exit(0));
}
