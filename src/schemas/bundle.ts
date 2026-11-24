import { Buffer } from "node:buffer";

import { z } from "zod";

import {
  ChainAgentSelectionSchema,
  ChainInputSchema,
  ChainSessionModeSchema,
  ChainStepSchema,
  HarnessIdSchema,
} from "./chain.js";
import { withSerializedObjectLimit } from "./serialized-object.js";

export const MAX_BUNDLE_BYTES = 20 * 1024 * 1024;
export const MAX_BUNDLE_FILES = 2_000;
export const MAX_BUNDLE_SKILLS = 100;
const MAX_BUNDLE_CONTENT_LENGTH = Math.ceil(MAX_BUNDLE_BYTES / 3) * 4;
const BASE64_ALPHABET_PATTERN = /^[A-Za-z0-9+/]*$/;
const INVALID_PORTABLE_FILENAME_CHARACTER = /[<>:"|?*]/;
const WINDOWS_DEVICE_NAME = /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i;

function containsControlCharacter(value: string) {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint !== undefined && (codePoint < 0x20 || codePoint === 0x7f);
  });
}

function isSafePathSegment(segment: string) {
  return segment.length > 0
    && segment !== "."
    && segment !== ".."
    && !segment.endsWith(".")
    && !segment.endsWith(" ")
    && !segment.includes("/")
    && !segment.includes("\\")
    && !INVALID_PORTABLE_FILENAME_CHARACTER.test(segment)
    && !containsControlCharacter(segment)
    && !WINDOWS_DEVICE_NAME.test(segment);
}

function isCanonicalBase64(content: string) {
  if (
    content.length > MAX_BUNDLE_CONTENT_LENGTH
    || content.length % 4 !== 0
  ) {
    return false;
  }
  const padding = content.endsWith("==") ? 2 : content.endsWith("=") ? 1 : 0;
  const body = padding === 0 ? content : content.slice(0, -padding);
  if (
    !BASE64_ALPHABET_PATTERN.test(body)
    || (padding === 1 && body.length % 4 !== 3)
    || (padding === 2 && body.length % 4 !== 2)
  ) {
    return false;
  }
  return Buffer.from(content, "base64").toString("base64") === content;
}

function decodedBase64ByteLength(content: string) {
  const padding = content.endsWith("==") ? 2 : content.endsWith("=") ? 1 : 0;
  return (content.length / 4) * 3 - padding;
}

export function isSafeRelativeFilePath(path: string) {
  return path.length > 0
    && path.length <= 512
    && !path.startsWith("/")
    && !path.includes("\\")
    && path.split("/").every(isSafePathSegment);
}

export const BundleSkillDirectorySchema = z.string()
  .min(1)
  .max(128)
  .refine(isSafePathSegment, "Directory must be a safe portable path component.");

const Base64FileContentSchema = z.string()
  .max(MAX_BUNDLE_CONTENT_LENGTH)
  .refine(isCanonicalBase64, "File content must be canonical base64.")
  .refine(
    (content) => decodedBase64ByteLength(content) <= MAX_BUNDLE_BYTES,
    `Decoded file content must not exceed ${MAX_BUNDLE_BYTES} bytes.`,
  );

export const BundleFileSchema = z.strictObject({
  path: z.string()
    .min(1)
    .max(512)
    .refine(isSafeRelativeFilePath, "File path must be a safe portable relative path."),
  content: Base64FileContentSchema,
  executable: z.boolean(),
});

export const BundleSkillFilesSchema = z.array(BundleFileSchema)
  .min(1)
  .max(MAX_BUNDLE_FILES)
  .superRefine((files, context) => {
    const normalizedPaths = files.map((file) => file.path.normalize("NFC").toLowerCase().normalize("NFC"));
    const uniquePaths = new Set(normalizedPaths);
    if (uniquePaths.size !== normalizedPaths.length) {
      context.addIssue({
        code: "custom",
        message: "Skill file paths must be unique without regard to case.",
      });
    }

    for (const path of uniquePaths) {
      const segments = path.split("/");
      let parent = "";
      for (const segment of segments.slice(0, -1)) {
        parent = parent.length === 0 ? segment : `${parent}/${segment}`;
        if (uniquePaths.has(parent)) {
          context.addIssue({
            code: "custom",
            message: "A skill file path cannot also be a parent directory.",
          });
          break;
        }
      }
    }

    const totalBytes = files.reduce((total, file) => (
      total + decodedBase64ByteLength(file.content)
    ), 0);
    if (totalBytes > MAX_BUNDLE_BYTES) {
      context.addIssue({
        code: "custom",
        message: `Decoded skill files must not exceed ${MAX_BUNDLE_BYTES} bytes in total.`,
      });
    }
  });

export const BundleSkillSchema = z.strictObject({
  name: z.string().trim().min(1).max(128),
  directory: BundleSkillDirectorySchema,
  files: BundleSkillFilesSchema,
});

export const BundleNativeAgentSchema = z.strictObject({
  name: z.string().trim().min(1).max(128),
  harness: HarnessIdSchema,
  agentPath: z.string().min(1).max(512).refine(isSafeRelativeFilePath),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  content: Base64FileContentSchema,
});

const BundleChainFields = {
  name: z.string().trim().min(1),
  harness: HarnessIdSchema,
  sessionMode: ChainSessionModeSchema,
  steps: z.array(ChainStepSchema).min(1),
  inputs: z.array(ChainInputSchema),
};

export const ChainBundleV1Schema = withSerializedObjectLimit(z.strictObject({
  format: z.literal("skill-loom-chain"),
  version: z.literal(1),
  chain: z.strictObject(BundleChainFields),
  skills: z.array(BundleSkillSchema).max(MAX_BUNDLE_SKILLS),
}));

export const ChainBundleV2Schema = withSerializedObjectLimit(z.strictObject({
  format: z.literal("skill-loom-chain"),
  version: z.literal(2),
  chain: z.strictObject({
    ...BundleChainFields,
    agent: ChainAgentSelectionSchema.optional(),
  }),
  skills: z.array(BundleSkillSchema).max(MAX_BUNDLE_SKILLS),
  agents: z.array(BundleNativeAgentSchema).max(1),
}));

export const ChainBundleSchema = z.discriminatedUnion("version", [
  ChainBundleV1Schema,
  ChainBundleV2Schema,
]);

export type ChainBundle = z.infer<typeof ChainBundleSchema>;
export type BundleFile = z.infer<typeof BundleFileSchema>;
export type BundleSkill = z.infer<typeof BundleSkillSchema>;
