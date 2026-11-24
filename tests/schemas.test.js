import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFileSync } from "node:fs";
import test from "node:test";
import { URL } from "node:url";

import { ChainSchema } from "../src/schemas/chain.ts";
import {
  BundleFileSchema,
  BundleSkillDirectorySchema,
  BundleSkillFilesSchema,
  ChainBundleSchema,
  MAX_BUNDLE_BYTES,
} from "../src/schemas/bundle.ts";
import { MAX_SERIALIZED_OBJECT_BYTES } from "../src/schemas/serialized-object.ts";

const fixtureDirectory = new URL(
  "./fixtures/skill-loom/a608c2853a83a017b46b24383bc5d81b4d22f1a9/",
  import.meta.url,
);
const exampleDirectory = new URL("../examples/chains/", import.meta.url);

function readFixture(name) {
  return JSON.parse(readFileSync(new URL(name, fixtureDirectory), "utf8"));
}

function readExample(name) {
  return JSON.parse(readFileSync(new URL(name, exampleDirectory), "utf8"));
}

function assertRoundTrips(schema, fixture) {
  const parsed = schema.parse(fixture);
  const reExported = JSON.parse(JSON.stringify(parsed));
  assert.deepEqual(reExported, fixture);
  assert.deepEqual(schema.parse(reExported), parsed);
}

for (const name of [
  "feature-planning.json",
  "bug-investigation.json",
  "change-review.json",
]) {
  test(`example chain ${name} round-trips through the v3 schema`, () => {
    assertRoundTrips(ChainSchema, readExample(name));
  });
}

test("pinned Skill Loom chain fixture round-trips without format drift", () => {
  assertRoundTrips(ChainSchema, readFixture("chain-v3.json"));
});

for (const version of [1, 2]) {
  test(`pinned Skill Loom bundle v${version} fixture round-trips without format drift`, () => {
    assertRoundTrips(ChainBundleSchema, readFixture(`bundle-v${version}.json`));
  });
}

test("chain and bundle schemas reject unsupported versions", () => {
  assert.equal(ChainSchema.safeParse({ ...readFixture("chain-v3.json"), version: 4 }).success, false);
  assert.equal(ChainBundleSchema.safeParse({ ...readFixture("bundle-v1.json"), version: 3 }).success, false);
});

test("bundle files require portable relative paths and canonical base64 content", () => {
  const validFile = {
    path: "nested/SKILL.md",
    content: Buffer.from("reviewed skill").toString("base64"),
    executable: false,
  };
  assert.equal(BundleFileSchema.safeParse(validFile).success, true);

  for (const path of [
    "../outside.md",
    "/absolute.md",
    "nested/../../outside.md",
    "C:/outside.md",
    "nested\\outside.md",
    "nested//empty.md",
    "CON.txt",
    "trailing.",
  ]) {
    assert.equal(BundleFileSchema.safeParse({ ...validFile, path }).success, false, path);
  }
  assert.equal(BundleFileSchema.safeParse({ ...validFile, content: "AB==" }).success, false);
  assert.equal(BundleSkillDirectorySchema.safeParse("..").success, false);
  assert.equal(BundleSkillDirectorySchema.safeParse("nested/skill").success, false);
});

test("skill file sets reject path collisions and enforce decoded content limits", () => {
  const file = (path, content = "") => ({ path, content, executable: false });
  assert.equal(BundleSkillFilesSchema.safeParse([
    file("Readme.md"),
    file("readme.md"),
  ]).success, false);
  assert.equal(BundleSkillFilesSchema.safeParse([
    file("config"),
    file("config-"),
    file("config/settings.json"),
  ]).success, false);

  const exactLimit = Buffer.alloc(MAX_BUNDLE_BYTES, 0x61).toString("base64");
  assert.equal(BundleSkillFilesSchema.safeParse([file("large.bin", exactLimit)]).success, true);
  assert.equal(BundleSkillFilesSchema.safeParse([
    file("large.bin", exactLimit),
    file("extra.bin", Buffer.from("x").toString("base64")),
  ]).success, false);

  const tooManyFiles = Array.from({ length: 2_001 }, (_, index) => file(`file-${index}.txt`));
  assert.equal(BundleSkillFilesSchema.safeParse(tooManyFiles).success, false);
});

test("chain schema accepts the serialized-object byte limit and rejects overflow", () => {
  const chain = ChainSchema.parse(readFixture("chain-v3.json"));
  chain.steps[0].instruction = "";

  const fixedBytes = Buffer.byteLength(JSON.stringify(chain), "utf8");
  chain.steps[0].instruction = "x".repeat(MAX_SERIALIZED_OBJECT_BYTES - fixedBytes);
  assert.equal(Buffer.byteLength(JSON.stringify(chain), "utf8"), MAX_SERIALIZED_OBJECT_BYTES);
  assert.equal(ChainSchema.safeParse(chain).success, true);

  chain.steps[0].instruction += "x";
  const result = ChainSchema.safeParse(chain);
  assert.equal(result.success, false);
  assert.match(result.error.issues[0].message, /exceeds 33554432 bytes/);
});

test("serialized-object limit counts UTF-8 bytes and JSON escapes", () => {
  const chain = ChainSchema.parse(readFixture("chain-v3.json"));
  chain.steps[0].instruction = "";

  const fixedBytes = Buffer.byteLength(JSON.stringify(chain), "utf8");
  const characterCount = Math.floor((MAX_SERIALIZED_OBJECT_BYTES - fixedBytes) / 2) + 1;
  chain.steps[0].instruction = "é".repeat(characterCount);
  assert.ok(Buffer.byteLength(JSON.stringify(chain), "utf8") > MAX_SERIALIZED_OBJECT_BYTES);
  assert.equal(ChainSchema.safeParse(chain).success, false);

  const controlCharacterCount = Math.ceil((MAX_SERIALIZED_OBJECT_BYTES - fixedBytes) / 6);
  chain.steps[0].instruction = "\u0000".repeat(controlCharacterCount);
  assert.ok(Buffer.byteLength(JSON.stringify(chain), "utf8") > MAX_SERIALIZED_OBJECT_BYTES);
  assert.equal(ChainSchema.safeParse(chain).success, false);
});
