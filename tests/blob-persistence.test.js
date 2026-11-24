import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import test from "node:test";
import { Readable } from "node:stream";
import { setTimeout } from "node:timers/promises";
import { URL } from "node:url";

import {
  BlobPersistenceAdapter,
  CorruptStoredDocumentError,
  PersistenceConflictError,
} from "../src/persistence/blob.ts";
import { MAX_SERIALIZED_OBJECT_BYTES } from "../src/schemas/serialized-object.ts";

const fixtureUrl = new URL(
  "./fixtures/skill-loom/a608c2853a83a017b46b24383bc5d81b4d22f1a9/chain-v3.json",
  import.meta.url,
);

function createChain(id) {
  return {
    ...JSON.parse(readFileSync(fixtureUrl, "utf8")),
    id,
  };
}

function conditionError() {
  const error = new Error("Blob condition failed.");
  error.statusCode = 412;
  error.code = "ConditionNotMet";
  return error;
}

function leaseAlreadyPresentError() {
  const error = new Error("A lease is already present.");
  error.statusCode = 409;
  error.code = "LeaseAlreadyPresent";
  return error;
}

class FakeBlobContainer {
  blobs = new Map();
  leases = new Map();
  nextEtag = 1;
  nextLease = 1;

  getBlobClient(name) {
    return {
      download: async () => {
        const stored = this.blobs.get(name);
        if (!stored) {
          const error = new Error("Blob not found.");
          error.statusCode = 404;
          error.code = "BlobNotFound";
          throw error;
        }
        return {
          etag: stored.etag,
          readableStreamBody: Readable.from([Buffer.from(stored.bytes)]),
        };
      },
    };
  }

  getBlockBlobClient(name) {
    return {
      uploadData: async (bytes, options) => {
        const current = this.blobs.get(name);
        if (options.conditions.ifNoneMatch === "*" && current) {
          throw conditionError();
        }
        if (options.conditions.ifMatch && current?.etag !== options.conditions.ifMatch) {
          throw conditionError();
        }

        const etag = `"fake-${this.nextEtag++}"`;
        this.blobs.set(name, { bytes: Buffer.from(bytes), etag });
        return { etag };
      },
      getBlobLeaseClient: () => {
        let leaseId;
        return {
          acquireLease: async () => {
            if (this.leases.has(name)) {
              throw leaseAlreadyPresentError();
            }
            leaseId = `fake-lease-${this.nextLease++}`;
            this.leases.set(name, leaseId);
            return { leaseId };
          },
          renewLease: async () => {
            if (this.leases.get(name) !== leaseId) {
              throw new Error("The lease is no longer held.");
            }
            return { leaseId };
          },
          releaseLease: async () => {
            if (this.leases.get(name) !== leaseId) {
              throw new Error("The lease is no longer held.");
            }
            this.leases.delete(name);
            return { leaseId };
          },
        };
      },
    };
  }

  listBlobsFlat({ prefix }) {
    return {
      byPage: ({ continuationToken, maxPageSize }) => {
        const names = [...this.blobs.keys()].filter((name) => name.startsWith(prefix)).sort();
        const offset = Number(continuationToken ?? 0);
        const pageItems = names.slice(offset, offset + maxPageSize).map((name) => ({ name }));
        const nextOffset = offset + pageItems.length;
        const page = {
          segment: { blobItems: pageItems },
          continuationToken: nextOffset < names.length ? String(nextOffset) : undefined,
        };
        let consumed = false;
        return {
          next: async () => {
            if (consumed) {
              return { done: true, value: undefined };
            }
            consumed = true;
            return { done: false, value: page };
          },
        };
      },
    };
  }

  setRaw(name, bytes) {
    const etag = `"fake-${this.nextEtag++}"`;
    this.blobs.set(name, { bytes: Buffer.from(bytes), etag });
  }
}

function createStore() {
  const container = new FakeBlobContainer();
  return { container, store: new BlobPersistenceAdapter(container) };
}

test("chain mutation locks serialize across persistence adapters sharing a container", async () => {
  const { container, store } = createStore();
  const secondStore = new BlobPersistenceAdapter(container);
  let releaseFirst;
  let markFirstEntered;
  const firstEntered = new Promise((resolve) => {
    markFirstEntered = resolve;
  });
  const firstMayFinish = new Promise((resolve) => {
    releaseFirst = resolve;
  });
  const first = store.withChainMutationLock(async () => {
    markFirstEntered();
    await firstMayFinish;
  });
  await firstEntered;

  let secondFinished = false;
  const second = secondStore.saveChain(createChain("serialized"), null).then(() => {
    secondFinished = true;
  });
  await setTimeout(10);
  assert.equal(secondFinished, false);

  releaseFirst();
  await Promise.all([first, second]);
  assert.equal(secondFinished, true);
});

