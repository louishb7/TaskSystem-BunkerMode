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
    "recurrence_weekdays" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
    "recurrence_end_date" DATE,
    "duration_type" VARCHAR(20),
    "recurrence_key" VARCHAR(320),
    "criada_por_id" INTEGER NOT NULL,
    "responsavel_id" INTEGER NOT NULL,
    "objetivo_id" INTEGER,
    "sonho_id" INTEGER,

    CONSTRAINT "missoes_pkey" PRIMARY KEY ("missao_id"),
    CONSTRAINT "missoes_prioridade_check" CHECK ("prioridade" BETWEEN 1 AND 3),
    CONSTRAINT "missoes_status_check" CHECK ("status" IN ('PENDENTE', 'CONCLUIDA', 'FALHA')),
    CONSTRAINT "missoes_resultado_check" CHECK (
        ("status" = 'PENDENTE' AND "completed_at" IS NULL AND "failed_at" IS NULL)
        OR ("status" = 'CONCLUIDA' AND "completed_at" IS NOT NULL AND "failed_at" IS NULL)
        OR ("status" = 'FALHA' AND "failed_at" IS NOT NULL AND "completed_at" IS NULL)
    ),
    CONSTRAINT "missoes_duration_type_check" CHECK ("duration_type" IS NULL OR "duration_type" IN ('pontual', 'ate_objetivo', 'prazo')),
    CONSTRAINT "missoes_recurrence_weekdays_check" CHECK (
        "recurrence_weekdays" <@ ARRAY[0,1,2,3,4,5,6]::INTEGER[]
    )
);

-- CreateTable
CREATE TABLE "objetivos" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "sonho_id" INTEGER,
    "titulo" VARCHAR(200) NOT NULL,
    "descricao" TEXT,
    "data_alvo" DATE,
    "progresso" INTEGER NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ativo',
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "concluded_at" TIMESTAMP(6),
    "order_index" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "objetivos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "objetivos_progresso_check" CHECK ("progresso" BETWEEN 0 AND 100),
    CONSTRAINT "objetivos_status_check" CHECK ("status" IN ('ativo', 'concluido', 'pausado', 'abandonado')),
    CONSTRAINT "objetivos_concluded_at_check" CHECK (
        ("status" = 'concluido' AND "concluded_at" IS NOT NULL)
        OR ("status" <> 'concluido' AND "concluded_at" IS NULL)
    )
);

-- CreateTable
CREATE TABLE "revisoes_semanais" (
    "revisao_id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "reviewed_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resumo_operacional" TEXT NOT NULL,
    "completed_missions" INTEGER NOT NULL DEFAULT 0,
    "pending_missions" INTEGER NOT NULL DEFAULT 0,
    "failed_missions" INTEGER NOT NULL DEFAULT 0,
    "high_priority_missions" INTEGER NOT NULL DEFAULT 0,
    "observacao" TEXT,

    CONSTRAINT "revisoes_semanais_pkey" PRIMARY KEY ("revisao_id"),
    CONSTRAINT "revisoes_semanais_periodo_check" CHECK ("end_date" >= "start_date")
);

-- CreateTable
CREATE TABLE "sonhos" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "titulo" VARCHAR(200) NOT NULL,
    "descricao" TEXT,
    "tipo" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ativo',
    "justificativa_arquivamento" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL,
    "archived_at" TIMESTAMP(6),
    "concluded_at" TIMESTAMP(6),

    CONSTRAINT "sonhos_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "sonhos_tipo_check" CHECK ("tipo" IN ('principal', 'secundario')),
    CONSTRAINT "sonhos_status_check" CHECK ("status" IN ('ativo', 'arquivado', 'concluido')),
    CONSTRAINT "sonhos_archived_at_check" CHECK (
        ("status" = 'arquivado' AND "archived_at" IS NOT NULL)
        OR ("status" <> 'arquivado')
    )
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

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("usuario_id"),
    CONSTRAINT "usuarios_active_mode_check" CHECK ("active_mode" IN ('general', 'soldier'))
);

-- CreateIndex
CREATE INDEX "auditoria_eventos_missao_id_idx" ON "auditoria_eventos"("missao_id");

-- CreateIndex
CREATE INDEX "auditoria_eventos_usuario_id_idx" ON "auditoria_eventos"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "missoes_recurrence_key_key" ON "missoes"("recurrence_key");

-- CreateIndex
CREATE INDEX "missoes_responsavel_id_status_prazo_idx" ON "missoes"("responsavel_id", "status", "prazo");

-- CreateIndex
CREATE INDEX "missoes_objetivo_id_idx" ON "missoes"("objetivo_id");

-- CreateIndex
CREATE INDEX "missoes_sonho_id_idx" ON "missoes"("sonho_id");

-- CreateIndex
CREATE INDEX "objetivos_usuario_id_status_idx" ON "objetivos"("usuario_id", "status");

-- CreateIndex
CREATE INDEX "objetivos_sonho_id_idx" ON "objetivos"("sonho_id");

-- CreateIndex
CREATE UNIQUE INDEX "revisoes_semanais_usuario_id_start_date_end_date_key" ON "revisoes_semanais"("usuario_id", "start_date", "end_date");

-- CreateIndex
CREATE INDEX "sonhos_usuario_id_status_idx" ON "sonhos"("usuario_id", "status");

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
ALTER TABLE "missoes" ADD CONSTRAINT "missoes_sonho_id_fkey" FOREIGN KEY ("sonho_id") REFERENCES "sonhos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objetivos" ADD CONSTRAINT "objetivos_sonho_id_fkey" FOREIGN KEY ("sonho_id") REFERENCES "sonhos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objetivos" ADD CONSTRAINT "objetivos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("usuario_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "revisoes_semanais" ADD CONSTRAINT "revisoes_semanais_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("usuario_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sonhos" ADD CONSTRAINT "sonhos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("usuario_id") ON DELETE CASCADE ON UPDATE CASCADE;
