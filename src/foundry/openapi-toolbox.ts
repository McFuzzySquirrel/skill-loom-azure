import { URL } from "node:url";

import { APP_ROLES } from "../auth/entra.js";

const HTTP_METHODS = new Set([
  "delete",
  "get",
  "head",
  "options",
  "patch",
  "post",
  "put",
  "trace",
]);

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireRecord(value: unknown, name: string): JsonRecord {
  if (!isRecord(value)) {
    throw new TypeError(`${name} must be an object.`);
  }
  return value;
}

function apiOrigin(apiBaseUrl: string) {
  if (typeof apiBaseUrl !== "string" || apiBaseUrl.trim().length === 0) {
    throw new TypeError("API base URL must be an HTTPS origin.");
  }

  let url: URL;
  try {
    url = new URL(apiBaseUrl.trim());
  } catch {
    throw new TypeError("API base URL must be an HTTPS origin.");
  }

  if (
    url.protocol !== "https:"
    || url.username.length > 0
    || url.password.length > 0
    || url.pathname !== "/"
    || url.search.length > 0
    || url.hash.length > 0
  ) {
    throw new TypeError("API base URL must be an HTTPS origin without credentials or a path.");
  }

  return url.origin;
}

function inlineParameters(document: JsonRecord, value: unknown): JsonRecord[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new TypeError("OpenAPI parameters must be an array.");
  }
  return value.map((entry) => {
    let parameter = requireRecord(entry, "OpenAPI parameter");
    const visited = new Set<string>();
    while (parameter.$ref !== undefined) {
      const reference = parameter.$ref;
      if (typeof reference !== "string" || !reference.startsWith("#/components/parameters/")) {
        throw new TypeError("Unsupported OpenAPI parameter reference.");
      }
      if (visited.has(reference)) {
        throw new TypeError("OpenAPI has a cyclic parameter reference.");
      }
      visited.add(reference);
      let target: unknown = document;
      for (const segment of reference.slice(2).split("/")) {
        const key = segment.replace(/~1/g, "/").replace(/~0/g, "~");
        if (!isRecord(target) || !Object.hasOwn(target, key)) {
          throw new TypeError(`Unresolved OpenAPI parameter reference ${reference}.`);
        }
        target = target[key];
      }
      parameter = requireRecord(target, "OpenAPI parameter reference");
    }
    if (typeof parameter.name !== "string" || typeof parameter.in !== "string") {
      throw new TypeError("OpenAPI parameters must declare name and in.");
    }
    return parameter;
  });
}

function toolboxChainStepSchema(): JsonRecord {
  return {
    type: "object",
    description: "For skill steps, include skillName and optionally set kind to skill. For instruction steps, set kind to instruction and omit skillName. The API validates these rules.",
    additionalProperties: false,
    required: ["id", "instruction"],
    properties: {
      id: { type: "string", minLength: 1 },
      instruction: { type: "string", minLength: 1 },
      label: { type: "string", minLength: 1 },
      kind: {
        type: "string",
        enum: ["skill", "instruction"],
      },
      skillName: { type: "string", minLength: 1 },
      skillBinding: { $ref: "#/components/schemas/SkillSnapshotBinding" },
    },
    oneOf: [
      {
        required: ["skillName"],
        properties: { kind: { const: "skill" } },
      },
      {
        required: ["kind"],
        properties: { kind: { const: "instruction" } },
        not: { required: ["skillName"] },
      },
    ],
  };
}

