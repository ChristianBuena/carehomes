-- SOW 3E.5: general audit log. Additive only (new table, new function, new triggers).
-- The table is append-only: the triggers below reject UPDATE, DELETE and
-- TRUNCATE for every role, including the application role. Only a database
-- owner who first runs ALTER TABLE ... DISABLE TRIGGER can remove rows; that is
-- an operator action outside the app (see docs/MIGRATION_RUNBOOK.md).

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actorId" TEXT,
    "actorRole" "Role",
    "action" TEXT NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");


-- Append-only enforcement
CREATE OR REPLACE FUNCTION "audit_log_reject_change"() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only: % is not allowed', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "audit_log_no_update_delete"
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION "audit_log_reject_change"();

CREATE TRIGGER "audit_log_no_truncate"
  BEFORE TRUNCATE ON "AuditLog"
  FOR EACH STATEMENT EXECUTE FUNCTION "audit_log_reject_change"();
