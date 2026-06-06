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

ALTER TABLE IF EXISTS usuarios
ADD COLUMN IF NOT EXISTS nome_general TEXT NULL;

ALTER TABLE IF EXISTS usuarios
ADD COLUMN IF NOT EXISTS active_mode TEXT NOT NULL DEFAULT 'general';

ALTER TABLE IF EXISTS usuarios
ADD COLUMN IF NOT EXISTS planning_window TEXT NOT NULL DEFAULT 'night';

ALTER TABLE IF EXISTS usuarios
ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Recife';

ALTER TABLE IF EXISTS usuarios
ADD COLUMN IF NOT EXISTS emergency_unlock_date DATE NULL;

ALTER TABLE IF EXISTS usuarios
ADD COLUMN IF NOT EXISTS timezone_updated_at TIMESTAMPTZ NULL;

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

ALTER TABLE IF EXISTS missoes
ALTER COLUMN instrucao DROP NOT NULL;

ALTER TABLE IF EXISTS missoes
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS missoes
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE IF EXISTS missoes
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL;

ALTER TABLE IF EXISTS missoes
ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP NULL;

ALTER TABLE IF EXISTS missoes
ADD COLUMN IF NOT EXISTS failure_reason_type TEXT NULL;

ALTER TABLE IF EXISTS missoes
ADD COLUMN IF NOT EXISTS failure_reason TEXT NULL;

ALTER TABLE IF EXISTS missoes
ADD COLUMN IF NOT EXISTS soldier_excuse TEXT NULL;

ALTER TABLE IF EXISTS missoes
ADD COLUMN IF NOT EXISTS general_verdict TEXT NULL;

ALTER TABLE missoes
ADD COLUMN IF NOT EXISTS objetivo_id INTEGER REFERENCES objetivos(id) ON DELETE SET NULL;

ALTER TABLE missoes
ADD COLUMN IF NOT EXISTS sonho_id INTEGER REFERENCES sonhos(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS missoes
ADD COLUMN IF NOT EXISTS recurrence_weekdays TEXT NULL;

ALTER TABLE IF EXISTS missoes
ADD COLUMN IF NOT EXISTS recurrence_end_date DATE NULL;

ALTER TABLE IF EXISTS missoes
ADD COLUMN IF NOT EXISTS duration_type TEXT NULL;

CREATE TABLE IF NOT EXISTS operacoes (
    operacao_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(usuario_id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    weekdays TEXT NOT NULL,
    ordem_titulo TEXT NOT NULL,
    ordem_instrucao TEXT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'ativa',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS operacoes
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS missao_contextos (
    missao_id INTEGER PRIMARY KEY REFERENCES missoes(missao_id) ON DELETE CASCADE,
    criada_por_id INTEGER NULL REFERENCES usuarios(usuario_id) ON DELETE SET NULL,
    responsavel_id INTEGER NULL REFERENCES usuarios(usuario_id) ON DELETE SET NULL
);

ALTER TABLE IF EXISTS missao_contextos
ADD COLUMN IF NOT EXISTS operacao_id INTEGER NULL REFERENCES operacoes(operacao_id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS missao_contextos
ADD COLUMN IF NOT EXISTS operacao_dia DATE NULL;

CREATE INDEX IF NOT EXISTS idx_missao_contextos_responsavel_id
ON missao_contextos (responsavel_id)
WHERE responsavel_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_missao_contextos_operacao_dia
ON missao_contextos (operacao_id, operacao_dia)
WHERE operacao_id IS NOT NULL AND operacao_dia IS NOT NULL;

CREATE TABLE IF NOT EXISTS auditoria_eventos (
    evento_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    missao_id INTEGER NULL,
    usuario_id INTEGER NULL REFERENCES usuarios(usuario_id) ON DELETE SET NULL,
    acao TEXT NOT NULL,
    detalhes TEXT NOT NULL,
    criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS revisoes_semanais (
    revisao_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(usuario_id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reviewed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resumo_operacional TEXT NOT NULL,
    completed_missions INTEGER NOT NULL DEFAULT 0,
    pending_missions INTEGER NOT NULL DEFAULT 0,
    failed_missions INTEGER NOT NULL DEFAULT 0,
    high_priority_missions INTEGER NOT NULL DEFAULT 0,
    observacao TEXT NULL,
    UNIQUE (usuario_id, start_date, end_date)
);

ALTER TABLE IF EXISTS revisoes_semanais
ADD COLUMN IF NOT EXISTS high_priority_missions INTEGER NOT NULL DEFAULT 0;
