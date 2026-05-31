CREATE TABLE IF NOT EXISTS sonhos (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(usuario_id) ON DELETE CASCADE,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('principal', 'secundario')),
    status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'arquivado', 'concluido')),
    justificativa_arquivamento TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TIMESTAMP,
    concluded_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS objetivos (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(usuario_id) ON DELETE CASCADE,
    sonho_id INTEGER REFERENCES sonhos(id) ON DELETE SET NULL,
    titulo VARCHAR(200) NOT NULL,
    descricao TEXT,
    data_alvo DATE,
    progresso INTEGER NOT NULL DEFAULT 0 CHECK (progresso >= 0 AND progresso <= 100),
    status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'concluido', 'pausado', 'abandonado')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    concluded_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS missoes (
    missao_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    titulo TEXT NOT NULL,
    prioridade INTEGER NOT NULL,
    prazo DATE,
    instrucao TEXT,
    status TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    failed_at TIMESTAMP,
    failure_reason_type TEXT,
    failure_reason TEXT,
    soldier_excuse TEXT,
    general_verdict TEXT,
    recurrence_weekdays TEXT,
    recurrence_end_date DATE,
    duration_type TEXT
);

ALTER TABLE missoes
ADD COLUMN IF NOT EXISTS objetivo_id INTEGER REFERENCES objetivos(id) ON DELETE SET NULL;

ALTER TABLE missoes
ADD COLUMN IF NOT EXISTS sonho_id INTEGER REFERENCES sonhos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_missao_contextos_responsavel_id
ON missao_contextos (responsavel_id)
WHERE responsavel_id IS NOT NULL;
