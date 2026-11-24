import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import process from "node:process";

const localEnvironment = [
  `AZURITE_ACCOUNT_KEY=${randomBytes(64).toString("base64")}`,
  "ENTRA_TENANT_ID=",
  "ENTRA_AUDIENCE=",
  "ENTRA_TOKEN_VERSION=2.0",
  "",
].join("\n");

try {
  writeFileSync(".env.local", localEnvironment, { flag: "wx", mode: 0o600 });
} catch (error) {
  if (error && typeof error === "object" && "code" in error && error.code === "EEXIST") {
    throw new Error(".env.local already exists; it was not overwritten.", { cause: error });
  }
  throw error;
}

process.stdout.write("Created .env.local with a local-only Azurite key. Set the Entra values before starting the API.\n");
