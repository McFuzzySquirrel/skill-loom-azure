import { z } from "zod";

import { withSerializedObjectLimit } from "./serialized-object.js";

export const CHAIN_VERSION = 3;
export const CHAIN_INPUT_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]*$/;

export const HarnessIdSchema = z.enum(["opencode", "copilot"]);
export const ChainSessionModeSchema = z.enum(["shared", "fresh", "fork"]);

const NonEmptyStringSchema = z.string().trim().min(1);
const TimestampSchema = z.iso.datetime({ offset: true });

export const ChainAgentSelectionSchema = z.strictObject({
  harness: HarnessIdSchema,
  name: NonEmptyStringSchema,
  sourceId: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/),
  revision: z.string().regex(/^[a-f0-9]{40,64}$/),
  repositoryPath: NonEmptyStringSchema.max(4_096),
  agentPath: NonEmptyStringSchema.max(4_096),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
});

export const SkillSnapshotBindingSchema = z.strictObject({
  sourceId: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/),
  revision: z.string().regex(/^[a-f0-9]{40,64}$/),
  repositoryPath: NonEmptyStringSchema.max(4_096),
});

const StepContent = {
  id: NonEmptyStringSchema,
  instruction: NonEmptyStringSchema,
  label: NonEmptyStringSchema.optional(),
};

export const ChainStepSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    ...StepContent,
    kind: z.literal("skill").optional(),
    skillName: NonEmptyStringSchema,
    skillBinding: SkillSnapshotBindingSchema.optional(),
  }),
  z.strictObject({
    ...StepContent,
    kind: z.literal("instruction"),
    skillName: z.never().optional(),
  }),
]);

export const ChainInputSchema = z.strictObject({
  name: z.string().regex(CHAIN_INPUT_NAME_PATTERN),
  label: NonEmptyStringSchema.optional(),
  required: z.boolean().default(false),
  defaultValue: z.string().optional(),
});

const ChainFields = {
  id: NonEmptyStringSchema,
  name: NonEmptyStringSchema,
  harness: HarnessIdSchema,
  sessionMode: ChainSessionModeSchema,
  steps: z.array(ChainStepSchema).min(1),
  inputs: z.array(ChainInputSchema).default([]),
  automaticPermissionOptIn: z.boolean().default(false),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
};

export const ChainSchema = withSerializedObjectLimit(z.strictObject({
  version: z.literal(CHAIN_VERSION),
  ...ChainFields,
  agent: ChainAgentSelectionSchema.optional(),
}));

export type Chain = z.infer<typeof ChainSchema>;
export type ChainStep = z.infer<typeof ChainStepSchema>;
export type ChainInput = z.infer<typeof ChainInputSchema>;
