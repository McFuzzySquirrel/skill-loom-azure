import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";
import { z } from "zod";

import {
  APP_ROLES,
  authorizeWorkspaceRole,
  type AuthenticatedPrincipal,
} from "../auth/entra.js";
import {
  BundleSkillDirectorySchema,
  ChainBundleV1Schema,
  type ChainBundle,
} from "../schemas/bundle.js";
import {
  CatalogSchema,
  CatalogSkillSchema,
  CATALOG_VERSION,
  MAX_CATALOG_SKILLS,
  type Catalog,
  type CatalogSkill,
} from "../schemas/catalog.js";
import { ChainSchema, type Chain } from "../schemas/chain.js";
import {
  MAX_SERIALIZED_OBJECT_BYTES,
  serializedJsonByteLength,
} from "../schemas/serialized-object.js";
import { PersistenceConflictError } from "../persistence/blob.js";
import type { ChainPage, PersistedDocument } from "../persistence/blob.js";

export const SkillSubmissionSchema = CatalogSkillSchema.pick({
  name: true,
  description: true,
  files: true,
});

export type SkillSubmission = z.infer<typeof SkillSubmissionSchema>;

const SearchCursorSchema = z.strictObject({
  query: z.string().max(256),
  offset: z.number().int().min(0).max(MAX_CATALOG_SKILLS),
});

export interface SkillCatalogPersistence {
  getCatalog(): Promise<PersistedDocument<Catalog>>;
  saveCatalog(catalog: Catalog, expectedRevision: number): Promise<PersistedDocument<Catalog>>;
}

export interface ChainReadPersistence {
  withChainMutationLock<T>(operation: () => Promise<T>): Promise<T>;
  getChain(chainId: string): Promise<PersistedDocument<Chain> | undefined>;
  listChains(options?: {
    limit?: number;
    cursor?: string;
  }): Promise<ChainPage>;
}

export interface SkillSearchItem {
  name: string;
  description: string;
  fingerprint: string;
  addedAt: string;
}

export interface SkillSearchPage {
  revision: number;
  items: SkillSearchItem[];
  nextCursor?: string;
}

export interface AddedReviewedSkill {
  skill: CatalogSkill;
  catalogRevision: number;
  reviewedBy: string;
}

export class SkillNotFoundError extends Error {
  constructor() {
    super("The requested skill was not found in the reviewed catalog.");
    this.name = "SkillNotFoundError";
  }
}

export class SkillAlreadyExistsError extends Error {
  constructor() {
    super("A skill with this name already exists in the reviewed catalog.");
    this.name = "SkillAlreadyExistsError";
  }
}

export class SkillInUseError extends Error {
  constructor() {
    super("The skill is referenced by one or more stored chains.");
    this.name = "SkillInUseError";
  }
}

export class SkillCatalogLimitError extends Error {
  constructor() {
    super("The reviewed skill catalog has reached its configured limit.");
    this.name = "SkillCatalogLimitError";
  }
}

export class SkillPayloadTooLargeError extends Error {
  constructor() {
    super(`The catalog document exceeds ${MAX_SERIALIZED_OBJECT_BYTES} bytes.`);
    this.name = "SkillPayloadTooLargeError";
  }
}

export class InvalidSkillSearchCursorError extends Error {
  constructor() {
    super("The skill search cursor is invalid for this query.");
    this.name = "InvalidSkillSearchCursorError";
  }
}

export class CorruptCatalogSkillError extends Error {
  constructor() {
    super("A stored catalog skill failed path or fingerprint validation.");
    this.name = "CorruptCatalogSkillError";
  }
}

export class ChainNotFoundError extends Error {
  constructor() {
    super("The requested chain was not found.");
    this.name = "ChainNotFoundError";
  }
}

export class UnsupportedSkillSnapshotError extends Error {
  constructor() {
    super("The chain requires a skill or agent source that is not supported in v1.");
    this.name = "UnsupportedSkillSnapshotError";
  }
}

export class BundlePayloadTooLargeError extends Error {
  constructor() {
    super(`The exported chain bundle exceeds ${MAX_SERIALIZED_OBJECT_BYTES} bytes.`);
    this.name = "BundlePayloadTooLargeError";
  }
}

const MAX_SEARCH_LIMIT = 100;
const MAX_SEARCH_CURSOR_LENGTH = 2_048;
const MAX_SEARCH_QUERY_LENGTH = 256;

export function computeSkillFingerprint(
  skill: Pick<CatalogSkill, "name" | "description" | "files">,
) {
  const files = [...skill.files]
    .sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0)
    .map(({ path, content, executable }) => ({ path, content, executable }));
  const canonicalSkill = JSON.stringify({
    name: skill.name,
    description: skill.description,
    files,
  });
  return createHash("sha256").update(canonicalSkill, "utf8").digest("hex");
}

