ALTER TABLE "usuarios"
DROP CONSTRAINT IF EXISTS "usuarios_active_mode_check";

ALTER TABLE "usuarios"
DROP COLUMN IF EXISTS "active_mode",
DROP COLUMN IF EXISTS "nome_general";