function toolboxSaveChainOperation(document: JsonRecord, operation: JsonRecord): JsonRecord {
  const requestBody = requireRecord(operation.requestBody, "saveChain request body");
  const content = requireRecord(requestBody.content, "saveChain request content");
  const jsonContent = requireRecord(content["application/json"], "saveChain JSON request content");
  const schema = requireRecord(jsonContent.schema, "saveChain request schema");
  if (schema.$ref !== "#/components/schemas/Chain") {
    throw new TypeError("saveChain must reference the Chain request schema.");
  }

  const components = requireRecord(document.components, "OpenAPI components");
  const schemas = requireRecord(components.schemas, "OpenAPI schemas");
  const chainSchema = requireRecord(schemas.Chain, "Chain schema");
  const chainProperties = requireRecord(chainSchema.properties, "Chain properties");
  const stepsSchema = requireRecord(chainProperties.steps, "Chain steps schema");
  const stepReference = requireRecord(stepsSchema.items, "Chain step items");
  if (stepReference.$ref !== "#/components/schemas/ChainStep") {
    throw new TypeError("Chain steps must reference the ChainStep schema.");
  }

  return {
    ...operation,
    requestBody: {
      ...requestBody,
      content: {
        ...content,
        "application/json": {
          ...jsonContent,
          schema: {
            ...chainSchema,
            properties: {
              ...chainProperties,
              steps: {
                ...stepsSchema,
                items: toolboxChainStepSchema(),
              },
            },
          },
        },
      },
    },
  };
}

export function createToolboxOpenApiSpec(
  openApiDocument: unknown,
  apiBaseUrl: string,
): JsonRecord {
  const document = requireRecord(openApiDocument, "OpenAPI document");
  if (typeof document.openapi !== "string" || !/^3\.[01]\.\d+$/.test(document.openapi)) {
    throw new TypeError("OpenAPI document must use version 3.0 or 3.1.");
  }

  const sourcePaths = requireRecord(document.paths, "OpenAPI paths");
  const paths: JsonRecord = {};
  const operationIds = new Set<string>();
  let includedOperationCount = 0;

  for (const [path, pathItemValue] of Object.entries(sourcePaths)) {
    const pathItem = requireRecord(pathItemValue, `OpenAPI path ${path}`);
    const toolboxPathItem: JsonRecord = {};
    let includedPathOperationCount = 0;

    for (const [key, value] of Object.entries(pathItem)) {
      if (!HTTP_METHODS.has(key)) {
        if (key !== "parameters") {
          toolboxPathItem[key] = value;
        }
        continue;
      }

      const operation = requireRecord(value, `OpenAPI operation ${key.toUpperCase()} ${path}`);
      const roles = operation["x-required-app-roles"];
      if (!Array.isArray(roles) || roles.length === 0 || !roles.every((role) => typeof role === "string")) {
        throw new TypeError(`OpenAPI operation ${key.toUpperCase()} ${path} must declare app roles.`);
      }
      if (!roles.includes(APP_ROLES.user)) {
        continue;
      }

      const operationId = operation.operationId;
      if (typeof operationId !== "string" || !/^[A-Za-z_-]+$/.test(operationId)) {
        throw new TypeError(`OpenAPI operation ${key.toUpperCase()} ${path} has an unsupported operationId.`);
      }
      if (operationIds.has(operationId)) {
        throw new TypeError(`OpenAPI operationId ${operationId} must be unique.`);
      }

      const parameters = new Map<string, JsonRecord>();
      for (const parameter of [
        ...inlineParameters(document, pathItem.parameters),
        ...inlineParameters(document, operation.parameters),
      ]) {
        parameters.set(JSON.stringify([parameter.in, parameter.name]), parameter);
      }
      operationIds.add(operationId);
      const toolboxOperation = operationId === "saveChain"
        ? toolboxSaveChainOperation(document, operation)
        : operation;
      toolboxPathItem[key] = {
        ...toolboxOperation,
        ...(parameters.size > 0 ? { parameters: [...parameters.values()] } : {}),
      };
      includedPathOperationCount += 1;
      includedOperationCount += 1;
    }

    if (includedPathOperationCount > 0) {
      paths[path] = toolboxPathItem;
    }
  }

  if (includedOperationCount === 0) {
    throw new TypeError("OpenAPI document has no operations available to SkillLoom.User.");
  }

  return {
    ...document,
    servers: [{ url: apiOrigin(apiBaseUrl) }],
    paths,
  };
}
