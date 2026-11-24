import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

import {
  CHAIN_INPUT_NAME_PATTERN,
  CHAIN_VERSION,
  ChainStepSchema,
} from "../src/schemas/chain.ts";
import {
  API_OPERATION_POLICIES,
  APP_ROLES,
  ApiRouteNotFoundError,
  AuthenticationError,
  AuthorizationError,
  authenticateApiRequest,
} from "../src/auth/entra.ts";
import { createToolboxOpenApiSpec } from "../src/foundry/openapi-toolbox.ts";

const openApiUrl = new URL("../docs/openapi.json", import.meta.url);
const openApi = JSON.parse(readFileSync(openApiUrl, "utf8"));

function resolvePointer(document, pointer) {
  assert.ok(pointer.startsWith("#/"), `Expected local reference, got ${pointer}`);
  return pointer.slice(2).split("/").reduce((value, part) => {
    const key = part.replaceAll("~1", "/").replaceAll("~0", "~");
    assert.ok(value && Object.hasOwn(value, key), `Unresolved reference: ${pointer}`);
    return value[key];
  }, document);
}

function findReferences(value) {
  if (Array.isArray(value)) {
    return value.flatMap(findReferences);
  }
  if (value && typeof value === "object") {
    return [
      ...(typeof value.$ref === "string" ? [value.$ref] : []),
      ...Object.values(value).flatMap(findReferences),
    ];
  }
  return [];
}

test("OpenAPI contract declares every route authenticated by Entra", () => {
  assert.equal(openApi.openapi, "3.1.1");
  assert.deepEqual(openApi.security, [{ entraBearer: [] }]);
  assert.match(
    openApi.components.securitySchemes.entraBearer.description,
    /expected aud claim is the API application's client ID/,
  );
  assert.match(
    openApi.components.securitySchemes.entraBearer.description,
    /api:\/\/<application-id>\/\.default/,
  );
  assert.deepEqual(
    Object.keys(openApi.paths).sort(),
    [
      "/v1/admin/skills",
      "/v1/admin/skills/{skillName}",
      "/v1/chains",
      "/v1/chains/{chainId}",
      "/v1/chains/{chainId}/bundle",
      "/v1/health",
      "/v1/skills",
      "/v1/skills/{skillName}",
    ].sort(),
  );

  for (const [path, pathItem] of Object.entries(openApi.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (["get", "post", "put", "patch", "delete"].includes(method)) {
        assert.deepEqual(
          operation["x-required-app-roles"],
          path.startsWith("/v1/admin/skills")
            ? ["SkillLoom.Admin"]
            : ["SkillLoom.User", "SkillLoom.Admin"],
          `${method.toUpperCase()} ${path} must declare its app role`,
        );
      }
    }
  }
});

test("API auth gate covers every OpenAPI operation and enforces its role policy", async () => {
  const operations = Object.values(openApi.paths).flatMap((pathItem) => (
    Object.entries(pathItem)
      .filter(([method]) => ["get", "post", "put", "patch", "delete"].includes(method))
      .map(([, operation]) => operation)
  ));
  assert.deepEqual(
    operations.map(({ operationId }) => operationId).sort(),
    Object.keys(API_OPERATION_POLICIES).sort(),
  );

  const user = { tenantId: "test-tenant", subject: "user", roles: [APP_ROLES.user] };
  const admin = { tenantId: "test-tenant", subject: "admin", roles: [APP_ROLES.admin] };
  const verifyToken = async (token) => (token === "admin" ? admin : user);

  for (const [path, pathItem] of Object.entries(openApi.paths)) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!["get", "post", "put", "patch", "delete"].includes(method)) {
        continue;
      }

      const requestTarget = path
        .replace("{chainId}", "chain-1")
        .replace("{skillName}", "skill-one");
      if (API_OPERATION_POLICIES[operation.operationId] === APP_ROLES.admin) {
        await assert.rejects(
          authenticateApiRequest(method, requestTarget, "Bearer user", verifyToken),
          AuthorizationError,
        );
      } else {
        const result = await authenticateApiRequest(
          method,
          requestTarget,
          "Bearer user",
          verifyToken,
        );
        assert.equal(result.operationId, operation.operationId);
      }

      const adminResult = await authenticateApiRequest(
        method,
        requestTarget,
        "Bearer admin",
        verifyToken,
      );
      assert.equal(adminResult.operationId, operation.operationId);
    }
  }
});

