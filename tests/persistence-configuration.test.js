import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import test from "node:test";

import { parseBlobPersistenceConfiguration } from "../src/persistence/configuration.ts";
import { createAzuriteBlobPersistence } from "../src/persistence/blob.ts";

test("managed identity remains the default storage mode", () => {
  assert.deepEqual(
    parseBlobPersistenceConfiguration({
      BLOB_ENDPOINT: "https://storage.example.test/",
      MANAGED_IDENTITY_CLIENT_ID: " managed-identity-id ",
    }),
    {
      mode: "managed-identity",
      endpoint: "https://storage.example.test/",
      clientId: "managed-identity-id",
    },
  );
});

test("Azurite requires its explicit local-only configuration", () => {
  assert.deepEqual(
    parseBlobPersistenceConfiguration({
      BLOB_STORAGE_MODE: "azurite",
      AZURITE_BLOB_ENDPOINT: "http://azurite:10000/skillloomdev",
      AZURITE_ACCOUNT_NAME: "skillloomdev",
      AZURITE_ACCOUNT_KEY: "local-key",
    }),
    {
      mode: "azurite",
      endpoint: "http://azurite:10000/skillloomdev",
      accountName: "skillloomdev",
      accountKey: "local-key",
    },
  );
});

test("unknown and mixed storage configurations fail explicitly", () => {
  assert.throws(
    () => parseBlobPersistenceConfiguration({ BLOB_STORAGE_MODE: "other" }),
    /BLOB_STORAGE_MODE must be managed-identity or azurite/,
  );
  assert.throws(
    () => parseBlobPersistenceConfiguration({ BLOB_STORAGE_MODE: " " }),
    /BLOB_STORAGE_MODE must be managed-identity or azurite/,
  );
  assert.throws(
    () => parseBlobPersistenceConfiguration({
      BLOB_STORAGE_MODE: "azurite",
      BLOB_ENDPOINT: "https://storage.example.test/",
    }),
    /Managed identity settings cannot be used with Azurite/,
  );
  assert.throws(
    () => parseBlobPersistenceConfiguration({
      BLOB_STORAGE_MODE: "managed-identity",
      AZURITE_ACCOUNT_KEY: "local-key",
    }),
    /Azurite settings cannot be used with managed-identity/,
  );
});

test("Azurite persistence rejects endpoints outside the local emulator", async () => {
  await assert.rejects(
    createAzuriteBlobPersistence({
      endpoint: "https://storage.example.test/skillloomdev",
      accountName: "skillloomdev",
      accountKey: Buffer.alloc(64).toString("base64"),
    }),
    /Azurite endpoint must target the local emulator on port 10000/,
  );
});
