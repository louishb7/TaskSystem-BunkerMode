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

    CONSTRAINT "series_recorrencia_pkey" PRIMARY KEY ("recurrence_series_id"),
    CONSTRAINT "series_recorrencia_prioridade_check" CHECK ("prioridade" BETWEEN 1 AND 3),
    CONSTRAINT "series_recorrencia_weekdays_check" CHECK (
        cardinality("recurrence_weekdays") > 0
        AND "recurrence_weekdays" <@ ARRAY[0,1,2,3,4,5,6]::INTEGER[]
    ),
    CONSTRAINT "series_recorrencia_termination_policy_check" CHECK (
        "termination_policy" IN ('sem_termino', 'ate_data', 'ate_objetivo')
    ),
    CONSTRAINT "series_recorrencia_termination_fields_check" CHECK (
        ("termination_policy" = 'ate_data' AND "end_date" IS NOT NULL)
        OR ("termination_policy" IN ('sem_termino', 'ate_objetivo') AND "end_date" IS NULL)
    ),
    CONSTRAINT "series_recorrencia_end_date_check" CHECK (
        "end_date" IS NULL OR "end_date" >= "start_date"
    )
);

-- AlterTable
ALTER TABLE "missoes" ADD COLUMN "recurrence_series_id" INTEGER;

ALTER TABLE "missoes" ADD CONSTRAINT "missoes_recurrence_series_date_check" CHECK (
    "recurrence_series_id" IS NULL OR "prazo" IS NOT NULL
);

-- CreateIndex
CREATE INDEX "series_recorrencia_responsavel_id_ativo_idx" ON "series_recorrencia"("responsavel_id", "ativo");

-- CreateIndex
CREATE INDEX "series_recorrencia_objetivo_id_idx" ON "series_recorrencia"("objetivo_id");

-- CreateIndex
CREATE UNIQUE INDEX "missoes_recurrence_series_id_prazo_key" ON "missoes"("recurrence_series_id", "prazo");

-- AddForeignKey
ALTER TABLE "series_recorrencia" ADD CONSTRAINT "series_recorrencia_responsavel_id_fkey" FOREIGN KEY ("responsavel_id") REFERENCES "usuarios"("usuario_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_recorrencia" ADD CONSTRAINT "series_recorrencia_objetivo_id_fkey" FOREIGN KEY ("objetivo_id") REFERENCES "objetivos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "missoes" ADD CONSTRAINT "missoes_recurrence_series_id_fkey" FOREIGN KEY ("recurrence_series_id") REFERENCES "series_recorrencia"("recurrence_series_id") ON DELETE SET NULL ON UPDATE CASCADE;
