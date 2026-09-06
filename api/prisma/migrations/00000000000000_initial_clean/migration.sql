-- Baseline V2 para banco novo. Não aplicar sobre a baseline anterior.
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "auditoria_eventos" (
    "evento_id" SERIAL NOT NULL,
    "missao_id" INTEGER,
    "usuario_id" INTEGER,
    "acao" VARCHAR(80) NOT NULL,
    "detalhes" TEXT NOT NULL,
    "criado_em" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_eventos_pkey" PRIMARY KEY ("evento_id")
);

-- CreateTable
CREATE TABLE "missoes" (
    "missao_id" SERIAL NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "prioridade" INTEGER NOT NULL DEFAULT 2,
    "prazo" DATE,
    "instrucao" VARCHAR(280),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "completed_at" TIMESTAMP(6),
    "failed_at" TIMESTAMP(6),
    "recurrence_series_id" INTEGER,
    "criada_por_id" INTEGER NOT NULL,
    "responsavel_id" INTEGER NOT NULL,
    "objetivo_id" INTEGER,

    CONSTRAINT "missoes_pkey" PRIMARY KEY ("missao_id")
);

-- CreateTable
CREATE TABLE "series_recorrencia" (
    "recurrence_series_id" SERIAL NOT NULL,
    "responsavel_id" INTEGER NOT NULL,
    "objetivo_id" INTEGER,
    "titulo" VARCHAR(200) NOT NULL,
    "instrucao" VARCHAR(280),
    "prioridade" INTEGER NOT NULL DEFAULT 2,
    "recurrence_weekdays" INTEGER[] NOT NULL,
    "start_date" DATE NOT NULL,
    "termination_policy" VARCHAR(20) NOT NULL DEFAULT 'sem_termino',
    "end_date" DATE,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "series_recorrencia_pkey" PRIMARY KEY ("recurrence_series_id")
);

-- CreateTable
CREATE TABLE "objetivos" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "descricao" TEXT,
    "data_alvo" DATE,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ativo',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "concluded_at" TIMESTAMP(6),
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "objetivos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "usuario_id" SERIAL NOT NULL,
    "usuario" VARCHAR(80) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "nome_general" TEXT,
    "active_mode" VARCHAR(20) NOT NULL DEFAULT 'general',
    "timezone" VARCHAR(80) NOT NULL DEFAULT 'America/Recife',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("usuario_id")
);

-- CreateIndex
CREATE INDEX "auditoria_eventos_missao_id_idx" ON "auditoria_eventos"("missao_id");

-- CreateIndex
CREATE INDEX "auditoria_eventos_usuario_id_idx" ON "auditoria_eventos"("usuario_id");

-- CreateIndex
CREATE INDEX "missoes_responsavel_id_status_prazo_idx" ON "missoes"("responsavel_id", "status", "prazo");

-- CreateIndex
CREATE INDEX "missoes_objetivo_id_idx" ON "missoes"("objetivo_id");

-- CreateIndex
CREATE UNIQUE INDEX "missoes_recurrence_series_id_prazo_key" ON "missoes"("recurrence_series_id", "prazo");

-- CreateIndex
CREATE INDEX "series_recorrencia_responsavel_id_ativo_idx" ON "series_recorrencia"("responsavel_id", "ativo");

-- CreateIndex
CREATE INDEX "series_recorrencia_objetivo_id_idx" ON "series_recorrencia"("objetivo_id");

-- CreateIndex
CREATE INDEX "objetivos_usuario_id_status_idx" ON "objetivos"("usuario_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_usuario_key" ON "usuarios"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- AddForeignKey
ALTER TABLE "auditoria_eventos" ADD CONSTRAINT "auditoria_eventos_missao_id_fkey" FOREIGN KEY ("missao_id") REFERENCES "missoes"("missao_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria_eventos" ADD CONSTRAINT "auditoria_eventos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("usuario_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missoes" ADD CONSTRAINT "missoes_criada_por_id_fkey" FOREIGN KEY ("criada_por_id") REFERENCES "usuarios"("usuario_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missoes" ADD CONSTRAINT "missoes_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuarios"("usuario_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missoes" ADD CONSTRAINT "missoes_objetivo_id_fkey" FOREIGN KEY ("objetivo_id") REFERENCES "objetivos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missoes" ADD CONSTRAINT "missoes_recurrence_series_id_fkey" FOREIGN KEY ("recurrence_series_id") REFERENCES "series_recorrencia"("recurrence_series_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_recorrencia" ADD CONSTRAINT "series_recorrencia_objetivo_id_fkey" FOREIGN KEY ("objetivo_id") REFERENCES "objetivos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_recorrencia" ADD CONSTRAINT "series_recorrencia_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuarios"("usuario_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objetivos" ADD CONSTRAINT "objetivos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("usuario_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Garantias de domínio não representadas por CHECK no schema Prisma.
ALTER TABLE "missoes" ADD CONSTRAINT "missoes_prioridade_check" CHECK ("prioridade" BETWEEN 1 AND 3);

ALTER TABLE "missoes" ADD CONSTRAINT "missoes_status_check" CHECK ("status" IN ('PENDENTE', 'CONCLUIDA', 'FALHA'));

ALTER TABLE "missoes" ADD CONSTRAINT "missoes_resultado_check" CHECK (
        ("status" = 'PENDENTE' AND "completed_at" IS NULL AND "failed_at" IS NULL)
        OR ("status" = 'CONCLUIDA' AND "completed_at" IS NOT NULL AND "failed_at" IS NULL)
        OR ("status" = 'FALHA' AND "failed_at" IS NOT NULL AND "completed_at" IS NULL)
    );

ALTER TABLE "objetivos" ADD CONSTRAINT "objetivos_status_check" CHECK ("status" IN ('ativo', 'concluido', 'pausado', 'abandonado'));

ALTER TABLE "objetivos" ADD CONSTRAINT "objetivos_concluded_at_check" CHECK (
        ("status" = 'concluido' AND "concluded_at" IS NOT NULL)
        OR ("status" <> 'concluido' AND "concluded_at" IS NULL)
    );

ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_active_mode_check" CHECK ("active_mode" IN ('general', 'soldier'));

ALTER TABLE "series_recorrencia" ADD CONSTRAINT "series_recorrencia_prioridade_check" CHECK ("prioridade" BETWEEN 1 AND 3);

ALTER TABLE "series_recorrencia" ADD CONSTRAINT "series_recorrencia_weekdays_check" CHECK (
        cardinality("recurrence_weekdays") > 0
        AND "recurrence_weekdays" <@ ARRAY[0,1,2,3,4,5,6]::INTEGER[]
    );

ALTER TABLE "series_recorrencia" ADD CONSTRAINT "series_recorrencia_termination_policy_check" CHECK (
        "termination_policy" IN ('sem_termino', 'ate_data', 'ate_objetivo')
    );

ALTER TABLE "series_recorrencia" ADD CONSTRAINT "series_recorrencia_termination_fields_check" CHECK (
        ("termination_policy" = 'ate_data' AND "end_date" IS NOT NULL)
        OR ("termination_policy" IN ('sem_termino', 'ate_objetivo') AND "end_date" IS NULL)
    );

ALTER TABLE "series_recorrencia" ADD CONSTRAINT "series_recorrencia_end_date_check" CHECK (
        "end_date" IS NULL OR "end_date" >= "start_date"
    );

ALTER TABLE "missoes" ADD CONSTRAINT "missoes_recurrence_series_date_check" CHECK (
    "recurrence_series_id" IS NULL OR "prazo" IS NOT NULL
);
