import {
  createAzuriteBlobPersistence,
  createManagedIdentityBlobPersistence,
} from "./persistence/blob.js";
import { parseBlobPersistenceConfiguration } from "./persistence/configuration.js";
import { createEntraTokenVerifier } from "./auth/entra.js";
import { createApiAuditLogger } from "./audit/logger.js";
import { createApiServer } from "./api/server.js";
import { SkillCatalogService } from "./skills/catalog.js";

function requiredEnvironmentValue(name: string) {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new TypeError(`${name} must be configured.`);
  }
  return value.trim();
}

function configuredPort(value: string | undefined) {
  if (value === undefined) {
    return 3_000;
  }
  if (!/^[1-9]\d{0,4}$/.test(value)) {
    throw new TypeError("PORT must be an integer from 1 to 65535.");
  }
  const port = Number(value);
  if (!Number.isSafeInteger(port) || port > 65_535) {
    throw new TypeError("PORT must be an integer from 1 to 65535.");
  }
  return port;
}

const tokenVersion = requiredEnvironmentValue("ENTRA_TOKEN_VERSION");
if (tokenVersion !== "1.0" && tokenVersion !== "2.0") {
  throw new TypeError("ENTRA_TOKEN_VERSION must be 1.0 or 2.0.");
}

const persistenceConfiguration = parseBlobPersistenceConfiguration(process.env);
const persistence = persistenceConfiguration.mode === "azurite"
  ? await createAzuriteBlobPersistence(persistenceConfiguration)
  : createManagedIdentityBlobPersistence(persistenceConfiguration);
const server = createApiServer({
  verifyToken: createEntraTokenVerifier({
    tenantId: requiredEnvironmentValue("ENTRA_TENANT_ID"),
    audience: requiredEnvironmentValue("ENTRA_AUDIENCE"),
    tokenVersion,
  }),
  chains: persistence,
  catalog: new SkillCatalogService(persistence, persistence),
  auditLogger: createApiAuditLogger(),
});
const port = configuredPort(process.env.PORT);

server.on("error", (error: NodeJS.ErrnoException) => {
  const code = error.code && /^[A-Z0-9_]+$/.test(error.code) ? error.code : "UNKNOWN";
  process.stderr.write(`${JSON.stringify({ event: "server.error", code })}\n`);
  process.exitCode = 1;
});

server.listen(port, "0.0.0.0");

let shuttingDown = false;
const shutdown = () => {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  server.close((error) => {
    if (error) {
      process.stderr.write(`${JSON.stringify({ event: "server.shutdown", outcome: "failure" })}\n`);
      process.exitCode = 1;
    }
  });
};

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