test("chain persistence uses safe names, schema validation, and conditional revisions", async () => {
  const { container, store } = createStore();
  const chain = createChain("../../catalog/catalog.json");

  assert.equal(await store.getChain(chain.id), undefined);
  const created = await store.saveChain(chain, null);
  assert.equal(created.revision, 1);
  assert.ok(created.etag);
  assert.deepEqual((await store.getChain(chain.id)).document, created.document);

  const blobName = [...container.blobs.keys()].find((name) => name.startsWith("chains/"));
  assert.match(blobName, /^chains\/[a-f0-9]{64}\.json$/);
  assert.equal(blobName.includes("catalog"), false);
  assert.equal(container.blobs.has("locks/chain-catalog-mutations.lock"), true);

  const updated = await store.saveChain({
    ...chain,
    name: "Updated chain",
  }, created.revision);
  assert.equal(updated.revision, 2);
  await assert.rejects(
    store.saveChain(chain, created.revision),
    PersistenceConflictError,
  );
  assert.equal((await store.getChain(chain.id)).document.name, "Updated chain");
});

test("concurrent chain creates and updates reject stale writers", async () => {
  const { store } = createStore();
  const chain = createChain("race");
  const creates = await Promise.allSettled([
    store.saveChain(chain, null),
    store.saveChain(chain, null),
  ]);
  assert.equal(creates.filter(({ status }) => status === "fulfilled").length, 1);
  assert.equal(creates.filter(({ status }) => status === "rejected").length, 1);
  const created = await store.getChain(chain.id);

  const updates = await Promise.allSettled([
    store.saveChain({ ...chain, name: "Writer one" }, created.revision),
    store.saveChain({ ...chain, name: "Writer two" }, created.revision),
  ]);
  assert.equal(updates.filter(({ status }) => status === "fulfilled").length, 1);
  assert.equal(updates.filter(({ status }) => status === "rejected").length, 1);
  assert.ok(updates.some(
    ({ status, reason }) => status === "rejected" && reason instanceof PersistenceConflictError,
  ));
});

test("chain listing pages through bounded summaries", async () => {
  const { store } = createStore();
  for (const id of ["chain-a", "chain-b", "chain-c"]) {
    await store.saveChain(createChain(id), null);
  }

  const firstPage = await store.listChains({ limit: 2 });
  assert.equal(firstPage.items.length, 2);
  assert.ok(firstPage.nextCursor);
  assert.ok(firstPage.items.every(({ stepCount, revision }) => stepCount > 0 && revision === 1));

  const secondPage = await store.listChains({
    limit: 2,
    cursor: firstPage.nextCursor,
  });
  assert.equal(secondPage.items.length, 1);
  assert.equal(secondPage.nextCursor, undefined);
  await assert.rejects(store.listChains({ limit: 101 }), TypeError);
});

test("catalog starts at virtual revision 1 and uses ETag-conditional updates", async () => {
  const { store } = createStore();
  const initial = await store.getCatalog();
  assert.equal(initial.revision, 1);
  assert.equal(initial.etag, null);

  const skill = {
    name: "reviewed-skill",
    description: "Reviewed content",
    files: [{
      path: "SKILL.md",
      content: "dHJ1c3RlZCBvbmx5IGFmdGVyIHJldmlldw==",
      executable: false,
    }],
    fingerprint: "a".repeat(64),
    addedAt: "2026-11-21T12:00:00Z",
  };
  const saved = await store.saveCatalog({
    ...initial.document,
    skills: [skill],
  }, initial.revision);
  assert.equal(saved.revision, 2);
  assert.ok(saved.etag);

  const readBack = await store.getCatalog();
  assert.deepEqual(readBack.document.skills, [skill]);
  await assert.rejects(
    store.saveCatalog(initial.document, initial.revision),
    PersistenceConflictError,
  );
  const updated = await store.saveCatalog(readBack.document, readBack.revision);
  assert.equal(updated.revision, 3);
});

test("persistence rejects invalid input, corrupt stored JSON, and oversized reads", async () => {
  const { container, store } = createStore();
  await assert.rejects(store.saveChain({ id: "invalid" }, null));
  assert.equal(container.blobs.size, 0);

  container.setRaw("catalog/catalog.json", JSON.stringify({ version: 99 }));
  await assert.rejects(store.getCatalog(), CorruptStoredDocumentError);

  container.setRaw(
    "catalog/catalog.json",
    Buffer.alloc(MAX_SERIALIZED_OBJECT_BYTES + 1),
  );
  await assert.rejects(store.getCatalog(), CorruptStoredDocumentError);
});
