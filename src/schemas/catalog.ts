import { z } from "zod";

import { BundleSkillFilesSchema, MAX_BUNDLE_FILES } from "./bundle.js";
import { withSerializedObjectLimit } from "./serialized-object.js";

export const CATALOG_VERSION = 1;
export const MAX_CATALOG_SKILLS = 100;
export const MAX_CATALOG_FILES = MAX_BUNDLE_FILES;

export const CatalogSkillSchema = z.strictObject({
  name: z.string().trim().min(1).max(128),
  description: z.string().max(4_096),
  files: BundleSkillFilesSchema,
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  addedAt: z.iso.datetime({ offset: true }),
});

export const CatalogSchema = withSerializedObjectLimit(z.strictObject({
  version: z.literal(CATALOG_VERSION),
  revision: z.number().int().positive(),
  skills: z.array(CatalogSkillSchema).max(MAX_CATALOG_SKILLS),
}));

export type Catalog = z.infer<typeof CatalogSchema>;
export type CatalogSkill = z.infer<typeof CatalogSkillSchema>;