function normalizedSkillName(name: string) {
  return name.normalize("NFC").toLowerCase().normalize("NFC");
}

function verifyCatalog(document: Catalog): Catalog {
  const catalog = CatalogSchema.parse(document);
  const names = new Set<string>();
  const skills = catalog.skills.map((skill) => {
    const parsed = CatalogSkillSchema.parse(skill);
    const normalizedName = normalizedSkillName(parsed.name);
    if (names.has(normalizedName)) {
      throw new CorruptCatalogSkillError();
    }
    names.add(normalizedName);
    if (computeSkillFingerprint(parsed) !== parsed.fingerprint) {
      throw new CorruptCatalogSkillError();
    }
    return parsed;
  });
  return { ...catalog, skills };
}

function verifyPersistedCatalog(current: PersistedDocument<Catalog>) {
  const document = verifyCatalog(current.document);
  if (document.revision !== current.revision) {
    throw new CorruptCatalogSkillError();
  }
  return { ...current, document };
}

function searchCursor(query: string, offset: number) {
  return Buffer.from(JSON.stringify({ query, offset }), "utf8").toString("base64url");
}

function searchOffset(cursor: string | undefined, query: string) {
  if (cursor === undefined) {
    return 0;
  }
  if (cursor.length === 0 || cursor.length > MAX_SEARCH_CURSOR_LENGTH) {
    throw new InvalidSkillSearchCursorError();
  }

  const decoded = Buffer.from(cursor, "base64url");
  if (decoded.toString("base64url") !== cursor) {
    throw new InvalidSkillSearchCursorError();
  }

  let value: unknown;
  try {
    value = JSON.parse(decoded.toString("utf8"));
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new InvalidSkillSearchCursorError();
    }
    throw error;
  }
  const parsed = SearchCursorSchema.safeParse(value);
  if (!parsed.success || parsed.data.query !== query) {
    throw new InvalidSkillSearchCursorError();
  }
  return parsed.data.offset;
}

function bundleDirectory(name: string) {
  const safeName = BundleSkillDirectorySchema.safeParse(name);
  if (safeName.success) {
    return safeName.data;
  }
  const digest = createHash("sha256").update(name, "utf8").digest("hex");
  return `skill-${digest}`;
}

export class SkillCatalogService {
  constructor(
    private readonly catalogPersistence: SkillCatalogPersistence,
    private readonly chainPersistence: ChainReadPersistence,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async searchSkills(options: {
    query?: string;
    limit?: number;
    cursor?: string;
  } = {}): Promise<SkillSearchPage> {
    const query = (options.query ?? "").trim().toLowerCase();
    if (query.length > MAX_SEARCH_QUERY_LENGTH) {
      throw new TypeError(`Search query must not exceed ${MAX_SEARCH_QUERY_LENGTH} characters.`);
    }
    const limit = options.limit ?? 50;
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_SEARCH_LIMIT) {
      throw new TypeError(`Search limit must be an integer from 1 to ${MAX_SEARCH_LIMIT}.`);
    }

    const current = verifyPersistedCatalog(await this.catalogPersistence.getCatalog());
    const catalog = current.document;
    const matchingSkills = catalog.skills.filter((skill) => (
      query.length === 0
      || skill.name.toLowerCase().includes(query)
      || skill.description.toLowerCase().includes(query)
    ));
    const offset = searchOffset(options.cursor, query);
    const items = matchingSkills.slice(offset, offset + limit).map((skill) => ({
      name: skill.name,
      description: skill.description,
      fingerprint: skill.fingerprint,
      addedAt: skill.addedAt,
    }));
    const nextOffset = offset + items.length;

    return {
      revision: catalog.revision,
      items,
      ...(nextOffset < matchingSkills.length
        ? { nextCursor: searchCursor(query, nextOffset) }
        : {}),
    };
  }

  async getSkill(name: string): Promise<CatalogSkill> {
    const normalizedName = name.trim();
    if (normalizedName.length === 0 || normalizedName.length > 128) {
      throw new TypeError("Skill name must contain 1 to 128 characters.");
    }
    const current = verifyPersistedCatalog(await this.catalogPersistence.getCatalog());
    const catalog = current.document;
    const skill = catalog.skills.find((candidate) => candidate.name === normalizedName);
    if (!skill) {
      throw new SkillNotFoundError();
    }
    return skill;
  }

  async addReviewedSkill(
    principal: AuthenticatedPrincipal,
    submission: unknown,
    expectedRevision: number,
  ): Promise<AddedReviewedSkill> {
    authorizeWorkspaceRole(principal, APP_ROLES.admin);
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
      throw new TypeError("Catalog revision must be a positive safe integer.");
    }