test("API auth gate authenticates before returning route-not-found", async () => {
  const verifyToken = async () => ({
    tenantId: "test-tenant",
    subject: "user",
    roles: [APP_ROLES.user],
  });

  await assert.rejects(
    authenticateApiRequest("GET", "/not-a-route", undefined, verifyToken),
    AuthenticationError,
  );
  await assert.rejects(
    authenticateApiRequest("GET", "/not-a-route", "Bearer valid", verifyToken),
    ApiRouteNotFoundError,
  );
  await assert.rejects(
    authenticateApiRequest("GET", "https://api.invalid/v1/health", "Bearer valid", verifyToken),
    ApiRouteNotFoundError,
  );
  await assert.rejects(
    authenticateApiRequest(
      "POST",
      "/v1/admin/skills",
      "Bearer user",
      verifyToken,
    ),
    AuthorizationError,
  );
});

test("OpenAPI contract protects saves against stale revisions and describes bounded responses", () => {
  const saveChain = openApi.paths["/v1/chains/{chainId}"].put;
  assert.equal(
    saveChain.parameters.some((parameter) => parameter.name === "If-Match"),
    true,
  );
  assert.equal(
    saveChain.parameters.some((parameter) => parameter.$ref === "#/components/parameters/IfNoneMatch"),
    true,
  );
  assert.equal(saveChain.responses["412"].$ref, "#/components/responses/PreconditionFailed");
  assert.equal(openApi.paths["/v1/admin/skills"].post.responses["412"].$ref, "#/components/responses/PreconditionFailed");
  assert.equal(openApi.paths["/v1/admin/skills/{skillName}"].delete.responses["412"].$ref, "#/components/responses/PreconditionFailed");
  assert.equal(openApi.paths["/v1/chains/{chainId}"].put.responses["503"].$ref, "#/components/responses/ServiceUnavailable");
  assert.equal(openApi.paths["/v1/admin/skills/{skillName}"].delete.responses["503"].$ref, "#/components/responses/ServiceUnavailable");
  assert.equal(openApi.components.parameters.Limit.schema.maximum, 100);
  assert.match(openApi.components.schemas.Chain.description, /32 MiB/);
  assert.match(openApi.components.schemas.ChainBundle.description, /20 MiB.*32 MiB/);
});

test("Foundry Toolbox OpenAPI mapping uses only User operations and the HTTPS API origin", () => {
  const toolboxSpec = createToolboxOpenApiSpec(openApi, "https://api.example.test/");
  const operationIds = Object.values(toolboxSpec.paths).flatMap((pathItem) => (
    Object.entries(pathItem)
      .filter(([method]) => ["get", "post", "put", "patch", "delete", "head", "options", "trace"].includes(method))
      .map(([, operation]) => operation.operationId)
  ));

  assert.deepEqual(toolboxSpec.servers, [{ url: "https://api.example.test" }]);
  assert.deepEqual(operationIds.sort(), [
    "exportChainBundle",
    "getChain",
    "getHealth",
    "getSkill",
    "listChains",
    "saveChain",
    "searchSkills",
  ]);
  assert.equal("/v1/admin/skills" in toolboxSpec.paths, false);
  assert.equal("/v1/admin/skills/{skillName}" in toolboxSpec.paths, false);
  assert.deepEqual(toolboxSpec.security, openApi.security);
});

test("Foundry Toolbox OpenAPI mapping rejects unsafe endpoints and invalid operation metadata", () => {
  assert.throws(
    () => createToolboxOpenApiSpec(openApi, "http://api.example.test"),
    /HTTPS origin/,
  );
  assert.throws(
    () => createToolboxOpenApiSpec(openApi, "https://api.example.test/v1"),
    /without credentials or a path/,
  );

  const missingRoles = JSON.parse(JSON.stringify(openApi));
  delete missingRoles.paths["/v1/health"].get["x-required-app-roles"];
  assert.throws(
    () => createToolboxOpenApiSpec(missingRoles, "https://api.example.test"),
    /must declare app roles/,
  );
});

test("Foundry Toolbox parameters are inline on each operation for the live converter", () => {
  const original = JSON.stringify(openApi);
  const spec = createToolboxOpenApiSpec(openApi, "https://api.example.test");

  assert.deepEqual(spec.paths["/v1/chains"].get.parameters, [
    openApi.components.parameters.Limit,
    openApi.components.parameters.Cursor,
  ]);
  for (const path of ["/v1/chains/{chainId}", "/v1/chains/{chainId}/bundle"]) {
    assert.equal(spec.paths[path].parameters, undefined);
    assert.deepEqual(spec.paths[path].get.parameters, [
      { in: "path", name: "chainId", required: true, schema: { minLength: 1, type: "string" } },
    ]);
  }
  assert.deepEqual(spec.paths["/v1/chains/{chainId}"].put.parameters[1], openApi.components.parameters.IfNoneMatch);
  assert.equal(JSON.stringify(openApi), original);

  const overridden = JSON.parse(JSON.stringify(openApi));
  overridden.paths["/v1/chains/{chainId}"].get.parameters = [
    { in: "path", name: "chainId", required: true, schema: { minLength: 2, type: "string" } },
  ];
  const overrideSpec = createToolboxOpenApiSpec(overridden, "https://api.example.test");
  assert.equal(overrideSpec.paths["/v1/chains/{chainId}"].get.parameters.length, 1);
  assert.equal(overrideSpec.paths["/v1/chains/{chainId}"].get.parameters[0].schema.minLength, 2);
});

