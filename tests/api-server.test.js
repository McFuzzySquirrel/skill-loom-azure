import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import net from "node:net";
import test from "node:test";
import { URL } from "node:url";

import { createApiServer } from "../src/api/server.ts";
import { AuthenticationError } from "../src/auth/entra.ts";
import {
  MutationLockUnavailableError,
  PersistenceConflictError,
} from "../src/persistence/blob.ts";
import { MAX_SERIALIZED_OBJECT_BYTES } from "../src/schemas/serialized-object.ts";
import { SkillInUseError } from "../src/skills/catalog.ts";

const chain = JSON.parse(readFileSync(
  new URL("./fixtures/skill-loom/a608c2853a83a017b46b24383bc5d81b4d22f1a9/chain-v3.json", import.meta.url),
  "utf8",
));
const principal = {
  tenantId: "tenant-private-value",
  subject: "subject-private-value",
  roles: ["SkillLoom.User"],
};

function createDependencies({ saveChain, removeReviewedSkill } = {}) {
  const auditEvents = [];
  const savedChains = [];
  const removedSkills = [];
  const dependencies = {
    verifyToken: async (token) => {
      if (token !== "valid-token" && token !== "admin-token") {
        throw new AuthenticationError();
      }
      return token === "admin-token"
        ? { ...principal, roles: ["SkillLoom.Admin"] }
        : principal;
    },
    chains: {
      getChain: async () => undefined,
      listChains: async () => ({ items: [], nextCursor: null }),
      saveChain: async (document, expectedRevision) => {
        savedChains.push({ document, expectedRevision });
        if (saveChain) {
          return saveChain(document, expectedRevision);
        }
        return { document, revision: 1, etag: "stored-etag" };
      },
    },
    catalog: {
      searchSkills: async () => ({ revision: 1, items: [], nextCursor: null }),
      getSkill: async () => {
        throw new Error("Not used by this test.");
      },
      addReviewedSkill: async () => {
        throw new Error("Not used by this test.");
      },
      removeReviewedSkill: async (caller, name, revision) => {
        removedSkills.push({ caller, name, revision });
        if (removeReviewedSkill) {
          return removeReviewedSkill(caller, name, revision);
        }
        return { name, catalogRevision: revision + 1 };
      },
      exportChainBundle: async () => {
        throw new Error("Not used by this test.");
      },
    },
    auditLogger: {
      write: (event) => auditEvents.push(event),
    },
  };
  return { dependencies, auditEvents, savedChains, removedSkills };
}

async function withServer(dependencies, callback) {
  const server = createApiServer(dependencies);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");

  try {
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("unknown health paths do not bypass API authentication", async () => {
  const { dependencies } = createDependencies();
  await withServer(dependencies, async (baseUrl) => {
    const liveProbe = await globalThis.fetch(`${baseUrl}/_health/live`);
    const readyProbe = await globalThis.fetch(`${baseUrl}/_health/ready`);
    const authenticatedProbe = await globalThis.fetch(`${baseUrl}/_health/ready`, {
      headers: { authorization: "Bearer valid-token" },
    });
    const apiHealth = await globalThis.fetch(`${baseUrl}/v1/health`);

    assert.equal(liveProbe.status, 401);
    assert.equal(readyProbe.status, 401);
    assert.equal(authenticatedProbe.status, 404);
    assert.equal(apiHealth.status, 401);
  });
});

test("chain writes require a condition and map stale revisions to 412", async () => {
  const missingCondition = createDependencies();
  await withServer(missingCondition.dependencies, async (baseUrl) => {
    const response = await globalThis.fetch(`${baseUrl}/v1/chains/${chain.id}`, {
      method: "PUT",
      headers: { authorization: "Bearer valid-token" },
    });
    assert.equal(response.status, 428);
    assert.equal(missingCondition.savedChains.length, 0);

    const createResponse = await globalThis.fetch(`${baseUrl}/v1/chains/${chain.id}`, {
      method: "PUT",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
        "if-none-match": "*",
      },
      body: JSON.stringify(chain),
    });
    assert.equal(createResponse.status, 201);
    assert.equal(createResponse.headers.get("etag"), '"1"');
    assert.equal(missingCondition.savedChains[0].expectedRevision, null);
  });

  const staleCondition = createDependencies({
    saveChain: async () => {
      throw new PersistenceConflictError();
    },
  });
  await withServer(staleCondition.dependencies, async (baseUrl) => {
    const response = await globalThis.fetch(`${baseUrl}/v1/chains/${chain.id}`, {
      method: "PUT",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
        "if-match": '"7"',
      },
      body: JSON.stringify(chain),
    });
    assert.equal(response.status, 412);
    assert.equal((await response.json()).code, "precondition_failed");
  });
});

