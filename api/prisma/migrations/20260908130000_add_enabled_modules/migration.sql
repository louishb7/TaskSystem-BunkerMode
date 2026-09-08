ALTER TABLE "usuarios"
ADD COLUMN "enabled_modules" TEXT[] NOT NULL DEFAULT ARRAY['tasks', 'objectives']::TEXT[];
