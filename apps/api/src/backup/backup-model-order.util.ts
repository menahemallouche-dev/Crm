import { Prisma } from "@prisma/client";

/**
 * Models never included in a backup archive: `BackupRecord` is backup
 * metadata about itself (backing it up would just grow every subsequent
 * backup recursively), and Prisma's own migration bookkeeping table isn't
 * a Prisma model at all so it's excluded by construction.
 */
export const BACKUP_EXCLUDED_MODELS = new Set(["BackupRecord"]);

/**
 * Topologically sorts every Prisma model so that a model referenced by a
 * foreign key always comes before the model holding that key — i.e. a safe
 * order to INSERT rows in on restore. Derived live from the Prisma DMMF
 * rather than hand-maintained, so it can never silently drift out of sync
 * with the schema as new models/relations are added.
 */
export function computeModelOrder(): string[] {
  const models = Prisma.dmmf.datamodel.models.filter((m) => !BACKUP_EXCLUDED_MODELS.has(m.name));
  const modelNames = new Set(models.map((m) => m.name));
  const dependsOn = new Map<string, Set<string>>();
  for (const model of models) dependsOn.set(model.name, new Set());

  for (const model of models) {
    for (const field of model.fields) {
      if (
        field.kind === "object" &&
        field.relationFromFields &&
        field.relationFromFields.length > 0 &&
        field.type !== model.name &&
        modelNames.has(field.type)
      ) {
        dependsOn.get(model.name)!.add(field.type);
      }
    }
  }

  const ordered: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(name: string) {
    if (visited.has(name) || visiting.has(name)) return; // cycle guard: best-effort order, never throws
    visiting.add(name);
    for (const dep of dependsOn.get(name) ?? []) visit(dep);
    visiting.delete(name);
    visited.add(name);
    ordered.push(name);
  }

  for (const name of modelNames) visit(name);
  return ordered;
}

/** "CompanyRealEstateAsset" -> "companyRealEstateAsset", matching Prisma Client's generated property naming. */
export function toClientPropertyName(modelName: string): string {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}