test("skill removal requires Admin and the current catalog revision", async () => {
  const { dependencies, removedSkills } = createDependencies();
  await withServer(dependencies, async (baseUrl) => {
    const userResponse = await globalThis.fetch(
      `${baseUrl}/v1/admin/skills/reviewed-skill`,
      {
        method: "DELETE",
        headers: {
          authorization: "Bearer valid-token",
          "if-match": '"4"',
        },
      },
    );
    assert.equal(userResponse.status, 403);
    assert.equal(removedSkills.length, 0);

    const missingCondition = await globalThis.fetch(
      `${baseUrl}/v1/admin/skills/reviewed-skill`,
      {
        method: "DELETE",
        headers: { authorization: "Bearer admin-token" },
      },
    );
    assert.equal(missingCondition.status, 428);
    assert.equal(removedSkills.length, 0);

    const adminResponse = await globalThis.fetch(
      `${baseUrl}/v1/admin/skills/reviewed%20skill`,
      {
        method: "DELETE",
        headers: {
          authorization: "Bearer admin-token",
          "if-match": '"4"',
        },
      },
    );
    assert.equal(adminResponse.status, 200);
    assert.deepEqual(await adminResponse.json(), {
      name: "reviewed skill",
      catalogRevision: 5,
    });
    assert.equal(adminResponse.headers.get("etag"), '"5"');
    assert.equal(removedSkills[0].caller.roles[0], "SkillLoom.Admin");
    assert.equal(removedSkills[0].name, "reviewed skill");
    assert.equal(removedSkills[0].revision, 4);
  });
});

test("skill removal reports a conflict when the catalog skill is in use", async () => {
  const { dependencies } = createDependencies({
    removeReviewedSkill: async () => {
      throw new SkillInUseError();
    },
  });
  await withServer(dependencies, async (baseUrl) => {
    const response = await globalThis.fetch(
      `${baseUrl}/v1/admin/skills/reviewed-skill`,
      {
        method: "DELETE",
        headers: {
          authorization: "Bearer admin-token",
          "if-match": '"4"',
        },
      },
    );
    assert.equal(response.status, 409);
    assert.deepEqual(await response.json(), {
      code: "skill_in_use",
      message: "The skill is referenced by one or more stored chains.",
    });
  });
});

test("skill removal reports temporary unavailability when the shared lock times out", async () => {
  const { dependencies } = createDependencies({
    removeReviewedSkill: async () => {
      throw new MutationLockUnavailableError();
    },
  });
  await withServer(dependencies, async (baseUrl) => {
    const response = await globalThis.fetch(
      `${baseUrl}/v1/admin/skills/reviewed-skill`,
      {
        method: "DELETE",
        headers: {
          authorization: "Bearer admin-token",
          "if-match": '"4"',
        },
      },
    );
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      code: "storage_busy",
      message: "Another chain or catalog change is in progress. Retry the request.",
    });
  });
});

test("oversized declared bodies are rejected before body parsing", async () => {
  const { dependencies, savedChains } = createDependencies();
  await withServer(dependencies, async (baseUrl) => {
    const { port } = new URL(baseUrl);
    const response = await new Promise((resolve, reject) => {
      const socket = net.createConnection(Number(port), "127.0.0.1");
      const chunks = [];
      socket.on("error", reject);
      socket.on("data", (chunk) => chunks.push(chunk));
      socket.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      socket.on("connect", () => {
        socket.write([
          `PUT /v1/chains/${chain.id} HTTP/1.1`,
          "Host: localhost",
          "Authorization: Bearer valid-token",
          "Content-Type: application/json",
          "If-None-Match: *",
          `Content-Length: ${MAX_SERIALIZED_OBJECT_BYTES + 1}`,
          "Connection: close",
          "",
          "",
        ].join("\r\n"));
      });
    });

    assert.match(response, /^HTTP\/1\.1 413 /);
    assert.equal(savedChains.length, 0);
  });
});

test("audit events omit request paths, query strings, tokens, principals, and skill content", async () => {
  const { dependencies, auditEvents } = createDependencies();
  await withServer(dependencies, async (baseUrl) => {
    const searchResponse = await globalThis.fetch(
      `${baseUrl}/v1/skills?q=query-private-value`,
      { headers: { authorization: "Bearer valid-token" } },
    );
    assert.equal(searchResponse.status, 200);

    const privateChain = { ...chain, name: "body-private-value" };
    const saveResponse = await globalThis.fetch(`${baseUrl}/v1/chains/${chain.id}`, {
      method: "PUT",
      headers: {
        authorization: "Bearer valid-token",
        "content-type": "application/json",
        "if-none-match": "*",
      },
      body: JSON.stringify(privateChain),
    });
    assert.equal(saveResponse.status, 201);

    const serializedEvents = JSON.stringify(auditEvents);
    for (const privateValue of [
      "/v1/skills",
      "query-private-value",
      "valid-token",
      "tenant-private-value",
      "subject-private-value",
      "body-private-value",
    ]) {
      assert.equal(serializedEvents.includes(privateValue), false);
    }
    assert.equal(auditEvents.length, 2);
    assert.match(auditEvents[0].actorHash, /^[a-f0-9]{64}$/);
    assert.equal(auditEvents[1].operationId, "saveChain");
  });
});
