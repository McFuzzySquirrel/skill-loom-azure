import process from "node:process";
import { spawnSync } from "node:child_process";

function requiredEnvironmentValue(name) {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new TypeError(`${name} must be provided by the active azd environment.`);
  }
  return value.trim();
}

const resourceGroup = requiredEnvironmentValue("AZURE_RESOURCE_GROUP");
const containerApp = requiredEnvironmentValue("AZURE_CONTAINER_APP_NAME");
const result = spawnSync(
  "az",
  [
    "containerapp",
    "ingress",
    "enable",
    "--name",
    containerApp,
    "--resource-group",
    resourceGroup,
    "--type",
    "external",
    "--target-port",
    "3000",
    "--transport",
    "auto",
    "--only-show-errors",
  ],
  { stdio: "inherit" },
);

if (result.error) {
  throw result.error;
}
if (result.status !== 0) {
  throw new Error(`Enabling HTTPS Container Apps ingress failed with exit code ${result.status}.`);
}
