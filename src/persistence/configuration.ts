import type {
  AzuriteBlobConfiguration,
  ManagedIdentityBlobConfiguration,
} from "./blob.js";

export type BlobPersistenceConfiguration =
  | ({ mode: "managed-identity" } & ManagedIdentityBlobConfiguration)
  | ({ mode: "azurite" } & AzuriteBlobConfiguration);

type Environment = Readonly<Record<string, string | undefined>>;

function requiredValue(environment: Environment, name: string) {
  const value = environment[name]?.trim();
  if (!value) {
    throw new TypeError(`${name} must be configured.`);
  }
  return value;
}

export function parseBlobPersistenceConfiguration(
  environment: Environment,
): BlobPersistenceConfiguration {
  const configuredMode = environment.BLOB_STORAGE_MODE;
  const mode = configuredMode === undefined ? "managed-identity" : configuredMode.trim();

  if (mode === "managed-identity") {
    if (
      environment.AZURITE_BLOB_ENDPOINT
      || environment.AZURITE_ACCOUNT_NAME
      || environment.AZURITE_ACCOUNT_KEY
    ) {
      throw new TypeError("Azurite settings cannot be used with managed-identity storage.");
    }
    return {
      mode,
      endpoint: requiredValue(environment, "BLOB_ENDPOINT"),
      clientId: requiredValue(environment, "MANAGED_IDENTITY_CLIENT_ID"),
    };
  }

  if (mode === "azurite") {
    if (environment.BLOB_ENDPOINT || environment.MANAGED_IDENTITY_CLIENT_ID) {
      throw new TypeError("Managed identity settings cannot be used with Azurite storage.");
    }
    return {
      mode,
      endpoint: requiredValue(environment, "AZURITE_BLOB_ENDPOINT"),
      accountName: requiredValue(environment, "AZURITE_ACCOUNT_NAME"),
      accountKey: requiredValue(environment, "AZURITE_ACCOUNT_KEY"),
    };
  }

  throw new TypeError("BLOB_STORAGE_MODE must be managed-identity or azurite.");
}