test("Foundry Toolbox save input exposes chain step fields without changing API validation", () => {
  const original = JSON.stringify(openApi);
  const spec = createToolboxOpenApiSpec(openApi, "https://api.example.test");
  const requestSchema = spec.paths["/v1/chains/{chainId}"].put
    .requestBody.content["application/json"].schema;
  const stepSchema = requestSchema.properties.steps.items;

  assert.equal(stepSchema.type, "object");
  assert.deepEqual(stepSchema.required, ["id", "instruction"]);
  assert.deepEqual(
    Object.keys(stepSchema.properties).sort(),
    ["id", "instruction", "kind", "label", "skillBinding", "skillName"].sort(),
  );
  assert.deepEqual(stepSchema.properties.kind.enum, ["skill", "instruction"]);
  assert.deepEqual(stepSchema.oneOf, [
    {
      required: ["skillName"],
      properties: { kind: { const: "skill" } },
    },
    {
      required: ["kind"],
      properties: { kind: { const: "instruction" } },
      not: { required: ["skillName"] },
    },
  ]);
  for (const step of [
    { id: "skill-step", instruction: "Review the change", skillName: "review" },
    {
      id: "skill-step",
      instruction: "Review the change",
      kind: "skill",
      skillName: "review",
    },
    {
      id: "instruction-step",
      instruction: "Summarize the result",
      kind: "instruction",
    },
  ]) {
    assert.equal(ChainStepSchema.safeParse(step).success, true);
  }
  for (const step of [
    { id: "instruction-step", instruction: "Summarize the result" },
    {
      id: "instruction-step",
      instruction: "Summarize the result",
      kind: "instruction",
      skillName: "review",
    },
    { id: "skill-step", instruction: "Review the change", kind: "skill" },
  ]) {
    assert.equal(ChainStepSchema.safeParse(step).success, false);
  }
  assert.match(stepSchema.description, /The API validates these rules/);
  assert.deepEqual(spec.components.schemas.ChainStep, openApi.components.schemas.ChainStep);
  assert.equal(JSON.stringify(openApi), original);
});

test("Foundry Toolbox rejects unresolved and cyclic parameter references", () => {
  const document = JSON.parse(JSON.stringify(openApi));
  document.paths["/v1/chains"].get.parameters = [{ $ref: "#/components/parameters/Missing" }];
  assert.throws(() => createToolboxOpenApiSpec(document, "https://api.example.test"), /parameter reference/);

  document.components.parameters.Cyclic = { $ref: "#/components/parameters/Cyclic" };
  document.paths["/v1/chains"].get.parameters = [{ $ref: "#/components/parameters/Cyclic" }];
  assert.throws(() => createToolboxOpenApiSpec(document, "https://api.example.test"), /cyclic parameter reference/);
});

test("skill operations expose reviewed snapshots and portable content limits", () => {
  const file = openApi.components.schemas.BundleFile;
  assert.equal(file.properties.content.contentEncoding, "base64");
  assert.match(file.properties.path.description, /portable relative path/i);
  assert.match(
    openApi.components.schemas.SkillSubmission.properties.files.description,
    /20 MiB/,
  );
  assert.equal(
    openApi.paths["/v1/chains/{chainId}/bundle"].get.responses["422"].$ref,
    "#/components/responses/InvalidDocument",
  );
});

test("OpenAPI chain input format stays aligned with the internal schema", () => {
  const chain = openApi.components.schemas.Chain;
  assert.equal(chain.properties.version.const, CHAIN_VERSION);
  assert.equal(
    openApi.components.schemas.ChainInput.properties.name.pattern,
    CHAIN_INPUT_NAME_PATTERN.source,
  );
  assert.deepEqual(openApi.components.schemas.ChainBundle.oneOf.map(({ $ref }) => $ref), [
    "#/components/schemas/ChainBundleV1",
    "#/components/schemas/ChainBundleV2",
  ]);
});

test("OpenAPI contract has no unresolved local references", () => {
  for (const reference of findReferences(openApi)) {
    resolvePointer(openApi, reference);
  }

  const visit = (value) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (value && typeof value === "object") {
      if (typeof value.pattern === "string") {
        assert.doesNotThrow(() => new RegExp(value.pattern));
      }
      Object.values(value).forEach(visit);
    }
  };
  visit(openApi);
});
