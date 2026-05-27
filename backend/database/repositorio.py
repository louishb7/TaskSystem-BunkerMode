try:
    import psycopg
except ModuleNotFoundError:  # pragma: no cover
    psycopg = None

import json
import os
import threading
import time

from backend.models.auditoria import EventoAuditoria
from backend.models.missao import Missao
from backend.models.objetivo import Objetivo
from backend.models.operacao import Operacao
from backend.models.revisao import RevisaoSemanal
from backend.models.sonho import Sonho
from backend.models.usuario import Usuario


class ErroRepositorio(ValueError):
    """Erro base para falhas de persistência do repositório."""


class DriverPostgresNaoInstaladoError(ErroRepositorio):
    """Erro levantado quando o driver do PostgreSQL não está disponível."""


class ConexaoRepositorioError(ErroRepositorio):
    """Erro levantado quando não é possível abrir conexão com o banco."""


class LeituraRepositorioError(ErroRepositorio):
    """Erro levantado quando a leitura de dados falha."""


class EscritaRepositorioError(ErroRepositorio):
    """Erro levantado quando uma operação de escrita falha."""


class MissaoNaoPersistidaError(ErroRepositorio):
    """Erro levantado quando a missão esperada não existe no banco."""


class UsuarioNaoPersistidoError(ErroRepositorio):
    """Erro levantado quando o usuário esperado não existe no banco."""


class _ConexaoRepositorio:
    def __init__(self, conexao, lock=None, on_exit=None):
        self.conexao = conexao
        self.lock = lock
        self.on_exit = on_exit

    def __enter__(self):
        if self.lock is not None:
            self.lock.acquire()
        return self.conexao

    def __exit__(self, exc_type, exc, tb):
        try:
            if exc_type is not None and hasattr(self.conexao, "rollback"):
                self.conexao.rollback()
            if self.on_exit is not None:
                self.on_exit()
        finally:
            if self.lock is not None:
                self.lock.release()
        return False