    const submitted = SkillSubmissionSchema.parse(submission);
    const current = verifyPersistedCatalog(await this.catalogPersistence.getCatalog());
    if (current.revision !== expectedRevision) {
      throw new PersistenceConflictError();
    }
    const catalog = current.document;
    if (catalog.skills.length >= MAX_CATALOG_SKILLS) {
      throw new SkillCatalogLimitError();
    }

    const normalizedName = normalizedSkillName(submitted.name);
    if (catalog.skills.some((skill) => normalizedSkillName(skill.name) === normalizedName)) {
      throw new SkillAlreadyExistsError();
    }

    const skill = CatalogSkillSchema.parse({
      ...submitted,
      fingerprint: computeSkillFingerprint(submitted),
      addedAt: this.now().toISOString(),
    });
    const candidateCatalog = {
      version: CATALOG_VERSION,
      revision: current.revision,
      skills: [...catalog.skills, skill],
    };
    if (serializedJsonByteLength(candidateCatalog) > MAX_SERIALIZED_OBJECT_BYTES) {
      throw new SkillPayloadTooLargeError();
    }
    const nextCatalog = CatalogSchema.parse(candidateCatalog);
    const saved = await this.catalogPersistence.saveCatalog(nextCatalog, expectedRevision);
    return {
      skill,
      catalogRevision: saved.revision,
      reviewedBy: principal.subject,
    };
  }

  async removeReviewedSkill(
    principal: AuthenticatedPrincipal,
    name: string,
    expectedRevision: number,
  ): Promise<{ name: string; catalogRevision: number }> {
    authorizeWorkspaceRole(principal, APP_ROLES.admin);
    if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 1) {
      throw new TypeError("Catalog revision must be a positive safe integer.");
    }

    const submittedName = name.trim();
    if (submittedName.length === 0 || submittedName.length > 128) {
      throw new TypeError("Skill name must contain 1 to 128 characters.");
    }
    return this.chainPersistence.withChainMutationLock(async () => {
      const current = verifyPersistedCatalog(await this.catalogPersistence.getCatalog());
      if (current.revision !== expectedRevision) {
        throw new PersistenceConflictError();
      }
      const normalizedName = normalizedSkillName(submittedName);
      const skill = current.document.skills.find(
        (candidate) => normalizedSkillName(candidate.name) === normalizedName,
      );
      if (!skill) {
        throw new SkillNotFoundError();
      }

      let cursor: string | undefined;
      do {
        const page = await this.chainPersistence.listChains({
          limit: 100,
          ...(cursor === undefined ? {} : { cursor }),
        });
        for (const summary of page.items) {
          const stored = await this.chainPersistence.getChain(summary.id);
          const referencesSkill = stored?.document.steps.some((step) => (
            step.kind !== "instruction"
            && normalizedSkillName(step.skillName) === normalizedName
          ));
          if (referencesSkill) {
            throw new SkillInUseError();
          }
        }
        cursor = page.nextCursor;
      } while (cursor !== undefined);

      const nextCatalog = {
        ...current.document,
        skills: current.document.skills.filter(
          (candidate) => normalizedSkillName(candidate.name) !== normalizedName,
        ),
      };
      const saved = await this.catalogPersistence.saveCatalog(nextCatalog, expectedRevision);
      return { name: skill.name, catalogRevision: saved.revision };
    });
  }

  async exportChainBundle(chainId: string): Promise<ChainBundle> {
    const persistedChain = await this.chainPersistence.getChain(chainId);
    if (!persistedChain) {
      throw new ChainNotFoundError();
    }
    const chain = ChainSchema.parse(persistedChain.document);
    if (chain.agent) {
      throw new UnsupportedSkillSnapshotError();
    }

    const current = verifyPersistedCatalog(await this.catalogPersistence.getCatalog());
    const catalog = current.document;
    const skillsByName = new Map(catalog.skills.map((skill) => [skill.name, skill]));
    const seenNames = new Set<string>();
    const skills = [];
    for (const step of chain.steps) {
      if (step.kind === "instruction") {
        continue;
      }
      if (step.skillBinding) {
        throw new UnsupportedSkillSnapshotError();
      }
      if (seenNames.has(step.skillName)) {
        continue;
      }
      seenNames.add(step.skillName);
      const skill = skillsByName.get(step.skillName);
      if (!skill) {
        throw new SkillNotFoundError();
      }
      skills.push({
        name: skill.name,
        directory: bundleDirectory(skill.name),
        files: skill.files,
      });
    }

    const candidate = {
      format: "skill-loom-chain" as const,
      version: 1 as const,
      chain: {
        name: chain.name,
        harness: chain.harness,
        sessionMode: chain.sessionMode,
        steps: chain.steps,
        inputs: chain.inputs,
      },
      skills,
    };
    if (serializedJsonByteLength(candidate) > MAX_SERIALIZED_OBJECT_BYTES) {
      throw new BundlePayloadTooLargeError();
    }
    return ChainBundleV1Schema.parse(candidate);
  }
}
