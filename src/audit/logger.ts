import { createHash } from "node:crypto";

import type { AuthenticatedPrincipal, ApiOperationId } from "../auth/entra.js";

export type AuditRole = "SkillLoom.User" | "SkillLoom.Admin";
export type AuditMethod = "GET" | "PUT" | "POST" | "OTHER";

export interface ApiAuditEvent {
  schemaVersion: 1;
  event: "api.request";
  requestId: string;
  timestamp: string;
  operationId?: ApiOperationId;
  method: AuditMethod;
  statusCode: number;
  outcome: "success" | "failure";
  durationMs: number;
  actorHash?: string;
  actorRole?: AuditRole;
  errorCode?: string;
}

export interface ApiAuditLogger {
  write(event: ApiAuditEvent): void;
}

export function auditActor(principal: AuthenticatedPrincipal) {
  const actorHash = createHash("sha256")
    .update(principal.tenantId)
    .update("\0")
    .update(principal.subject)
    .digest("hex");
  const actorRole = principal.roles.includes("SkillLoom.Admin")
    ? "SkillLoom.Admin"
    : "SkillLoom.User";
  return { actorHash, actorRole } as const;
}

export function createApiAuditLogger(
  writeLine: (line: string) => void = (line) => {
    process.stdout.write(`${line}\n`);
  },
): ApiAuditLogger {
  return {
    write(event) {
      writeLine(JSON.stringify(event));
    },
  };
}