class RepositorioPostgres:
    """Responsável por carregar e persistir dados do BunkerMode no PostgreSQL."""

    _schemas_inicializados = set()
    _shared_connections = {}
    _shared_lock = threading.RLock()

    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self._conexao = None

    def __del__(self):  # pragma: no cover - fallback defensivo
        self.fechar()

    def _conectar(self):
        if psycopg is None:
            raise DriverPostgresNaoInstaladoError(
                "Driver psycopg não está instalado no ambiente atual."
            )
        if self._deve_reutilizar_conexao_compartilhada():
            return self._conectar_compartilhado()
        if self._conexao is not None and not getattr(self._conexao, "closed", False):
            return _ConexaoRepositorio(self._conexao)
        try:
            self._conexao = psycopg.connect(self.connection_string)
            return _ConexaoRepositorio(self._conexao)
        except psycopg.Error as erro:
            raise ConexaoRepositorioError(
                "Não foi possível conectar ao banco de dados."
            ) from erro

    def _deve_reutilizar_conexao_compartilhada(self) -> bool:
        valor = os.getenv("BUNKERMODE_REUSE_DB_CONNECTIONS", "").strip().lower()
        if valor in {"1", "true", "yes", "on"}:
            return True
        if valor in {"0", "false", "no", "off"}:
            return False

        ambiente = (
            os.getenv("BUNKERMODE_ENV")
            or os.getenv("ENV")
            or os.getenv("PYTHON_ENV")
            or ""
        ).strip().lower()
        return ambiente in {"production", "prod"}

    def _shared_idle_timeout_seconds(self) -> float:
        valor = os.getenv("BUNKERMODE_DB_CONNECTION_IDLE_TTL_SECONDS", "").strip()
        if not valor:
            return 120.0
        try:
            return max(1.0, float(valor))
        except ValueError:
            return 120.0

    def _conectar_compartilhado(self):
        agora = time.monotonic()
        ttl = self._shared_idle_timeout_seconds()
        chave = (self.connection_string, threading.get_ident())
        with self._shared_lock:
            for chave_existente, entrada_existente in list(self._shared_connections.items()):
                conexao_existente = entrada_existente["connection"]
                expirada = agora - entrada_existente["last_used"] > ttl
                fechada = getattr(conexao_existente, "closed", False)
                em_uso = entrada_existente.get("in_use", False)
                if fechada or (expirada and not em_uso):
                    if not fechada and hasattr(conexao_existente, "close"):
                        conexao_existente.close()
                    self._shared_connections.pop(chave_existente, None)

            entrada = self._shared_connections.get(chave)
            conexao = None if entrada is None else entrada["connection"]
            fechada = conexao is not None and getattr(conexao, "closed", False)
            if conexao is not None and fechada:
                if not fechada and hasattr(conexao, "close"):
                    conexao.close()
                self._shared_connections.pop(chave, None)
                conexao = None

            if conexao is None:
                try:
                    conexao = psycopg.connect(self.connection_string)
                except psycopg.Error as erro:
                    raise ConexaoRepositorioError(
                        "Não foi possível conectar ao banco de dados."
                    ) from erro
                entrada = {"connection": conexao, "last_used": agora}
                self._shared_connections[chave] = entrada
            entrada["in_use"] = True

            def mark_used():
                with self._shared_lock:
                    if chave in self._shared_connections:
                        self._shared_connections[chave][
                            "last_used"
                        ] = time.monotonic()
                        self._shared_connections[chave]["in_use"] = False

            return _ConexaoRepositorio(
                conexao,
                on_exit=mark_used,
            )

    def fechar(self) -> None:
        if self._deve_reutilizar_conexao_compartilhada():
            return
        if self._conexao is None:
            return
        if not getattr(self._conexao, "closed", False) and hasattr(self._conexao, "close"):
            self._conexao.close()
        self._conexao = None

    @classmethod
    def fechar_conexoes_compartilhadas(cls) -> None:
        with cls._shared_lock:
            for entrada in cls._shared_connections.values():
                conexao = entrada["connection"]
                if not getattr(conexao, "closed", False) and hasattr(conexao, "close"):
                    conexao.close()
            cls._shared_connections.clear()

    def _deve_inicializar_schema(self) -> bool:
        auto_init = os.getenv("BUNKERMODE_AUTO_SCHEMA_INIT", "").strip().lower()
        if auto_init in {"1", "true", "yes", "on"}:
            return True
        if auto_init in {"0", "false", "no", "off"}:
            return False

        ambiente = (
            os.getenv("BUNKERMODE_ENV")
            or os.getenv("ENV")
            or os.getenv("PYTHON_ENV")
            or ""
        ).strip().lower()
        return ambiente not in {"production", "prod"}

    def inicializar_schema(self) -> None:
        if not self._deve_inicializar_schema():
            return
        if self.connection_string in self._schemas_inicializados:
            return

        comandos = [
            """
            CREATE TABLE IF NOT EXISTS usuarios (
                usuario_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                usuario TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                senha_hash TEXT NOT NULL,
                ativo BOOLEAN NOT NULL DEFAULT TRUE,
                nome_general TEXT NULL,
                active_mode TEXT NOT NULL DEFAULT 'general',
                planning_window TEXT NOT NULL DEFAULT 'night',
                timezone TEXT NOT NULL DEFAULT 'America/Recife',
                emergency_unlock_date DATE NULL,
                timezone_updated_at TIMESTAMPTZ NULL
            );
            """,
            """
            ALTER TABLE IF EXISTS usuarios
            ADD COLUMN IF NOT EXISTS nome_general TEXT NULL;
            """,
            """
            ALTER TABLE IF EXISTS usuarios
            ADD COLUMN IF NOT EXISTS active_mode TEXT NOT NULL DEFAULT 'general';
            """,
            """
            ALTER TABLE IF EXISTS usuarios
            ADD COLUMN IF NOT EXISTS planning_window TEXT NOT NULL DEFAULT 'night';
            """,
            """
            ALTER TABLE IF EXISTS usuarios
            ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Recife';
            """,
            """
            ALTER TABLE IF EXISTS usuarios
            ADD COLUMN IF NOT EXISTS emergency_unlock_date DATE NULL;
            """,
            """
            ALTER TABLE IF EXISTS usuarios
            ADD COLUMN IF NOT EXISTS timezone_updated_at TIMESTAMPTZ NULL;
            """,
            """
            ALTER TABLE IF EXISTS missoes
            ALTER COLUMN instrucao DROP NOT NULL;
            """,
            """
            ALTER TABLE IF EXISTS missoes
            ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;
            """,
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'missoes' AND column_name = 'is_decided'
                ) THEN
                    UPDATE missoes
                    SET is_pinned = TRUE
                    WHERE is_decided = TRUE;
                END IF;
            END $$;
            """,
            """
            ALTER TABLE IF EXISTS missoes
            DROP COLUMN IF EXISTS is_decided;
            """,
            """
            ALTER TABLE IF EXISTS missoes
            ADD COLUMN IF NOT EXISTS failed_at TIMESTAMP NULL;
            """,
            """
            ALTER TABLE IF EXISTS missoes
            ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
            """,
            """
            ALTER TABLE IF EXISTS missoes
            ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL;
            """,
            """
            ALTER TABLE IF EXISTS missoes
            ADD COLUMN IF NOT EXISTS failure_reason TEXT NULL;
            """,
            """
            ALTER TABLE IF EXISTS missoes
            ADD COLUMN IF NOT EXISTS failure_reason_type TEXT NULL;
            """,
            """
            ALTER TABLE IF EXISTS missoes
            ADD COLUMN IF NOT EXISTS soldier_excuse TEXT NULL;
            """,
            """
            UPDATE missoes
            SET failure_reason = soldier_excuse
            WHERE failure_reason IS NULL AND soldier_excuse IS NOT NULL;
            """,
            """
            ALTER TABLE IF EXISTS missoes
            ADD COLUMN IF NOT EXISTS general_verdict TEXT NULL;
            """,
            """
            CREATE TABLE IF NOT EXISTS sonhos (
                id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                usuario_id INTEGER NOT NULL REFERENCES usuarios(usuario_id) ON DELETE CASCADE,
                titulo VARCHAR(200) NOT NULL,
                descricao TEXT NULL,
                tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('principal', 'secundario')),
                status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'arquivado', 'concluido')),
                justificativa_arquivamento TEXT NULL,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                archived_at TIMESTAMP NULL,
                concluded_at TIMESTAMP NULL
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS objetivos (
                id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                usuario_id INTEGER NOT NULL REFERENCES usuarios(usuario_id) ON DELETE CASCADE,
                sonho_id INTEGER NULL REFERENCES sonhos(id) ON DELETE SET NULL,
                titulo VARCHAR(200) NOT NULL,
                descricao TEXT NULL,
                data_alvo DATE NULL,
                progresso INTEGER NOT NULL DEFAULT 0 CHECK (progresso >= 0 AND progresso <= 100),
                status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'concluido', 'pausado', 'abandonado')),
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                concluded_at TIMESTAMP NULL
            );
            """,
            """
            ALTER TABLE IF EXISTS missoes
            ADD COLUMN IF NOT EXISTS objetivo_id INTEGER NULL REFERENCES objetivos(id) ON DELETE SET NULL;
            """,
            """
            ALTER TABLE IF EXISTS missoes
            ADD COLUMN IF NOT EXISTS recurrence_weekdays TEXT NULL;
            """,
            """
            ALTER TABLE IF EXISTS missoes
            ADD COLUMN IF NOT EXISTS recurrence_end_date DATE NULL;
            """,
            """
            ALTER TABLE IF EXISTS missoes
            ADD COLUMN IF NOT EXISTS duration_type TEXT NULL;
            """,
            """
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
            """,
            """
            ALTER TABLE IF EXISTS operacoes
            ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;
            """,
            """
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'operacoes' AND column_name = 'is_decided'
                ) THEN
                    UPDATE operacoes
                    SET is_pinned = TRUE
                    WHERE is_decided = TRUE;
                END IF;
            END $$;
            """,
            """
            ALTER TABLE IF EXISTS operacoes
            DROP COLUMN IF EXISTS is_decided;
            """,
            """
            DROP TABLE IF EXISTS operational_day_overrides;
            """,
            """
            CREATE TABLE IF NOT EXISTS missao_contextos (
                missao_id INTEGER PRIMARY KEY,
                criada_por_id INTEGER NULL REFERENCES usuarios(usuario_id) ON DELETE SET NULL,
                responsavel_id INTEGER NULL REFERENCES usuarios(usuario_id) ON DELETE SET NULL
            );
            """,
            """
            ALTER TABLE IF EXISTS missao_contextos
            ADD COLUMN IF NOT EXISTS operacao_id INTEGER NULL REFERENCES operacoes(operacao_id) ON DELETE SET NULL;
            """,
            """
            ALTER TABLE IF EXISTS missao_contextos
            ADD COLUMN IF NOT EXISTS operacao_dia DATE NULL;
            """,
            """
            CREATE UNIQUE INDEX IF NOT EXISTS idx_missao_contextos_operacao_dia
            ON missao_contextos (operacao_id, operacao_dia)
            WHERE operacao_id IS NOT NULL AND operacao_dia IS NOT NULL;
            """,
            """
            CREATE TABLE IF NOT EXISTS auditoria_eventos (
                evento_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                missao_id INTEGER NULL,
                usuario_id INTEGER NULL REFERENCES usuarios(usuario_id) ON DELETE SET NULL,
                acao TEXT NOT NULL,
                detalhes TEXT NOT NULL,
                criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
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
            """,
            """
            ALTER TABLE IF EXISTS revisoes_semanais
            ADD COLUMN IF NOT EXISTS high_priority_missions INTEGER NOT NULL DEFAULT 0;
            """,
            """
            ALTER TABLE IF EXISTS revisoes_semanais
            DROP COLUMN IF EXISTS committed_missions_failed;
            """,
        ]
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    for comando in comandos:
                        cursor.execute(comando)
                conexao.commit()
            self._schemas_inicializados.add(self.connection_string)
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError(
                "Erro ao inicializar o schema complementar do banco de dados."
            ) from erro

    def _reconstruir_missao(self, linha: tuple) -> Missao:
        is_pinned = False
        recurrence_weekdays = None
        recurrence_end_date = None
        duration_type = None
        if len(linha) == 7:
            (
                missao_id,
                titulo,
                prioridade,
                prazo,
                instrucao,
                status,
                legacy_priority_marker,
            ) = linha
            is_pinned = bool(legacy_priority_marker)
            created_at = None
            completed_at = None
            failed_at = None
            failure_reason_type = None
            failure_reason = None
            soldier_excuse = None
            general_verdict = None
            operacao_id = None
            operacao_nome = None
            objetivo_id = None
        elif len(linha) == 6:
            (
                missao_id,
                titulo,
                prioridade,
                prazo,
                instrucao,
                status,
            ) = linha
            created_at = None
            completed_at = None
            failed_at = None
            failure_reason_type = None
            failure_reason = None
            soldier_excuse = None
            general_verdict = None
            operacao_id = None
            operacao_nome = None
            objetivo_id = None
        elif len(linha) == 10:
            (
                missao_id,
                titulo,
                prioridade,
                prazo,
                instrucao,
                status,
                legacy_priority_marker,
                failed_at,
                soldier_excuse,
                general_verdict,
            ) = linha
            is_pinned = bool(legacy_priority_marker)
            created_at = None
            completed_at = None
            failure_reason_type = None
            failure_reason = soldier_excuse
            operacao_id = None
            operacao_nome = None
            objetivo_id = None
        elif len(linha) == 9:
            (
                missao_id,
                titulo,
                prioridade,
                prazo,
                instrucao,
                status,
                failed_at,
                soldier_excuse,
                general_verdict,
            ) = linha
            created_at = None
            completed_at = None
            failure_reason_type = None
            failure_reason = soldier_excuse
            operacao_id = None
            operacao_nome = None
            objetivo_id = None
        elif len(linha) == 13:
            (
                missao_id,
                titulo,
                prioridade,
                prazo,
                instrucao,
                status,
                legacy_priority_marker,
                created_at,
                completed_at,
                failed_at,
                failure_reason,
                soldier_excuse,
                general_verdict,
            ) = linha
            is_pinned = bool(legacy_priority_marker)
            failure_reason_type = None
            operacao_id = None
            operacao_nome = None
            objetivo_id = None
        elif len(linha) == 12:
            (
                missao_id,
                titulo,
                prioridade,
                prazo,
                instrucao,
                status,
                created_at,
                completed_at,
                failed_at,
                failure_reason,
                soldier_excuse,
                general_verdict,
            ) = linha
            failure_reason_type = None
            operacao_id = None
            operacao_nome = None
            objetivo_id = None
        elif len(linha) == 15:
            (
                missao_id,
                titulo,
                prioridade,
                prazo,
                instrucao,
                status,
                created_at,
                completed_at,
                failed_at,
                failure_reason_type,
                failure_reason,
                soldier_excuse,
                general_verdict,
                operacao_id,
                operacao_nome,
            ) = linha
            objetivo_id = None
        elif len(linha) == 17:
            if isinstance(linha[7], bool):
                (
                    missao_id,
                    titulo,
                    prioridade,
                    prazo,
                    instrucao,
                    status,
                    legacy_priority_marker,
                    is_pinned,
                    created_at,
                    completed_at,
                    failed_at,
                    failure_reason_type,
                    failure_reason,
                    soldier_excuse,
                    general_verdict,
                    operacao_id,
                    operacao_nome,
                ) = linha
                objetivo_id = None
                is_pinned = bool(is_pinned or legacy_priority_marker)
            else:
                (
                    missao_id,
                    titulo,
                    prioridade,
                    prazo,
                    instrucao,
                    status,
                    is_pinned,
                    created_at,
                    completed_at,
                    failed_at,
                    failure_reason_type,
                    failure_reason,
                    soldier_excuse,
                    general_verdict,
                    operacao_id,
                    operacao_nome,
                    objetivo_id,
                ) = linha
        elif len(linha) == 20:
            (
                missao_id,
                titulo,
                prioridade,
                prazo,
                instrucao,
                status,
                is_pinned,
                created_at,
                completed_at,
                failed_at,
                failure_reason_type,
                failure_reason,
                soldier_excuse,
                general_verdict,
                operacao_id,
                operacao_nome,
                objetivo_id,
                recurrence_weekdays,
                recurrence_end_date,
                duration_type,
            ) = linha
        elif len(linha) == 18:
            (
                missao_id,
                titulo,
                prioridade,
                prazo,
                instrucao,
                status,
                legacy_priority_marker,
                is_pinned,
                created_at,
                completed_at,
                failed_at,
                failure_reason_type,
                failure_reason,
                soldier_excuse,
                general_verdict,
                operacao_id,
                operacao_nome,
                objetivo_id,
            ) = linha
            is_pinned = bool(is_pinned or legacy_priority_marker)
        elif len(linha) == 16:
            (
                missao_id,
                titulo,
                prioridade,
                prazo,
                instrucao,
                status,
                is_pinned,
                created_at,
                completed_at,
                failed_at,
                failure_reason_type,
                failure_reason,
                soldier_excuse,
                general_verdict,
                operacao_id,
                operacao_nome,
            ) = linha
            objetivo_id = None
        else:
            (
                missao_id,
                titulo,
                prioridade,
                prazo,
                instrucao,
                status,
                created_at,
                completed_at,
                failed_at,
                failure_reason_type,
                failure_reason,
                soldier_excuse,
                general_verdict,
            ) = linha
            operacao_id = None
            operacao_nome = None
            objetivo_id = None
        return Missao(
            missao_id=missao_id,
            titulo=titulo,
            prioridade=prioridade,
            prazo=prazo,
            instrucao=instrucao,
            status=status,
            created_at=created_at,
            completed_at=completed_at,
            failed_at=failed_at,
            failure_reason_type=failure_reason_type,
            failure_reason=failure_reason,
            soldier_excuse=soldier_excuse,
            general_verdict=general_verdict,
            operacao_id=operacao_id,
            operacao_nome=operacao_nome,
            objetivo_id=objetivo_id,
            recurrence_weekdays=(
                json.loads(recurrence_weekdays)
                if isinstance(recurrence_weekdays, str) and recurrence_weekdays.strip()
                else recurrence_weekdays
            ),
            recurrence_end_date=recurrence_end_date,
            duration_type=duration_type,
            is_pinned=is_pinned,
            validar_instrucao=False,
        )

    def _reconstruir_usuario(self, linha: tuple) -> Usuario:
        if len(linha) == 7:
            usuario_id, usuario, email, senha_hash, ativo, nome_general, active_mode = linha
            planning_window = "night"
            timezone = "America/Recife"
            emergency_unlock_date = None
            timezone_updated_at = None
        elif len(linha) == 10:
            (
                usuario_id,
                usuario,
                email,
                senha_hash,
                ativo,
                nome_general,
                active_mode,
                planning_window,
                timezone,
                emergency_unlock_date,
            ) = linha
            timezone_updated_at = None
        else:
            (
                usuario_id,
                usuario,
                email,
                senha_hash,
                ativo,
                nome_general,
                active_mode,
                planning_window,
                timezone,
                emergency_unlock_date,
                timezone_updated_at,
            ) = linha
        return Usuario(
            usuario_id=usuario_id,
            usuario=usuario,
            email=email,
            senha_hash=senha_hash,
            ativo=ativo,
            nome_general=nome_general,
            active_mode=active_mode,
            planning_window=planning_window,
            timezone=timezone,
            emergency_unlock_date=emergency_unlock_date,
            timezone_updated_at=timezone_updated_at,
        )

    def _reconstruir_evento(self, linha: tuple) -> EventoAuditoria:
        evento_id, missao_id, usuario_id, acao, detalhes, criado_em = linha
        return EventoAuditoria(
            evento_id=evento_id,
            missao_id=missao_id,
            usuario_id=usuario_id,
            acao=acao,
            detalhes=detalhes,
            criado_em=criado_em,
        )

    def _reconstruir_revisao(self, linha: tuple) -> RevisaoSemanal:
        (
            revisao_id,
            usuario_id,
            start_date,
            end_date,
            reviewed_at,
            resumo_operacional,
            completed_missions,
            pending_missions,
            failed_missions,
            high_priority_missions,
            observacao,
        ) = linha
        return RevisaoSemanal(
            revisao_id=revisao_id,
            usuario_id=usuario_id,
            start_date=start_date,
            end_date=end_date,
            reviewed_at=reviewed_at,
            resumo_operacional=resumo_operacional,
            completed_missions=completed_missions,
            pending_missions=pending_missions,
            failed_missions=failed_missions,
            high_priority_missions=high_priority_missions,
            observacao=observacao,
        )

    def _reconstruir_operacao(self, linha: tuple) -> Operacao:
        (
            operacao_id,
            usuario_id,
            nome,
            descricao,
            start_date,
            end_date,
            weekdays,
            ordem_titulo,
            ordem_instrucao,
            is_pinned,
            status,
            created_at,
        ) = linha
        return Operacao(
            operacao_id=operacao_id,
            usuario_id=usuario_id,
            nome=nome,
            descricao=descricao,
            start_date=start_date,
            end_date=end_date,
            weekdays=json.loads(weekdays),
            ordem_titulo=ordem_titulo,
            ordem_instrucao=ordem_instrucao,
            is_pinned=is_pinned,
            status=status,
            created_at=created_at,
        )

    def _reconstruir_sonho(self, linha: tuple) -> Sonho:
        (
            sonho_id,
            usuario_id,
            titulo,
            descricao,
            tipo,
            status,
            justificativa_arquivamento,
            created_at,
            updated_at,
            archived_at,
            concluded_at,
        ) = linha
        return Sonho(
            sonho_id=sonho_id,
            usuario_id=usuario_id,
            titulo=titulo,
            descricao=descricao,
            tipo=tipo,
            status=status,
            justificativa_arquivamento=justificativa_arquivamento,
            created_at=created_at,
            updated_at=updated_at,
            archived_at=archived_at,
            concluded_at=concluded_at,
        )

    def _reconstruir_objetivo(self, linha: tuple) -> Objetivo:
        (
            objetivo_id,
            usuario_id,
            sonho_id,
            titulo,
            descricao,
            data_alvo,
            progresso,
            status,
            created_at,
            updated_at,
            concluded_at,
        ) = linha
        return Objetivo(
            objetivo_id=objetivo_id,
            usuario_id=usuario_id,
            sonho_id=sonho_id,
            titulo=titulo,
            descricao=descricao,
            data_alvo=data_alvo,
            progresso=progresso,
            status=status,
            created_at=created_at,
            updated_at=updated_at,
            concluded_at=concluded_at,
        )

    def carregar_dados(self) -> list[Missao]:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT m.missao_id, m.titulo, m.prioridade, m.prazo, m.instrucao, m.status,
                               m.is_pinned, m.created_at, m.completed_at, m.failed_at, m.failure_reason_type, m.failure_reason,
                               m.soldier_excuse, m.general_verdict, mc.operacao_id, o.nome, m.objetivo_id,
                               m.recurrence_weekdays, m.recurrence_end_date, m.duration_type
                        FROM missoes m
                        LEFT JOIN missao_contextos mc ON mc.missao_id = m.missao_id
                        LEFT JOIN operacoes o ON o.operacao_id = mc.operacao_id
                        ORDER BY m.prioridade, m.missao_id;
                        """
                    )
                    linhas = cursor.fetchall()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise LeituraRepositorioError(
                "Erro ao carregar missões do banco de dados."
            ) from erro
        return [self._reconstruir_missao(linha) for linha in linhas]

    def carregar_dados_por_responsavel(self, responsavel_id: int) -> list[Missao]:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT m.missao_id, m.titulo, m.prioridade, m.prazo, m.instrucao, m.status,
                               m.is_pinned, m.created_at, m.completed_at, m.failed_at, m.failure_reason_type, m.failure_reason,
                               m.soldier_excuse, m.general_verdict, mc.operacao_id, o.nome, m.objetivo_id,
                               m.recurrence_weekdays, m.recurrence_end_date, m.duration_type
                        FROM missoes m
                        JOIN missao_contextos mc ON mc.missao_id = m.missao_id
                        LEFT JOIN operacoes o ON o.operacao_id = mc.operacao_id
                        WHERE mc.responsavel_id = %s
                        ORDER BY m.prioridade, m.missao_id;
                        """,
                        (responsavel_id,),
                    )
                    linhas = cursor.fetchall()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise LeituraRepositorioError(
                "Erro ao carregar missões do responsável no banco de dados."
            ) from erro
        return [self._reconstruir_missao(linha) for linha in linhas]

    def buscar_por_id(self, missao_id: int) -> Missao | None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT m.missao_id, m.titulo, m.prioridade, m.prazo, m.instrucao, m.status,
                               m.is_pinned, m.created_at, m.completed_at, m.failed_at, m.failure_reason_type, m.failure_reason,
                               m.soldier_excuse, m.general_verdict, mc.operacao_id, o.nome, m.objetivo_id,
                               m.recurrence_weekdays, m.recurrence_end_date, m.duration_type
                        FROM missoes m
                        LEFT JOIN missao_contextos mc ON mc.missao_id = m.missao_id
                        LEFT JOIN operacoes o ON o.operacao_id = mc.operacao_id
                        WHERE m.missao_id = %s;
                        """,
                        (missao_id,),
                    )
                    linha = cursor.fetchone()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise LeituraRepositorioError(
                "Erro ao buscar missão no banco de dados."
            ) from erro
        return None if linha is None else self._reconstruir_missao(linha)

    def adicionar_missao(self, missao: Missao) -> None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO missoes (
                            titulo, prioridade, prazo, instrucao, status, is_pinned,
                            created_at, completed_at, failed_at, failure_reason_type, failure_reason, soldier_excuse, general_verdict,
                            objetivo_id, recurrence_weekdays, recurrence_end_date, duration_type
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING missao_id;
                        """,
                        (
                            missao.titulo,
                            missao.prioridade.value,
                            missao.prazo_date,
                            missao.instrucao,
                            missao.status.value,
                            missao.is_pinned,
                            missao.created_at,
                            missao.completed_at,
                            missao.failed_at,
                            None if missao.failure_reason_type is None else missao.failure_reason_type.value,
                            missao.failure_reason,
                            missao.soldier_excuse,
                            missao.general_verdict,
                            missao.objetivo_id,
                            None if missao.recurrence_weekdays is None else json.dumps(missao.recurrence_weekdays),
                            missao.recurrence_end_date,
                            missao.duration_type,
                        ),
                    )
                    missao_id = cursor.fetchone()[0]
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError(
                "Erro ao adicionar missão no banco de dados."
            ) from erro
        missao.atualizar_missao_id(missao_id)

    def atualizar_missao(self, missao: Missao) -> None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        UPDATE missoes
                        SET titulo = %s,
                            prioridade = %s,
                            prazo = %s,
                            instrucao = %s,
                            status = %s,
                            is_pinned = %s,
                            created_at = %s,
                            completed_at = %s,
                            failed_at = %s,
                            failure_reason_type = %s,
                            failure_reason = %s,
                            soldier_excuse = %s,
                            general_verdict = %s,
                            objetivo_id = %s,
                            recurrence_weekdays = %s,
                            recurrence_end_date = %s,
                            duration_type = %s
                        WHERE missao_id = %s;
                        """,
                        (
                            missao.titulo,
                            missao.prioridade.value,
                            missao.prazo_date,
                            missao.instrucao,
                            missao.status.value,
                            missao.is_pinned,
                            missao.created_at,
                            missao.completed_at,
                            missao.failed_at,
                            None if missao.failure_reason_type is None else missao.failure_reason_type.value,
                            missao.failure_reason,
                            missao.soldier_excuse,
                            missao.general_verdict,
                            missao.objetivo_id,
                            None if missao.recurrence_weekdays is None else json.dumps(missao.recurrence_weekdays),
                            missao.recurrence_end_date,
                            missao.duration_type,
                            missao.missao_id,
                        ),
                    )
                    if cursor.rowcount == 0:
                        raise MissaoNaoPersistidaError(
                            f"Missão {missao.missao_id} não encontrada para atualização."
                        )
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError(
                "Erro ao atualizar missão no banco de dados."
            ) from erro

    def remover_missao(self, missao_id: int) -> None:
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        "DELETE FROM missoes WHERE missao_id = %s;",
                        (missao_id,),
                    )
                    if cursor.rowcount == 0:
                        raise MissaoNaoPersistidaError(
                            f"Missão {missao_id} não encontrada para remoção."
                        )

                    for tabela_auxiliar in ("missao_contextos", "auditoria_eventos"):
                        try:
                            cursor.execute(
                                f"DELETE FROM {tabela_auxiliar} WHERE missao_id = %s;",
                                (missao_id,),
                            )
                        except psycopg.Error:
                            pass
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError(
                "Erro ao remover missão do banco de dados."
            ) from erro

    def adicionar_usuario(self, usuario: Usuario) -> None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO usuarios (
                            usuario, email, senha_hash, ativo, nome_general,
                            active_mode, planning_window, timezone, emergency_unlock_date,
                            timezone_updated_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING usuario_id;
                        """,
                        (
                            usuario.usuario,
                            usuario.email,
                            usuario.senha_hash,
                            usuario.ativo,
                            usuario.nome_general,
                            usuario.active_mode,
                            usuario.planning_window,
                            usuario.timezone,
                            usuario.emergency_unlock_date,
                            usuario.timezone_updated_at,
                        ),
                    )
                    usuario.usuario_id = cursor.fetchone()[0]
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError(
                "Erro ao adicionar usuário no banco de dados."
            ) from erro

    def buscar_usuario_por_email(self, email: str) -> Usuario | None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT usuario_id, usuario, email, senha_hash, ativo, nome_general,
                               active_mode, planning_window, timezone, emergency_unlock_date,
                               timezone_updated_at
                        FROM usuarios
                        WHERE email = %s;
                        """,
                        (email.strip().lower(),),
                    )
                    linha = cursor.fetchone()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise LeituraRepositorioError(
                "Erro ao buscar usuário pelo email no banco de dados."
            ) from erro
        return None if linha is None else self._reconstruir_usuario(linha)

    def buscar_usuario_por_identificador(self, identificador: str) -> Usuario | None:
        self.inicializar_schema()
        identificador = identificador.strip()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT usuario_id, usuario, email, senha_hash, ativo, nome_general,
                               active_mode, planning_window, timezone, emergency_unlock_date,
                               timezone_updated_at
                        FROM usuarios
                        WHERE email = %s OR lower(usuario) = lower(%s)
                        ORDER BY CASE WHEN email = %s THEN 0 ELSE 1 END
                        LIMIT 1;
                        """,
                        (identificador.lower(), identificador, identificador.lower()),
                    )
                    linha = cursor.fetchone()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise LeituraRepositorioError(
                "Erro ao buscar usuário para autenticação no banco de dados."
            ) from erro
        return None if linha is None else self._reconstruir_usuario(linha)

    def buscar_usuario_por_usuario(self, usuario: str) -> Usuario | None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT usuario_id, usuario, email, senha_hash, ativo, nome_general,
                               active_mode, planning_window, timezone, emergency_unlock_date,
                               timezone_updated_at
                        FROM usuarios
                        WHERE lower(usuario) = lower(%s);
                        """,
                        (usuario.strip(),),
                    )
                    linha = cursor.fetchone()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise LeituraRepositorioError(
                "Erro ao buscar usuário pelo nome de usuário no banco de dados."
            ) from erro
        return None if linha is None else self._reconstruir_usuario(linha)

    def buscar_usuario_por_id(self, usuario_id: int) -> Usuario | None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT usuario_id, usuario, email, senha_hash, ativo, nome_general,
                               active_mode, planning_window, timezone, emergency_unlock_date,
                               timezone_updated_at
                        FROM usuarios
                        WHERE usuario_id = %s;
                        """,
                        (usuario_id,),
                    )
                    linha = cursor.fetchone()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise LeituraRepositorioError(
                "Erro ao buscar usuário pelo ID no banco de dados."
            ) from erro
        return None if linha is None else self._reconstruir_usuario(linha)

    def atualizar_nome_general(self, usuario_id: int, nome_general: str) -> None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        UPDATE usuarios
                        SET nome_general = %s
                        WHERE usuario_id = %s;
                        """,
                        (nome_general.strip(), usuario_id),
                    )
                    if cursor.rowcount == 0:
                        raise UsuarioNaoPersistidoError(
                            f"Usuário {usuario_id} não encontrado para atualizar o nome do General."
                        )
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError(
                "Erro ao atualizar o nome do General no banco de dados."
            ) from erro

    def atualizar_modo_ativo(self, usuario_id: int, active_mode: str) -> None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        UPDATE usuarios
                        SET active_mode = %s
                        WHERE usuario_id = %s;
                        """,
                        (active_mode.strip().lower(), usuario_id),
                    )
                    if cursor.rowcount == 0:
                        raise UsuarioNaoPersistidoError(
                            f"Usuário {usuario_id} não encontrado para atualizar o modo ativo."
                        )
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError(
                "Erro ao atualizar o modo ativo no banco de dados."
            ) from erro

    def atualizar_turno_planejamento(self, usuario_id: int, planning_window: str) -> None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        UPDATE usuarios
                        SET planning_window = %s
                        WHERE usuario_id = %s;
                        """,
                        (planning_window.strip().lower(), usuario_id),
                    )
                    if cursor.rowcount == 0:
                        raise UsuarioNaoPersistidoError(
                            f"Usuário {usuario_id} não encontrado para atualizar o turno de planejamento."
                        )
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError(
                "Erro ao atualizar o turno de planejamento no banco de dados."
            ) from erro

    def atualizar_timezone(
        self,
        usuario_id: int,
        timezone: str,
        timezone_updated_at,
    ) -> None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        UPDATE usuarios
                        SET timezone = %s,
                            timezone_updated_at = %s
                        WHERE usuario_id = %s;
                        """,
                        (timezone.strip(), timezone_updated_at, usuario_id),
                    )
                    if cursor.rowcount == 0:
                        raise UsuarioNaoPersistidoError(
                            f"Usuário {usuario_id} não encontrado para atualizar o timezone."
                        )
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError(
                "Erro ao atualizar o timezone no banco de dados."
            ) from erro

    def registrar_uso_emergencia_general(self, usuario_id: int, local_date) -> None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        UPDATE usuarios
                        SET emergency_unlock_date = %s
                        WHERE usuario_id = %s;
                        """,
                        (local_date, usuario_id),
                    )
                    if cursor.rowcount == 0:
                        raise UsuarioNaoPersistidoError(
                            f"Usuário {usuario_id} não encontrado para registrar emergência do General."
                        )
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError(
                "Erro ao registrar emergência do General no banco de dados."
            ) from erro

    def salvar_contexto_missao(
        self,
        missao_id: int,
        criada_por_id: int | None,
        responsavel_id: int | None,
        operacao_id: int | None = None,
        operacao_dia=None,
    ) -> None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO missao_contextos (missao_id, criada_por_id, responsavel_id, operacao_id, operacao_dia)
                        VALUES (%s, %s, %s, %s, %s)
                        ON CONFLICT (missao_id)
                        DO UPDATE SET criada_por_id = EXCLUDED.criada_por_id,
                                      responsavel_id = EXCLUDED.responsavel_id,
                                      operacao_id = EXCLUDED.operacao_id,
                                      operacao_dia = EXCLUDED.operacao_dia;
                        """,
                        (missao_id, criada_por_id, responsavel_id, operacao_id, operacao_dia),
                    )
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError(
                "Erro ao salvar contexto da missão no banco de dados."
            ) from erro

    def buscar_contexto_missao(self, missao_id: int) -> dict | None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        "SELECT criada_por_id, responsavel_id, operacao_id, operacao_dia FROM missao_contextos WHERE missao_id = %s;",
                        (missao_id,),
                    )
                    linha = cursor.fetchone()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise LeituraRepositorioError(
                "Erro ao buscar contexto da missão no banco de dados."
            ) from erro
        if linha is None:
            return None
        criada_por_id, responsavel_id, operacao_id, operacao_dia = linha
        return {
            "criada_por_id": criada_por_id,
            "responsavel_id": responsavel_id,
            "operacao_id": operacao_id,
            "operacao_dia": operacao_dia,
        }

    def adicionar_operacao(self, operacao: Operacao) -> None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO operacoes (
                            usuario_id, nome, descricao, start_date, end_date, weekdays,
                            ordem_titulo, ordem_instrucao, is_pinned, status, created_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING operacao_id;
                        """,
                        (
                            operacao.usuario_id,
                            operacao.nome,
                            operacao.descricao,
                            operacao.start_date,
                            operacao.end_date,
                            json.dumps(operacao.weekdays),
                            operacao.ordem_titulo,
                            operacao.ordem_instrucao,
                            operacao.is_pinned,
                            operacao.status,
                            operacao.created_at,
                        ),
                    )
                    operacao.atualizar_operacao_id(cursor.fetchone()[0])
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError(
                "Erro ao adicionar operação no banco de dados."
            ) from erro

    def listar_operacoes_por_usuario(self, usuario_id: int) -> list[Operacao]:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT operacao_id, usuario_id, nome, descricao, start_date, end_date,
                               weekdays, ordem_titulo, ordem_instrucao, is_pinned, status, created_at
                        FROM operacoes
                        WHERE usuario_id = %s
                        ORDER BY status ASC, start_date DESC, operacao_id DESC;
                        """,
                        (usuario_id,),
                    )
                    linhas = cursor.fetchall()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise LeituraRepositorioError(
                "Erro ao listar operações no banco de dados."
            ) from erro
        return [self._reconstruir_operacao(linha) for linha in linhas]

    def buscar_operacao_por_id(self, operacao_id: int) -> Operacao | None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT operacao_id, usuario_id, nome, descricao, start_date, end_date,
                               weekdays, ordem_titulo, ordem_instrucao, is_pinned, status, created_at
                        FROM operacoes
                        WHERE operacao_id = %s;
                        """,
                        (operacao_id,),
                    )
                    linha = cursor.fetchone()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise LeituraRepositorioError(
                "Erro ao buscar operação no banco de dados."
            ) from erro
        return None if linha is None else self._reconstruir_operacao(linha)

    def atualizar_operacao(self, operacao: Operacao) -> None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        UPDATE operacoes
                        SET nome = %s,
                            descricao = %s,
                            start_date = %s,
                            end_date = %s,
                            weekdays = %s,
                            ordem_titulo = %s,
                            ordem_instrucao = %s,
                            is_pinned = %s,
                            status = %s
                        WHERE operacao_id = %s AND usuario_id = %s;
                        """,
                        (
                            operacao.nome,
                            operacao.descricao,
                            operacao.start_date,
                            operacao.end_date,
                            json.dumps(operacao.weekdays),
                            operacao.ordem_titulo,
                            operacao.ordem_instrucao,
                            operacao.is_pinned,
                            operacao.status,
                            operacao.operacao_id,
                            operacao.usuario_id,
                        ),
                    )
                    if cursor.rowcount == 0:
                        raise EscritaRepositorioError(
                            f"Operação {operacao.operacao_id} não encontrada para atualização."
                        )
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError(
                "Erro ao atualizar operação no banco de dados."
            ) from erro

    def remover_operacao(self, operacao_id: int, usuario_id: int) -> None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        "SELECT 1 FROM operacoes WHERE operacao_id = %s AND usuario_id = %s;",
                        (operacao_id, usuario_id),
                    )
                    if cursor.fetchone() is None:
                        raise EscritaRepositorioError(
                            f"Operação {operacao_id} não encontrada para remoção."
                        )
                    cursor.execute(
                        """
                        SELECT mc.missao_id
                        FROM missao_contextos mc
                        JOIN missoes m ON m.missao_id = mc.missao_id
                        WHERE mc.operacao_id = %s
                          AND (m.prazo IS NULL OR m.prazo >= CURRENT_DATE);
                        """,
                        (operacao_id,),
                    )
                    missao_ids = [linha[0] for linha in cursor.fetchall()]
                    if missao_ids:
                        cursor.execute(
                            "DELETE FROM auditoria_eventos WHERE missao_id = ANY(%s);",
                            (missao_ids,),
                        )
                        cursor.execute(
                            "DELETE FROM missao_contextos WHERE missao_id = ANY(%s);",
                            (missao_ids,),
                        )
                        cursor.execute(
                            "DELETE FROM missoes WHERE missao_id = ANY(%s);",
                            (missao_ids,),
                        )
                    cursor.execute(
                        """
                        UPDATE missao_contextos
                        SET operacao_id = NULL,
                            operacao_dia = NULL
                        WHERE operacao_id = %s;
                        """,
                        (operacao_id,),
                    )
                    cursor.execute(
                        "DELETE FROM operacoes WHERE operacao_id = %s AND usuario_id = %s;",
                        (operacao_id, usuario_id),
                    )
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError(
                "Erro ao remover operação no banco de dados."
            ) from erro

    def listar_missoes_por_operacao(self, operacao_id: int) -> list[Missao]:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT m.missao_id, m.titulo, m.prioridade, m.prazo, m.instrucao, m.status,
                               m.is_pinned, m.created_at, m.completed_at, m.failed_at, m.failure_reason_type, m.failure_reason,
                               m.soldier_excuse, m.general_verdict, mc.operacao_id, o.nome, m.objetivo_id,
                               m.recurrence_weekdays, m.recurrence_end_date, m.duration_type
                        FROM missoes m
                        JOIN missao_contextos mc ON mc.missao_id = m.missao_id
                        LEFT JOIN operacoes o ON o.operacao_id = mc.operacao_id
                        WHERE mc.operacao_id = %s
                        ORDER BY m.prazo ASC, m.missao_id ASC;
                        """,
                        (operacao_id,),
                    )
                    linhas = cursor.fetchall()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise LeituraRepositorioError(
                "Erro ao listar ordens da operação no banco de dados."
            ) from erro
        return [self._reconstruir_missao(linha) for linha in linhas]

    def buscar_missao_de_operacao_por_data(self, operacao_id: int, prazo) -> Missao | None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT m.missao_id, m.titulo, m.prioridade, m.prazo, m.instrucao, m.status,
                               m.is_pinned, m.created_at, m.completed_at, m.failed_at, m.failure_reason_type, m.failure_reason,
                               m.soldier_excuse, m.general_verdict, mc.operacao_id, o.nome, m.objetivo_id,
                               m.recurrence_weekdays, m.recurrence_end_date, m.duration_type
                        FROM missoes m
                        JOIN missao_contextos mc ON mc.missao_id = m.missao_id
                        LEFT JOIN operacoes o ON o.operacao_id = mc.operacao_id
                        WHERE mc.operacao_id = %s AND (mc.operacao_dia = %s OR m.prazo = %s)
                        LIMIT 1;
                        """,
                        (operacao_id, prazo, prazo),
                    )
                    linha = cursor.fetchone()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise LeituraRepositorioError(
                "Erro ao buscar ordem de operação no banco de dados."
            ) from erro
        return None if linha is None else self._reconstruir_missao(linha)

    def criar_missao_de_operacao_se_ausente(
        self,
        missao: Missao,
        criada_por_id: int,
        responsavel_id: int,
        operacao_id: int,
        operacao_dia,
    ) -> Missao | None:
        self.inicializar_schema()
        existente = self.buscar_missao_de_operacao_por_data(operacao_id, operacao_dia)
        if existente is not None:
            return None
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO missoes (
                            titulo, prioridade, prazo, instrucao, status, is_pinned,
                            created_at, completed_at, failed_at, failure_reason_type, failure_reason, soldier_excuse, general_verdict,
                            objetivo_id, recurrence_weekdays, recurrence_end_date, duration_type
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING missao_id;
                        """,
                        (
                            missao.titulo,
                            missao.prioridade.value,
                            missao.prazo_date,
                            missao.instrucao,
                            missao.status.value,
                            missao.is_pinned,
                            missao.created_at,
                            missao.completed_at,
                            missao.failed_at,
                            None if missao.failure_reason_type is None else missao.failure_reason_type.value,
                            missao.failure_reason,
                            missao.soldier_excuse,
                            missao.general_verdict,
                            missao.objetivo_id,
                            None if missao.recurrence_weekdays is None else json.dumps(missao.recurrence_weekdays),
                            missao.recurrence_end_date,
                            missao.duration_type,
                        ),
                    )
                    missao_id = cursor.fetchone()[0]
                    cursor.execute(
                        """
                        INSERT INTO missao_contextos (
                            missao_id, criada_por_id, responsavel_id, operacao_id, operacao_dia
                        )
                        VALUES (%s, %s, %s, %s, %s);
                        """,
                        (missao_id, criada_por_id, responsavel_id, operacao_id, operacao_dia),
                    )
                    missao.atualizar_missao_id(missao_id)
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.errors.UniqueViolation:
            return None
        except psycopg.Error as erro:
            raise EscritaRepositorioError(
                "Erro ao criar ordem de operação no banco de dados."
            ) from erro
        return missao

    def criar_sonho(self, sonho: Sonho) -> None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO sonhos (
                            usuario_id, titulo, descricao, tipo, status, justificativa_arquivamento,
                            created_at, updated_at, archived_at, concluded_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id;
                        """,
                        (
                            sonho.usuario_id,
                            sonho.titulo,
                            sonho.descricao,
                            sonho.tipo.value,
                            sonho.status.value,
                            sonho.justificativa_arquivamento,
                            sonho.created_at,
                            sonho.updated_at,
                            sonho.archived_at,
                            sonho.concluded_at,
                        ),
                    )
                    sonho.atualizar_sonho_id(cursor.fetchone()[0])
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError("Erro ao criar sonho no banco de dados.") from erro

    def atualizar_sonho(self, sonho: Sonho) -> None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        UPDATE sonhos
                        SET titulo = %s,
                            descricao = %s,
                            tipo = %s,
                            status = %s,
                            justificativa_arquivamento = %s,
                            updated_at = %s,
                            archived_at = %s,
                            concluded_at = %s
                        WHERE id = %s AND usuario_id = %s;
                        """,
                        (
                            sonho.titulo,
                            sonho.descricao,
                            sonho.tipo.value,
                            sonho.status.value,
                            sonho.justificativa_arquivamento,
                            sonho.updated_at,
                            sonho.archived_at,
                            sonho.concluded_at,
                            sonho.sonho_id,
                            sonho.usuario_id,
                        ),
                    )
                    if cursor.rowcount == 0:
                        raise EscritaRepositorioError(f"Sonho {sonho.sonho_id} não encontrado para atualização.")
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError("Erro ao atualizar sonho no banco de dados.") from erro

    def promover_sonho_para_principal(self, usuario_id: int, sonho_id: int, instante) -> None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT 1 FROM sonhos
                        WHERE id = %s AND usuario_id = %s AND status = 'ativo';
                        """,
                        (sonho_id, usuario_id),
                    )
                    if cursor.fetchone() is None:
                        raise EscritaRepositorioError("Sonho não encontrado.")
                    cursor.execute(
                        """
                        UPDATE sonhos
                        SET tipo = 'secundario',
                            updated_at = %s
                        WHERE usuario_id = %s AND status = 'ativo' AND tipo = 'principal';
                        """,
                        (instante, usuario_id),
                    )
                    cursor.execute(
                        """
                        UPDATE sonhos
                        SET tipo = 'principal',
                            updated_at = %s
                        WHERE id = %s AND usuario_id = %s AND status = 'ativo';
                        """,
                        (instante, sonho_id, usuario_id),
                    )
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError("Erro ao promover sonho no banco de dados.") from erro

    def buscar_sonho_por_id(self, sonho_id: int) -> Sonho | None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT id, usuario_id, titulo, descricao, tipo, status, justificativa_arquivamento,
                               created_at, updated_at, archived_at, concluded_at
                        FROM sonhos
                        WHERE id = %s;
                        """,
                        (sonho_id,),
                    )
                    linha = cursor.fetchone()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise LeituraRepositorioError("Erro ao buscar sonho no banco de dados.") from erro
        return None if linha is None else self._reconstruir_sonho(linha)

    def listar_sonhos_por_usuario(self, usuario_id: int) -> list[Sonho]:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT id, usuario_id, titulo, descricao, tipo, status, justificativa_arquivamento,
                               created_at, updated_at, archived_at, concluded_at
                        FROM sonhos
                        WHERE usuario_id = %s
                        ORDER BY status ASC, tipo ASC, updated_at DESC, id DESC;
                        """,
                        (usuario_id,),
                    )
                    linhas = cursor.fetchall()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise LeituraRepositorioError("Erro ao listar sonhos no banco de dados.") from erro
        return [self._reconstruir_sonho(linha) for linha in linhas]

    def contar_sonhos_ativos_por_usuario(self, usuario_id: int) -> dict:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT
                            COUNT(*) AS total,
                            COUNT(*) FILTER (WHERE tipo = 'principal') AS principal,
                            COUNT(*) FILTER (WHERE tipo = 'secundario') AS secundario
                        FROM sonhos
                        WHERE usuario_id = %s AND status = 'ativo';
                        """,
                        (usuario_id,),
                    )
                    total, principal, secundario = cursor.fetchone()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise LeituraRepositorioError("Erro ao contar sonhos no banco de dados.") from erro
        return {"total": total, "principal": principal, "secundario": secundario}

    def criar_objetivo(self, objetivo: Objetivo) -> None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO objetivos (
                            usuario_id, sonho_id, titulo, descricao, data_alvo, progresso,
                            status, created_at, updated_at, concluded_at
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING id;
                        """,
                        (
                            objetivo.usuario_id,
                            objetivo.sonho_id,
                            objetivo.titulo,
                            objetivo.descricao,
                            objetivo.data_alvo,
                            objetivo.progresso,
                            objetivo.status.value,
                            objetivo.created_at,
                            objetivo.updated_at,
                            objetivo.concluded_at,
                        ),
                    )
                    objetivo.atualizar_objetivo_id(cursor.fetchone()[0])
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError("Erro ao criar objetivo no banco de dados.") from erro

    def atualizar_objetivo(self, objetivo: Objetivo) -> None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        UPDATE objetivos
                        SET sonho_id = %s,
                            titulo = %s,
                            descricao = %s,
                            data_alvo = %s,
                            progresso = %s,
                            status = %s,
                            updated_at = %s,
                            concluded_at = %s
                        WHERE id = %s AND usuario_id = %s;
                        """,
                        (
                            objetivo.sonho_id,
                            objetivo.titulo,
                            objetivo.descricao,
                            objetivo.data_alvo,
                            objetivo.progresso,
                            objetivo.status.value,
                            objetivo.updated_at,
                            objetivo.concluded_at,
                            objetivo.objetivo_id,
                            objetivo.usuario_id,
                        ),
                    )
                    if cursor.rowcount == 0:
                        raise EscritaRepositorioError(f"Objetivo {objetivo.objetivo_id} não encontrado para atualização.")
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError("Erro ao atualizar objetivo no banco de dados.") from erro

    def buscar_objetivo_por_id(self, objetivo_id: int) -> Objetivo | None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT id, usuario_id, sonho_id, titulo, descricao, data_alvo, progresso,
                               status, created_at, updated_at, concluded_at
                        FROM objetivos
                        WHERE id = %s;
                        """,
                        (objetivo_id,),
                    )
                    linha = cursor.fetchone()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise LeituraRepositorioError("Erro ao buscar objetivo no banco de dados.") from erro
        return None if linha is None else self._reconstruir_objetivo(linha)

    def listar_objetivos_por_usuario(self, usuario_id: int) -> list[Objetivo]:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT id, usuario_id, sonho_id, titulo, descricao, data_alvo, progresso,
                               status, created_at, updated_at, concluded_at
                        FROM objetivos
                        WHERE usuario_id = %s
                        ORDER BY status ASC, data_alvo NULLS LAST, updated_at DESC, id DESC;
                        """,
                        (usuario_id,),
                    )
                    linhas = cursor.fetchall()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise LeituraRepositorioError("Erro ao listar objetivos no banco de dados.") from erro
        return [self._reconstruir_objetivo(linha) for linha in linhas]

    def deletar_objetivo(self, objetivo_id: int, usuario_id: int) -> None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        "DELETE FROM objetivos WHERE id = %s AND usuario_id = %s;",
                        (objetivo_id, usuario_id),
                    )
                    if cursor.rowcount == 0:
                        raise EscritaRepositorioError(f"Objetivo {objetivo_id} não encontrado para remoção.")
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError("Erro ao remover objetivo no banco de dados.") from erro

    def registrar_auditoria(self, evento: EventoAuditoria) -> None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO auditoria_eventos (missao_id, usuario_id, acao, detalhes, criado_em)
                        VALUES (%s, %s, %s, %s, %s)
                        RETURNING evento_id;
                        """,
                        (
                            evento.missao_id,
                            evento.usuario_id,
                            evento.acao,
                            evento.detalhes,
                            evento.criado_em,
                        ),
                    )
                    evento.evento_id = cursor.fetchone()[0]
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError(
                "Erro ao registrar auditoria no banco de dados."
            ) from erro

    def listar_auditoria_por_missao(self, missao_id: int) -> list[EventoAuditoria]:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT evento_id, missao_id, usuario_id, acao, detalhes, criado_em
                        FROM auditoria_eventos
                        WHERE missao_id = %s
                        ORDER BY criado_em, evento_id;
                        """,
                        (missao_id,),
                    )
                    linhas = cursor.fetchall()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise LeituraRepositorioError(
                "Erro ao listar auditoria da missão no banco de dados."
            ) from erro
        return [self._reconstruir_evento(linha) for linha in linhas]

    def buscar_revisao_por_periodo(
        self,
        usuario_id: int,
        start_date,
        end_date,
    ) -> RevisaoSemanal | None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT revisao_id, usuario_id, start_date, end_date, reviewed_at,
                               resumo_operacional, completed_missions, pending_missions,
                               failed_missions, high_priority_missions, observacao
                        FROM revisoes_semanais
                        WHERE usuario_id = %s AND start_date = %s AND end_date = %s;
                        """,
                        (usuario_id, start_date, end_date),
                    )
                    linha = cursor.fetchone()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise LeituraRepositorioError(
                "Erro ao buscar revisão semanal no banco de dados."
            ) from erro
        return None if linha is None else self._reconstruir_revisao(linha)

    def listar_revisoes_semanais(self, usuario_id: int) -> list[RevisaoSemanal]:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT revisao_id, usuario_id, start_date, end_date, reviewed_at,
                               resumo_operacional, completed_missions, pending_missions,
                               failed_missions, high_priority_missions, observacao
                        FROM revisoes_semanais
                        WHERE usuario_id = %s
                        ORDER BY start_date DESC, revisao_id DESC;
                        """,
                        (usuario_id,),
                    )
                    linhas = cursor.fetchall()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise LeituraRepositorioError(
                "Erro ao listar revisões semanais no banco de dados."
            ) from erro
        return [self._reconstruir_revisao(linha) for linha in linhas]

    def salvar_revisao_semanal(self, revisao: RevisaoSemanal) -> None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO revisoes_semanais (
                            usuario_id, start_date, end_date, reviewed_at,
                            resumo_operacional, completed_missions, pending_missions,
                            failed_missions, high_priority_missions, observacao
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (usuario_id, start_date, end_date)
                        DO UPDATE SET reviewed_at = EXCLUDED.reviewed_at,
                                      resumo_operacional = EXCLUDED.resumo_operacional,
                                      completed_missions = EXCLUDED.completed_missions,
                                      pending_missions = EXCLUDED.pending_missions,
                                      failed_missions = EXCLUDED.failed_missions,
                                      high_priority_missions = EXCLUDED.high_priority_missions,
                                      observacao = EXCLUDED.observacao
                        RETURNING revisao_id;
                        """,
                        (
                            revisao.usuario_id,
                            revisao.start_date,
                            revisao.end_date,
                            revisao.reviewed_at,
                            revisao.resumo_operacional,
                            revisao.completed_missions,
                            revisao.pending_missions,
                            revisao.failed_missions,
                            revisao.high_priority_missions,
                            revisao.observacao,
                        ),
                    )
                    revisao.atualizar_revisao_id(cursor.fetchone()[0])
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError(
                "Erro ao salvar revisão semanal no banco de dados."
            ) from erro
