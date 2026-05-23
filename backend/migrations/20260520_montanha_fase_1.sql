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

ALTER TABLE missoes
ADD COLUMN IF NOT EXISTS objetivo_id INTEGER REFERENCES objetivos(id) ON DELETE SET NULL;
