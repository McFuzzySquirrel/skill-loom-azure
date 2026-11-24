import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import test from "node:test";
import { setImmediate } from "node:timers/promises";

import { APP_ROLES, AuthorizationError } from "../src/auth/entra.ts";
import { PersistenceConflictError } from "../src/persistence/blob.ts";
import { ChainSchema } from "../src/schemas/chain.ts";
import { CatalogSchema } from "../src/schemas/catalog.ts";
import {
  ChainNotFoundError,
  CorruptCatalogSkillError,
  InvalidSkillSearchCursorError,
  SkillAlreadyExistsError,
  SkillCatalogService,
  SkillInUseError,
  SkillNotFoundError,
  UnsupportedSkillSnapshotError,
  computeSkillFingerprint,
} from "../src/skills/catalog.ts";

const admin = {
  tenantId: "tenant",
  subject: "admin-object-id",
  roles: [APP_ROLES.admin],
};

const user = {
  tenantId: "tenant",
  subject: "user-object-id",
  roles: [APP_ROLES.user],
};

const content = Buffer.from("# Reviewed skill\n").toString("base64");

function submission(name, path = "SKILL.md") {
  return {
    name,
    description: `Reviewed content for ${name}`,
    files: [{ path, content, executable: false }],
  };
}

function chain(id, steps, extra = {}) {
  return ChainSchema.parse({
    version: 3,
    id,
    name: `Chain ${id}`,
    harness: "opencode",
    sessionMode: "shared",
    steps,
    inputs: [],
    automaticPermissionOptIn: false,
    createdAt: "2026-11-21T12:00:00Z",
    updatedAt: "2026-11-21T12:00:00Z",
    ...extra,
  });
}

