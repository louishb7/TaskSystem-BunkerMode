-- Preserve task identity, deadline and audit history; overdue state is now derived.
ALTER TABLE "missoes" DROP CONSTRAINT "missoes_resultado_check";
UPDATE "missoes" SET "status" = 'PENDENTE', "completed_at" = NULL WHERE "status" = 'FALHA';
ALTER TABLE "missoes" DROP CONSTRAINT "missoes_status_check";
ALTER TABLE "missoes" DROP COLUMN "failed_at";
ALTER TABLE "missoes" ADD CONSTRAINT "missoes_status_check" CHECK ("status" IN ('PENDENTE', 'CONCLUIDA'));
ALTER TABLE "missoes" ADD CONSTRAINT "missoes_resultado_check" CHECK (
  ("status" = 'PENDENTE' AND "completed_at" IS NULL) OR
  ("status" = 'CONCLUIDA' AND "completed_at" IS NOT NULL)
);