function deferred() {
  let resolve;
  const promise = new Promise((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

class FakeCatalogPersistence {
  document = CatalogSchema.parse({
    version: 1,
    revision: 1,
    skills: [],
  });

  etag = null;

  async getCatalog() {
    return {
      document: this.document,
      revision: this.document.revision,
      etag: this.etag,
    };
  }

  async saveCatalog(catalog, expectedRevision) {
    if (this.document.revision !== expectedRevision) {
      throw new PersistenceConflictError();
    }
    this.document = CatalogSchema.parse({
      ...catalog,
      revision: this.document.revision + 1,
    });
    this.etag = `"fake-${this.document.revision}"`;
    return {
      document: this.document,
      revision: this.document.revision,
      etag: this.etag,
    };
  }
}

class FakeChainPersistence {
  chains = new Map();
  mutationTail = Promise.resolve();

  async withChainMutationLock(operation) {
    const previous = this.mutationTail;
    let release;
    this.mutationTail = new Promise((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  }

  async saveChain(document, beforeSave = async () => {}) {
    return this.withChainMutationLock(async () => {
      await beforeSave();
      this.chains.set(document.id, document);
    });
  }

  async getChain(chainId) {
    const document = this.chains.get(chainId);
    return document
      ? { document, revision: 1, etag: '"fake-chain"' }
      : undefined;
  }

  async listChains(options = {}) {
    const chains = [...this.chains.values()];
    const offset = options.cursor ? Number(options.cursor) : 0;
    const items = chains.slice(offset, offset + (options.limit ?? 100));
    const nextOffset = offset + items.length;
    return {
      items: items.map((document) => ({ id: document.id })),
      ...(nextOffset < chains.length ? { nextCursor: String(nextOffset) } : {}),
    };
  }
}

function createService(options = {}) {
  const catalogPersistence = options.catalogPersistence ?? new FakeCatalogPersistence();
  const chainPersistence = options.chainPersistence ?? new FakeChainPersistence();
  const service = new SkillCatalogService(
    catalogPersistence,
    chainPersistence,
    () => new Date("2026-11-21T12:00:00.000Z"),
  );
  return { catalogPersistence, chainPersistence, service };
}

test("reviewed additions require Admin and preserve immutable content fingerprints", async () => {
  const { catalogPersistence, service } = createService();
  await assert.rejects(
    service.addReviewedSkill(user, submission("review"), 1),
    AuthorizationError,
  );

  const added = await service.addReviewedSkill(admin, submission("review"), 1);
  assert.equal(added.reviewedBy, admin.subject);
  assert.equal(added.catalogRevision, 2);
  assert.equal(added.skill.addedAt, "2026-11-21T12:00:00.000Z");
  assert.equal(added.skill.fingerprint, computeSkillFingerprint(added.skill));
  assert.deepEqual(await service.getSkill("review"), added.skill);

  const page = await service.searchSkills({ query: "REVIEW" });
  assert.equal(page.revision, 2);
  assert.deepEqual(Object.keys(page.items[0]).sort(), [
    "addedAt",
    "description",
    "fingerprint",
    "name",
  ]);
  assert.equal(page.items[0].name, "review");

  await assert.rejects(
    service.addReviewedSkill(admin, submission("Review"), 2),
    SkillAlreadyExistsError,
  );
  assert.equal(catalogPersistence.document.skills.length, 1);
});

test("reviewed skill removal requires Admin and advances the catalog revision", async () => {
  const { catalogPersistence, service } = createService();
  await service.addReviewedSkill(admin, submission("review"), 1);
  await assert.rejects(
    service.removeReviewedSkill(user, "review", 2),
    AuthorizationError,
  );

  const removed = await service.removeReviewedSkill(admin, "REVIEW", 2);
  assert.deepEqual(removed, { name: "review", catalogRevision: 3 });
  assert.equal(catalogPersistence.document.skills.length, 0);
  await assert.rejects(service.getSkill("review"), SkillNotFoundError);
});

test("reviewed skill removal is blocked while any stored chain references it", async () => {
  const { catalogPersistence, chainPersistence, service } = createService();
  await service.addReviewedSkill(admin, submission("review"), 1);
  chainPersistence.chains.set("chain-1", chain("chain-1", [
    { id: "step-1", skillName: "review", instruction: "Use the skill." },
  ]));

  await assert.rejects(
    service.removeReviewedSkill(admin, "review", 2),
    SkillInUseError,
  );
  assert.equal(catalogPersistence.document.revision, 2);
  assert.equal(catalogPersistence.document.skills[0].name, "review");
});

test("reviewed skill removal waits for an in-flight chain save before scanning", async () => {
  const chainPersistence = new FakeChainPersistence();
  const { catalogPersistence, service } = createService({ chainPersistence });
  await service.addReviewedSkill(admin, submission("review"), 1);
  const saveStarted = deferred();
  const finishSave = deferred();
  const saving = chainPersistence.saveChain(
    chain("chain-during-removal", [
      { id: "review", skillName: "review", instruction: "Use the reviewed skill." },
    ]),
    async () => {
      saveStarted.resolve();
      await finishSave.promise;
    },
  );
  await saveStarted.promise;

  let scanStarted = false;
  const listChains = chainPersistence.listChains.bind(chainPersistence);
  chainPersistence.listChains = async (...args) => {
    scanStarted = true;
    return listChains(...args);
  };
  const removing = service.removeReviewedSkill(admin, "review", 2);
  await setImmediate();
  assert.equal(scanStarted, false);

  finishSave.resolve();
  await saving;
  await assert.rejects(removing, SkillInUseError);
  assert.equal(catalogPersistence.document.skills[0].name, "review");
});

test("reviewed skill removal scans every chain page", async () => {
  const { chainPersistence, service } = createService();
  await service.addReviewedSkill(admin, submission("review"), 1);
  for (let index = 0; index < 100; index += 1) {
    const id = `chain-${index}`;
    chainPersistence.chains.set(id, chain(id, [
      { id: "step-1", kind: "instruction", instruction: "Continue." },
    ]));
  }
  chainPersistence.chains.set("chain-last", chain("chain-last", [
    { id: "step-1", skillName: "review", instruction: "Use the skill." },
  ]));

  await assert.rejects(
    service.removeReviewedSkill(admin, "review", 2),
    SkillInUseError,
  );
});

test("catalog additions reject unsafe paths, duplicate paths, and malformed bytes", async () => {
  const { service, catalogPersistence } = createService();
  for (const path of ["../escape", "/absolute", "C:/escape", "folder\\escape"]) {
    await assert.rejects(
      service.addReviewedSkill(admin, submission("safe-name", path), 1),
    );
  }
  await assert.rejects(service.addReviewedSkill(admin, {
    ...submission("safe-name"),
    files: [
      { path: "README.md", content, executable: false },
      { path: "readme.md", content, executable: false },
    ],
  }, 1));
  await assert.rejects(service.addReviewedSkill(admin, {
    ...submission("safe-name"),
    files: [{ path: "SKILL.md", content: "not base64", executable: false }],
  }, 1));
  assert.equal(catalogPersistence.document.skills.length, 0);
});

test("skill search cursors are bounded to their query and return metadata only", async () => {
  const { service } = createService();
  for (const name of ["review-one", "review-two", "other"]) {
    const current = await service.searchSkills();
    await service.addReviewedSkill(admin, submission(name), current.revision);
  }

  const first = await service.searchSkills({ query: "review", limit: 1 });
  assert.equal(first.items.length, 1);
  assert.ok(first.nextCursor);
  assert.equal("files" in first.items[0], false);

  const second = await service.searchSkills({
    query: "review",
    limit: 1,
    cursor: first.nextCursor,
  });
  assert.equal(second.items.length, 1);
  assert.notEqual(first.items[0].name, second.items[0].name);
  await assert.rejects(
    service.searchSkills({ query: "other", cursor: first.nextCursor }),
    InvalidSkillSearchCursorError,
  );
  await assert.rejects(service.searchSkills({ limit: 101 }), TypeError);
});

test("bundle export resolves reviewed skills as a fixed snapshot", async () => {
  const { chainPersistence, service } = createService();
  const added = await service.addReviewedSkill(admin, submission("review"), 1);
  chainPersistence.chains.set("chain-1", chain("chain-1", [
    { id: "step-1", skillName: "review", instruction: "Use the reviewed skill." },
    { id: "step-2", skillName: "review", instruction: "Use it again." },
    { id: "step-3", kind: "instruction", instruction: "Summarize." },
  ]));

  const bundle = await service.exportChainBundle("chain-1");
  assert.equal(bundle.version, 1);
  assert.equal(bundle.skills.length, 1);
  assert.equal(bundle.skills[0].directory, "review");
  assert.deepEqual(bundle.skills[0].files, added.skill.files);
  assert.deepEqual(await service.exportChainBundle("chain-1"), bundle);

  await service.addReviewedSkill(admin, submission("../../unsafe"), 2);
  chainPersistence.chains.set("chain-unsafe-name", chain("chain-unsafe-name", [
    { id: "unsafe-name", skillName: "../../unsafe", instruction: "Use a skill." },
  ]));
  const safeBundle = await service.exportChainBundle("chain-unsafe-name");
  assert.match(safeBundle.skills[0].directory, /^skill-[a-f0-9]{64}$/);

  chainPersistence.chains.set("chain-external", chain("chain-external", [
    {
      id: "external",
      skillName: "review",
      skillBinding: {
        sourceId: "source",
        revision: "a".repeat(40),
        repositoryPath: "skills/review",
      },
      instruction: "Use external content.",
    },
  ]));
  await assert.rejects(
    service.exportChainBundle("chain-external"),
    UnsupportedSkillSnapshotError,
  );
  chainPersistence.chains.set("chain-agent", chain("chain-agent", [
    { id: "instruction", kind: "instruction", instruction: "Continue." },
  ], {
    agent: {
      harness: "opencode",
      name: "reviewer",
      sourceId: "source",
      revision: "a".repeat(40),
      repositoryPath: ".opencode/agents/reviewer.md",
      agentPath: "reviewer.md",
      fingerprint: "b".repeat(64),
    },
  }));
  await assert.rejects(service.exportChainBundle("chain-agent"), UnsupportedSkillSnapshotError);
  chainPersistence.chains.set("chain-missing-skill", chain("chain-missing-skill", [
    { id: "missing", skillName: "absent", instruction: "Use a skill." },
  ]));
  await assert.rejects(service.exportChainBundle("chain-missing-skill"), SkillNotFoundError);
  await assert.rejects(service.exportChainBundle("missing"), ChainNotFoundError);
});

test("catalog reads reject stored content that no longer matches its fingerprint", async () => {
  const { catalogPersistence, service } = createService();
  await service.addReviewedSkill(admin, submission("review"), 1);
  catalogPersistence.document.skills[0].files[0].content = Buffer.from("changed").toString("base64");
  await assert.rejects(service.getSkill("review"), CorruptCatalogSkillError);
});

test("concurrent reviewed additions reject the stale catalog revision", async () => {
  const { service } = createService();
  const results = await Promise.allSettled([
    service.addReviewedSkill(admin, submission("first"), 1),
    service.addReviewedSkill(admin, submission("second"), 1),
  ]);
  assert.equal(results.filter(({ status }) => status === "fulfilled").length, 1);
  assert.ok(results.some(
    ({ status, reason }) => status === "rejected" && reason instanceof PersistenceConflictError,
  ));
});
