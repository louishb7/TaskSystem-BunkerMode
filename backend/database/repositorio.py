from contextlib import contextmanager
from datetime import date
import json
import shlex
from urllib.parse import quote_plus, urlencode, urlsplit, urlunsplit

from sqlalchemy import and_, create_engine, delete, func, or_, select, text, update
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import sessionmaker

from backend.database.orm_models import (
    AuditoriaEventoORM,
    MissaoContextoORM,
    MissaoORM,
    ObjetivoORM,
    OperacaoORM,
    RevisaoSemanalORM,
    SonhoORM,
    UsuarioORM,
)
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
    """Mantido por compatibilidade com imports legados."""


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


def _normalizar_url_sqlalchemy(connection_string: str) -> str:
    if "://" in connection_string:
        return _forcar_driver_psycopg(connection_string)

    partes = {}
    for token in shlex.split(connection_string):
        if "=" not in token:
            continue
        chave, valor = token.split("=", maxsplit=1)
        partes[chave] = valor

    user = quote_plus(partes.get("user", ""))
    password = quote_plus(partes.get("password", ""))
    host = partes.get("host", "localhost")
    port = partes.get("port", "5432")
    dbname = partes.get("dbname", "")
    auth = user if not password else f"{user}:{password}"
    netloc = f"{auth}@{host}:{port}" if auth else f"{host}:{port}"
    extras = {
        chave: valor
        for chave, valor in partes.items()
        if chave not in {"dbname", "user", "password", "host", "port"}
    }
    query = urlencode(extras)
    return urlunsplit(("postgresql+psycopg", netloc, f"/{dbname}", query, ""))


def _forcar_driver_psycopg(url: str) -> str:
    if url.startswith("postgres://"):
        return "postgresql+psycopg://" + url.removeprefix("postgres://")
    if url.startswith("postgresql://"):
        return "postgresql+psycopg://" + url.removeprefix("postgresql://")
    return url


def _json_lista_ou_none(valor):
    if valor is None:
        return None
    if isinstance(valor, str):
        if not valor.strip():
            return None
        return json.loads(valor)
    return valor


def _json_dumps_ou_none(valor):
    if valor is None:
        return None
    return json.dumps(valor)


class RepositorioPostgres:
    """Responsável por carregar e persistir dados do BunkerMode no PostgreSQL."""

    def __init__(self, connection_string: str):
        self.connection_string = connection_string
        self.sqlalchemy_url = _normalizar_url_sqlalchemy(connection_string)
        self._engine = create_engine(self.sqlalchemy_url)
        self._Session = sessionmaker(bind=self._engine, expire_on_commit=False)

    def __del__(self):  # pragma: no cover - fallback defensivo
        self.fechar()

    @contextmanager
    def _session(self):
        session = self._Session()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def fechar(self) -> None:
        self._engine.dispose()

    @classmethod
    def fechar_conexoes_compartilhadas(cls) -> None:
        return None

    def verificar_conexao(self) -> None:
        try:
            with self._engine.connect() as conexao:
                conexao.execute(text("SELECT 1"))
        except SQLAlchemyError as erro:
            raise ConexaoRepositorioError(
                "Não foi possível validar a conexão com o banco de dados."
            ) from erro

    def _orm_para_missao(
        self,
        orm: MissaoORM,
        contexto: MissaoContextoORM | None = None,
        operacao_nome: str | None = None,
    ) -> Missao:
        return Missao(
            missao_id=orm.missao_id,
            titulo=orm.titulo,
            prioridade=orm.prioridade,
            prazo=orm.prazo,
            instrucao=orm.instrucao,
            status=orm.status,
            created_at=orm.created_at,
            completed_at=orm.completed_at,
            failed_at=orm.failed_at,
            failure_reason_type=orm.failure_reason_type,
            failure_reason=orm.failure_reason,
            soldier_excuse=orm.soldier_excuse,
            general_verdict=orm.general_verdict,
            operacao_id=None if contexto is None else contexto.operacao_id,
            operacao_nome=operacao_nome,
            objetivo_id=orm.objetivo_id,
            sonho_id=orm.sonho_id,
            recurrence_weekdays=_json_lista_ou_none(orm.recurrence_weekdays),
            recurrence_end_date=orm.recurrence_end_date,
            duration_type=orm.duration_type,
            is_pinned=orm.is_pinned,
            validar_instrucao=False,
        )

    def _orm_para_usuario(self, orm: UsuarioORM) -> Usuario:
        return Usuario(
            usuario_id=orm.usuario_id,
            usuario=orm.usuario,
            email=orm.email,
            senha_hash=orm.senha_hash,
            ativo=orm.ativo,
            nome_general=orm.nome_general,
            active_mode=orm.active_mode,
            planning_window=orm.planning_window,
            timezone=orm.timezone,
            emergency_unlock_date=orm.emergency_unlock_date,
            timezone_updated_at=orm.timezone_updated_at,
        )

    def _orm_para_evento(self, orm: AuditoriaEventoORM) -> EventoAuditoria:
        return EventoAuditoria(
            evento_id=orm.evento_id,
            missao_id=orm.missao_id,
            usuario_id=orm.usuario_id,
            acao=orm.acao,
            detalhes=orm.detalhes,
            criado_em=orm.criado_em,
        )

    def _orm_para_revisao(self, orm: RevisaoSemanalORM) -> RevisaoSemanal:
        return RevisaoSemanal(
            revisao_id=orm.revisao_id,
            usuario_id=orm.usuario_id,
            start_date=orm.start_date,
            end_date=orm.end_date,
            reviewed_at=orm.reviewed_at,
            resumo_operacional=orm.resumo_operacional,
            completed_missions=orm.completed_missions,
            pending_missions=orm.pending_missions,
            failed_missions=orm.failed_missions,
            high_priority_missions=orm.high_priority_missions,
            observacao=orm.observacao,
        )

    def _orm_para_operacao(self, orm: OperacaoORM) -> Operacao:
        return Operacao(
            operacao_id=orm.operacao_id,
            usuario_id=orm.usuario_id,
            nome=orm.nome,
            descricao=orm.descricao,
            start_date=orm.start_date,
            end_date=orm.end_date,
            weekdays=json.loads(orm.weekdays),
            ordem_titulo=orm.ordem_titulo,
            ordem_instrucao=orm.ordem_instrucao,
            is_pinned=orm.is_pinned,
            status=orm.status,
            created_at=orm.created_at,
        )

    def _orm_para_sonho(self, orm: SonhoORM) -> Sonho:
        return Sonho(
            sonho_id=orm.id,
            usuario_id=orm.usuario_id,
            titulo=orm.titulo,
            descricao=orm.descricao,
            tipo=orm.tipo,
            status=orm.status,
            justificativa_arquivamento=orm.justificativa_arquivamento,
            created_at=orm.created_at,
            updated_at=orm.updated_at,
            archived_at=orm.archived_at,
            concluded_at=orm.concluded_at,
        )

    def _orm_para_objetivo(self, orm: ObjetivoORM) -> Objetivo:
        return Objetivo(
            objetivo_id=orm.id,
            usuario_id=orm.usuario_id,
            sonho_id=orm.sonho_id,
            titulo=orm.titulo,
            descricao=orm.descricao,
            data_alvo=orm.data_alvo,
            progresso=orm.progresso,
            status=orm.status,
            order_index=orm.order_index,
            created_at=orm.created_at,
            updated_at=orm.updated_at,
            concluded_at=orm.concluded_at,
        )

    def _select_missoes_com_contexto(self):
        return (
            select(MissaoORM, MissaoContextoORM, OperacaoORM.nome)
            .outerjoin(
                MissaoContextoORM,
                MissaoContextoORM.missao_id == MissaoORM.missao_id,
            )
            .outerjoin(
                OperacaoORM,
                OperacaoORM.operacao_id == MissaoContextoORM.operacao_id,
            )
        )

    def _mission_orm(self, missao: Missao) -> MissaoORM:
        return MissaoORM(
            titulo=missao.titulo,
            prioridade=missao.prioridade.value,
            prazo=missao.prazo_date,
            instrucao=missao.instrucao,
            status=missao.status.value,
            is_pinned=missao.is_pinned,
            created_at=missao.created_at,
            completed_at=missao.completed_at,
            failed_at=missao.failed_at,
            failure_reason_type=(
                None
                if missao.failure_reason_type is None
                else missao.failure_reason_type.value
            ),
            failure_reason=missao.failure_reason,
            soldier_excuse=missao.soldier_excuse,
            general_verdict=missao.general_verdict,
            objetivo_id=missao.objetivo_id,
            sonho_id=missao.sonho_id,
            recurrence_weekdays=_json_dumps_ou_none(missao.recurrence_weekdays),
            recurrence_end_date=missao.recurrence_end_date,
            duration_type=missao.duration_type,
        )

    def _aplicar_missao(self, orm: MissaoORM, missao: Missao) -> None:
        orm.titulo = missao.titulo
        orm.prioridade = missao.prioridade.value
        orm.prazo = missao.prazo_date
        orm.instrucao = missao.instrucao
        orm.status = missao.status.value
        orm.is_pinned = missao.is_pinned
        orm.created_at = missao.created_at
        orm.completed_at = missao.completed_at
        orm.failed_at = missao.failed_at
        orm.failure_reason_type = (
            None if missao.failure_reason_type is None else missao.failure_reason_type.value
        )
        orm.failure_reason = missao.failure_reason
        orm.soldier_excuse = missao.soldier_excuse
        orm.general_verdict = missao.general_verdict
        orm.objetivo_id = missao.objetivo_id
        orm.sonho_id = missao.sonho_id
        orm.recurrence_weekdays = _json_dumps_ou_none(missao.recurrence_weekdays)
        orm.recurrence_end_date = missao.recurrence_end_date
        orm.duration_type = missao.duration_type

    def carregar_dados(self) -> list[Missao]:
        try:
            with self._session() as session:
                linhas = session.execute(
                    self._select_missoes_com_contexto().order_by(
                        MissaoORM.prioridade,
                        MissaoORM.missao_id,
                    )
                ).all()
                return [
                    self._orm_para_missao(missao, contexto, operacao_nome)
                    for missao, contexto, operacao_nome in linhas
                ]
        except SQLAlchemyError as erro:
            raise LeituraRepositorioError(
                "Erro ao carregar missões do banco de dados."
            ) from erro

    def carregar_dados_por_responsavel(self, responsavel_id: int) -> list[Missao]:
        try:
            with self._session() as session:
                linhas = session.execute(
                    self._select_missoes_com_contexto()
                    .where(MissaoContextoORM.responsavel_id == responsavel_id)
                    .order_by(MissaoORM.prioridade, MissaoORM.missao_id)
                ).all()
                return [
                    self._orm_para_missao(missao, contexto, operacao_nome)
                    for missao, contexto, operacao_nome in linhas
                ]
        except SQLAlchemyError as erro:
            raise LeituraRepositorioError(
                "Erro ao carregar missões do responsável no banco de dados."
            ) from erro

    def buscar_por_id(self, missao_id: int) -> Missao | None:
        try:
            with self._session() as session:
                linha = session.execute(
                    self._select_missoes_com_contexto().where(
                        MissaoORM.missao_id == missao_id
                    )
                ).first()
                if linha is None:
                    return None
                missao, contexto, operacao_nome = linha
                return self._orm_para_missao(missao, contexto, operacao_nome)
        except SQLAlchemyError as erro:
            raise LeituraRepositorioError(
                "Erro ao buscar missão no banco de dados."
            ) from erro

    def adicionar_missao(self, missao: Missao) -> None:
        try:
            with self._session() as session:
                orm = self._mission_orm(missao)
                session.add(orm)
                session.flush()
                missao.atualizar_missao_id(orm.missao_id)
        except SQLAlchemyError as erro:
            raise EscritaRepositorioError(
                "Erro ao adicionar missão no banco de dados."
            ) from erro

    def atualizar_missao(self, missao: Missao) -> None:
        try:
            with self._session() as session:
                orm = session.get(MissaoORM, missao.missao_id)
                if orm is None:
                    raise MissaoNaoPersistidaError(
                        f"Missão {missao.missao_id} não encontrada para atualização."
                    )
                self._aplicar_missao(orm, missao)
        except ErroRepositorio:
            raise
        except SQLAlchemyError as erro:
            raise EscritaRepositorioError(
                "Erro ao atualizar missão no banco de dados."
            ) from erro

    def remover_missao(self, missao_id: int) -> None:
        try:
            with self._session() as session:
                session.execute(
                    delete(AuditoriaEventoORM).where(
                        AuditoriaEventoORM.missao_id == missao_id
                    )
                )
                session.execute(
                    delete(MissaoContextoORM).where(
                        MissaoContextoORM.missao_id == missao_id
                    )
                )
                resultado = session.execute(
                    delete(MissaoORM).where(MissaoORM.missao_id == missao_id)
                )
                if resultado.rowcount == 0:
                    raise MissaoNaoPersistidaError(
                        f"Missão {missao_id} não encontrada para remoção."
                    )
        except ErroRepositorio:
            raise
        except SQLAlchemyError as erro:
            raise EscritaRepositorioError(
                "Erro ao remover missão do banco de dados."
            ) from erro

    def adicionar_usuario(self, usuario: Usuario) -> None:
        try:
            with self._session() as session:
                orm = UsuarioORM(
                    usuario=usuario.usuario,
                    email=usuario.email,
                    senha_hash=usuario.senha_hash,
                    ativo=usuario.ativo,
                    nome_general=usuario.nome_general,
                    active_mode=usuario.active_mode,
                    planning_window=usuario.planning_window,
                    timezone=usuario.timezone,
                    emergency_unlock_date=usuario.emergency_unlock_date,
                    timezone_updated_at=usuario.timezone_updated_at,
                )
                session.add(orm)
                session.flush()
                usuario.usuario_id = orm.usuario_id
        except SQLAlchemyError as erro:
            raise EscritaRepositorioError(
                "Erro ao adicionar usuário no banco de dados."
            ) from erro

    def buscar_usuario_por_email(self, email: str) -> Usuario | None:
        try:
            with self._session() as session:
                orm = session.execute(
                    select(UsuarioORM).where(UsuarioORM.email == email.strip().lower())
                ).scalar_one_or_none()
                return None if orm is None else self._orm_para_usuario(orm)
        except SQLAlchemyError as erro:
            raise LeituraRepositorioError(
                "Erro ao buscar usuário pelo email no banco de dados."
            ) from erro

    def buscar_usuario_por_identificador(self, identificador: str) -> Usuario | None:
        identificador = identificador.strip()
        try:
            with self._session() as session:
                orm = session.execute(
                    select(UsuarioORM)
                    .where(
                        or_(
                            UsuarioORM.email == identificador.lower(),
                            func.lower(UsuarioORM.usuario) == identificador.lower(),
                        )
                    )
                    .order_by((UsuarioORM.email == identificador.lower()).desc())
                    .limit(1)
                ).scalar_one_or_none()
                return None if orm is None else self._orm_para_usuario(orm)
        except SQLAlchemyError as erro:
            raise LeituraRepositorioError(
                "Erro ao buscar usuário para autenticação no banco de dados."
            ) from erro

    def buscar_usuario_por_usuario(self, usuario: str) -> Usuario | None:
        try:
            with self._session() as session:
                orm = session.execute(
                    select(UsuarioORM).where(
                        func.lower(UsuarioORM.usuario) == usuario.strip().lower()
                    )
                ).scalar_one_or_none()
                return None if orm is None else self._orm_para_usuario(orm)
        except SQLAlchemyError as erro:
            raise LeituraRepositorioError(
                "Erro ao buscar usuário pelo nome de usuário no banco de dados."
            ) from erro

    def buscar_usuario_por_id(self, usuario_id: int) -> Usuario | None:
        try:
            with self._session() as session:
                orm = session.get(UsuarioORM, usuario_id)
                return None if orm is None else self._orm_para_usuario(orm)
        except SQLAlchemyError as erro:
            raise LeituraRepositorioError(
                "Erro ao buscar usuário pelo ID no banco de dados."
            ) from erro

    def _atualizar_usuario(self, usuario_id: int, mensagem: str, **campos) -> None:
        try:
            with self._session() as session:
                resultado = session.execute(
                    update(UsuarioORM)
                    .where(UsuarioORM.usuario_id == usuario_id)
                    .values(**campos)
                )
                if resultado.rowcount == 0:
                    raise UsuarioNaoPersistidoError(mensagem)
        except ErroRepositorio:
            raise
        except SQLAlchemyError as erro:
            raise EscritaRepositorioError(mensagem) from erro

    def atualizar_nome_general(self, usuario_id: int, nome_general: str) -> None:
        self._atualizar_usuario(
            usuario_id,
            f"Usuário {usuario_id} não encontrado para atualizar o nome do General.",
            nome_general=nome_general.strip(),
        )

    def atualizar_modo_ativo(self, usuario_id: int, active_mode: str) -> None:
        self._atualizar_usuario(
            usuario_id,
            f"Usuário {usuario_id} não encontrado para atualizar o modo ativo.",
            active_mode=active_mode.strip().lower(),
        )

    def atualizar_turno_planejamento(self, usuario_id: int, planning_window: str) -> None:
        self._atualizar_usuario(
            usuario_id,
            f"Usuário {usuario_id} não encontrado para atualizar o turno de planejamento.",
            planning_window=planning_window.strip().lower(),
        )

    def atualizar_timezone(
        self,
        usuario_id: int,
        timezone: str,
        timezone_updated_at,
    ) -> None:
        self._atualizar_usuario(
            usuario_id,
            f"Usuário {usuario_id} não encontrado para atualizar o timezone.",
            timezone=timezone.strip(),
            timezone_updated_at=timezone_updated_at,
        )

    def registrar_uso_emergencia_general(self, usuario_id: int, local_date) -> None:
        self._atualizar_usuario(
            usuario_id,
            f"Usuário {usuario_id} não encontrado para registrar emergência do General.",
            emergency_unlock_date=local_date,
        )

    def salvar_contexto_missao(
        self,
        missao_id: int,
        criada_por_id: int | None,
        responsavel_id: int | None,
        operacao_id: int | None = None,
        operacao_dia=None,
    ) -> None:
        try:
            with self._session() as session:
                contexto = session.get(MissaoContextoORM, missao_id)
                if contexto is None:
                    contexto = MissaoContextoORM(missao_id=missao_id)
                    session.add(contexto)
                contexto.criada_por_id = criada_por_id
                contexto.responsavel_id = responsavel_id
                contexto.operacao_id = operacao_id
                contexto.operacao_dia = operacao_dia
        except SQLAlchemyError as erro:
            raise EscritaRepositorioError(
                "Erro ao salvar contexto da missão no banco de dados."
            ) from erro

    def buscar_contexto_missao(self, missao_id: int) -> dict | None:
        try:
            with self._session() as session:
                contexto = session.get(MissaoContextoORM, missao_id)
                if contexto is None:
                    return None
                return {
                    "criada_por_id": contexto.criada_por_id,
                    "responsavel_id": contexto.responsavel_id,
                    "operacao_id": contexto.operacao_id,
                    "operacao_dia": contexto.operacao_dia,
                }
        except SQLAlchemyError as erro:
            raise LeituraRepositorioError(
                "Erro ao buscar contexto da missão no banco de dados."
            ) from erro

    def adicionar_operacao(self, operacao: Operacao) -> None:
        try:
            with self._session() as session:
                orm = OperacaoORM(
                    usuario_id=operacao.usuario_id,
                    nome=operacao.nome,
                    descricao=operacao.descricao,
                    start_date=operacao.start_date,
                    end_date=operacao.end_date,
                    weekdays=json.dumps(operacao.weekdays),
                    ordem_titulo=operacao.ordem_titulo,
                    ordem_instrucao=operacao.ordem_instrucao,
                    is_pinned=operacao.is_pinned,
                    status=operacao.status,
                    created_at=operacao.created_at,
                )
                session.add(orm)
                session.flush()
                operacao.atualizar_operacao_id(orm.operacao_id)
        except SQLAlchemyError as erro:
            raise EscritaRepositorioError(
                "Erro ao adicionar operação no banco de dados."
            ) from erro

    def listar_operacoes_por_usuario(self, usuario_id: int) -> list[Operacao]:
        try:
            with self._session() as session:
                operacoes = session.execute(
                    select(OperacaoORM)
                    .where(OperacaoORM.usuario_id == usuario_id)
                    .order_by(
                        OperacaoORM.status.asc(),
                        OperacaoORM.start_date.desc(),
                        OperacaoORM.operacao_id.desc(),
                    )
                ).scalars()
                return [self._orm_para_operacao(operacao) for operacao in operacoes]
        except SQLAlchemyError as erro:
            raise LeituraRepositorioError(
                "Erro ao listar operações no banco de dados."
            ) from erro

    def buscar_operacao_por_id(self, operacao_id: int) -> Operacao | None:
        try:
            with self._session() as session:
                orm = session.get(OperacaoORM, operacao_id)
                return None if orm is None else self._orm_para_operacao(orm)
        except SQLAlchemyError as erro:
            raise LeituraRepositorioError(
                "Erro ao buscar operação no banco de dados."
            ) from erro

    def atualizar_operacao(self, operacao: Operacao) -> None:
        try:
            with self._session() as session:
                orm = session.get(OperacaoORM, operacao.operacao_id)
                if orm is None or orm.usuario_id != operacao.usuario_id:
                    raise EscritaRepositorioError(
                        f"Operação {operacao.operacao_id} não encontrada para atualização."
                    )
                orm.nome = operacao.nome
                orm.descricao = operacao.descricao
                orm.start_date = operacao.start_date
                orm.end_date = operacao.end_date
                orm.weekdays = json.dumps(operacao.weekdays)
                orm.ordem_titulo = operacao.ordem_titulo
                orm.ordem_instrucao = operacao.ordem_instrucao
                orm.is_pinned = operacao.is_pinned
                orm.status = operacao.status
        except ErroRepositorio:
            raise
        except SQLAlchemyError as erro:
            raise EscritaRepositorioError(
                "Erro ao atualizar operação no banco de dados."
            ) from erro

    def remover_operacao(self, operacao_id: int, usuario_id: int) -> None:
        try:
            with self._session() as session:
                operacao = session.get(OperacaoORM, operacao_id)
                if operacao is None or operacao.usuario_id != usuario_id:
                    raise EscritaRepositorioError(
                        f"Operação {operacao_id} não encontrada para remoção."
                    )

                missao_ids = list(
                    session.execute(
                        select(MissaoContextoORM.missao_id)
                        .join(
                            MissaoORM,
                            MissaoORM.missao_id == MissaoContextoORM.missao_id,
                        )
                        .where(
                            MissaoContextoORM.operacao_id == operacao_id,
                            or_(
                                MissaoORM.prazo.is_(None),
                                MissaoORM.prazo >= func.current_date(),
                            ),
                        )
                    ).scalars()
                )
                if missao_ids:
                    session.execute(
                        delete(AuditoriaEventoORM).where(
                            AuditoriaEventoORM.missao_id.in_(missao_ids)
                        )
                    )
                    session.execute(
                        delete(MissaoContextoORM).where(
                            MissaoContextoORM.missao_id.in_(missao_ids)
                        )
                    )
                    session.execute(
                        delete(MissaoORM).where(MissaoORM.missao_id.in_(missao_ids))
                    )
                session.execute(
                    update(MissaoContextoORM)
                    .where(MissaoContextoORM.operacao_id == operacao_id)
                    .values(operacao_id=None, operacao_dia=None)
                )
                session.delete(operacao)
        except ErroRepositorio:
            raise
        except SQLAlchemyError as erro:
            raise EscritaRepositorioError(
                "Erro ao remover operação no banco de dados."
            ) from erro

    def listar_missoes_por_operacao(self, operacao_id: int) -> list[Missao]:
        try:
            with self._session() as session:
                linhas = session.execute(
                    self._select_missoes_com_contexto()
                    .where(MissaoContextoORM.operacao_id == operacao_id)
                    .order_by(MissaoORM.prazo.asc(), MissaoORM.missao_id.asc())
                ).all()
                return [
                    self._orm_para_missao(missao, contexto, operacao_nome)
                    for missao, contexto, operacao_nome in linhas
                ]
        except SQLAlchemyError as erro:
            raise LeituraRepositorioError(
                "Erro ao listar ordens da operação no banco de dados."
            ) from erro

    def buscar_missao_de_operacao_por_data(self, operacao_id: int, prazo) -> Missao | None:
        try:
            with self._session() as session:
                linha = session.execute(
                    self._select_missoes_com_contexto()
                    .where(
                        MissaoContextoORM.operacao_id == operacao_id,
                        or_(
                            MissaoContextoORM.operacao_dia == prazo,
                            MissaoORM.prazo == prazo,
                        ),
                    )
                    .limit(1)
                ).first()
                if linha is None:
                    return None
                missao, contexto, operacao_nome = linha
                return self._orm_para_missao(missao, contexto, operacao_nome)
        except SQLAlchemyError as erro:
            raise LeituraRepositorioError(
                "Erro ao buscar ordem de operação no banco de dados."
            ) from erro

    def criar_missao_de_operacao_se_ausente(
        self,
        missao: Missao,
        criada_por_id: int,
        responsavel_id: int,
        operacao_id: int,
        operacao_dia,
    ) -> Missao | None:
        try:
            with self._session() as session:
                existente = session.execute(
                    select(MissaoORM)
                    .join(
                        MissaoContextoORM,
                        MissaoContextoORM.missao_id == MissaoORM.missao_id,
                    )
                    .where(
                        MissaoContextoORM.operacao_id == operacao_id,
                        or_(
                            MissaoContextoORM.operacao_dia == operacao_dia,
                            MissaoORM.prazo == operacao_dia,
                        ),
                    )
                    .limit(1)
                ).scalar_one_or_none()
                if existente is not None:
                    return None

                orm = self._mission_orm(missao)
                session.add(orm)
                session.flush()
                session.add(
                    MissaoContextoORM(
                        missao_id=orm.missao_id,
                        criada_por_id=criada_por_id,
                        responsavel_id=responsavel_id,
                        operacao_id=operacao_id,
                        operacao_dia=operacao_dia,
                    )
                )
                missao.atualizar_missao_id(orm.missao_id)
                return missao
        except IntegrityError:
            return None
        except SQLAlchemyError as erro:
            raise EscritaRepositorioError(
                "Erro ao criar ordem de operação no banco de dados."
            ) from erro

    def criar_sonho(self, sonho: Sonho) -> None:
        try:
            with self._session() as session:
                orm = SonhoORM(
                    usuario_id=sonho.usuario_id,
                    titulo=sonho.titulo,
                    descricao=sonho.descricao,
                    tipo=sonho.tipo.value,
                    status=sonho.status.value,
                    justificativa_arquivamento=sonho.justificativa_arquivamento,
                    created_at=sonho.created_at,
                    updated_at=sonho.updated_at,
                    archived_at=sonho.archived_at,
                    concluded_at=sonho.concluded_at,
                )
                session.add(orm)
                session.flush()
                sonho.atualizar_sonho_id(orm.id)
        except SQLAlchemyError as erro:
            raise EscritaRepositorioError("Erro ao criar sonho no banco de dados.") from erro

    def atualizar_sonho(self, sonho: Sonho) -> None:
        try:
            with self._session() as session:
                orm = session.get(SonhoORM, sonho.sonho_id)
                if orm is None or orm.usuario_id != sonho.usuario_id:
                    raise EscritaRepositorioError(
                        f"Sonho {sonho.sonho_id} não encontrado para atualização."
                    )
                orm.titulo = sonho.titulo
                orm.descricao = sonho.descricao
                orm.tipo = sonho.tipo.value
                orm.status = sonho.status.value
                orm.justificativa_arquivamento = sonho.justificativa_arquivamento
                orm.updated_at = sonho.updated_at
                orm.archived_at = sonho.archived_at
                orm.concluded_at = sonho.concluded_at
        except ErroRepositorio:
            raise
        except SQLAlchemyError as erro:
            raise EscritaRepositorioError("Erro ao atualizar sonho no banco de dados.") from erro

    def promover_sonho_para_principal(self, usuario_id: int, sonho_id: int, instante) -> None:
        try:
            with self._session() as session:
                alvo = session.execute(
                    select(SonhoORM).where(
                        SonhoORM.id == sonho_id,
                        SonhoORM.usuario_id == usuario_id,
                        SonhoORM.status == "ativo",
                    )
                ).scalar_one_or_none()
                if alvo is None:
                    raise EscritaRepositorioError("Sonho não encontrado.")
                session.execute(
                    update(SonhoORM)
                    .where(
                        SonhoORM.usuario_id == usuario_id,
                        SonhoORM.status == "ativo",
                        SonhoORM.tipo == "principal",
                    )
                    .values(tipo="secundario", updated_at=instante)
                )
                alvo.tipo = "principal"
                alvo.updated_at = instante
        except ErroRepositorio:
            raise
        except SQLAlchemyError as erro:
            raise EscritaRepositorioError("Erro ao promover sonho no banco de dados.") from erro

    def buscar_sonho_por_id(self, sonho_id: int) -> Sonho | None:
        try:
            with self._session() as session:
                orm = session.get(SonhoORM, sonho_id)
                return None if orm is None else self._orm_para_sonho(orm)
        except SQLAlchemyError as erro:
            raise LeituraRepositorioError("Erro ao buscar sonho no banco de dados.") from erro

    def listar_sonhos_por_usuario(self, usuario_id: int) -> list[Sonho]:
        try:
            with self._session() as session:
                sonhos = session.execute(
                    select(SonhoORM)
                    .where(SonhoORM.usuario_id == usuario_id)
                    .order_by(
                        SonhoORM.status.asc(),
                        SonhoORM.tipo.asc(),
                        SonhoORM.updated_at.desc(),
                        SonhoORM.id.desc(),
                    )
                ).scalars()
                return [self._orm_para_sonho(sonho) for sonho in sonhos]
        except SQLAlchemyError as erro:
            raise LeituraRepositorioError("Erro ao listar sonhos no banco de dados.") from erro

    def contar_sonhos_ativos_por_usuario(self, usuario_id: int) -> dict:
        try:
            with self._session() as session:
                total, principal, secundario = session.execute(
                    select(
                        func.count(),
                        func.count().filter(SonhoORM.tipo == "principal"),
                        func.count().filter(SonhoORM.tipo == "secundario"),
                    ).where(
                        SonhoORM.usuario_id == usuario_id,
                        SonhoORM.status == "ativo",
                    )
                ).one()
                return {
                    "total": int(total),
                    "principal": int(principal),
                    "secundario": int(secundario),
                }
        except SQLAlchemyError as erro:
            raise LeituraRepositorioError("Erro ao contar sonhos no banco de dados.") from erro

    def criar_objetivo(self, objetivo: Objetivo) -> None:
        try:
            with self._session() as session:
                orm = ObjetivoORM(
                    usuario_id=objetivo.usuario_id,
                    sonho_id=objetivo.sonho_id,
                    titulo=objetivo.titulo,
                    descricao=objetivo.descricao,
                    data_alvo=objetivo.data_alvo,
                    progresso=objetivo.progresso,
                    status=objetivo.status.value,
                    order_index=objetivo.order_index,
                    created_at=objetivo.created_at,
                    updated_at=objetivo.updated_at,
                    concluded_at=objetivo.concluded_at,
                )
                session.add(orm)
                session.flush()
                objetivo.atualizar_objetivo_id(orm.id)
        except SQLAlchemyError as erro:
            raise EscritaRepositorioError("Erro ao criar objetivo no banco de dados.") from erro

    def atualizar_objetivo(self, objetivo: Objetivo) -> None:
        try:
            with self._session() as session:
                orm = session.get(ObjetivoORM, objetivo.objetivo_id)
                if orm is None or orm.usuario_id != objetivo.usuario_id:
                    raise EscritaRepositorioError(
                        f"Objetivo {objetivo.objetivo_id} não encontrado para atualização."
                    )
                orm.sonho_id = objetivo.sonho_id
                orm.titulo = objetivo.titulo
                orm.descricao = objetivo.descricao
                orm.data_alvo = objetivo.data_alvo
                orm.progresso = objetivo.progresso
                orm.status = objetivo.status.value
                orm.order_index = objetivo.order_index
                orm.updated_at = objetivo.updated_at
                orm.concluded_at = objetivo.concluded_at
        except ErroRepositorio:
            raise
        except SQLAlchemyError as erro:
            raise EscritaRepositorioError("Erro ao atualizar objetivo no banco de dados.") from erro

    def buscar_objetivo_por_id(self, objetivo_id: int) -> Objetivo | None:
        try:
            with self._session() as session:
                orm = session.get(ObjetivoORM, objetivo_id)
                return None if orm is None else self._orm_para_objetivo(orm)
        except SQLAlchemyError as erro:
            raise LeituraRepositorioError("Erro ao buscar objetivo no banco de dados.") from erro

    def listar_objetivos_por_usuario(self, usuario_id: int) -> list[Objetivo]:
        try:
            with self._session() as session:
                objetivos = session.execute(
                    select(ObjetivoORM)
                    .where(ObjetivoORM.usuario_id == usuario_id)
                    .order_by(
                        ObjetivoORM.order_index.asc(),
                        ObjetivoORM.created_at.asc(),
                        ObjetivoORM.id.asc(),
                    )
                ).scalars()
                return [self._orm_para_objetivo(objetivo) for objetivo in objetivos]
        except SQLAlchemyError as erro:
            raise LeituraRepositorioError("Erro ao listar objetivos no banco de dados.") from erro

    def proximo_order_index_objetivo(self, usuario_id: int, sonho_id: int | None) -> int:
        try:
            with self._session() as session:
                filtros = [ObjetivoORM.usuario_id == usuario_id]
                if sonho_id is None:
                    filtros.append(ObjetivoORM.sonho_id.is_(None))
                else:
                    filtros.append(ObjetivoORM.sonho_id == sonho_id)
                proximo = session.execute(
                    select(func.coalesce(func.max(ObjetivoORM.order_index), 0) + 1)
                    .where(*filtros)
                ).scalar_one()
                return int(proximo)
        except SQLAlchemyError as erro:
            raise LeituraRepositorioError("Erro ao calcular ordem do objetivo.") from erro

    def atualizar_ordem_objetivos(self, usuario_id: int, objetivo_ids: list[int]) -> None:
        try:
            with self._session() as session:
                for indice, objetivo_id in enumerate(objetivo_ids, start=1):
                    resultado = session.execute(
                        update(ObjetivoORM)
                        .where(
                            ObjetivoORM.id == objetivo_id,
                            ObjetivoORM.usuario_id == usuario_id,
                        )
                        .values(order_index=indice, updated_at=func.current_timestamp())
                    )
                    if resultado.rowcount == 0:
                        raise EscritaRepositorioError(
                            f"Objetivo {objetivo_id} não encontrado para reordenação."
                        )
        except ErroRepositorio:
            raise
        except SQLAlchemyError as erro:
            raise EscritaRepositorioError("Erro ao reordenar objetivos no banco de dados.") from erro

    def deletar_objetivo(self, objetivo_id: int, usuario_id: int) -> None:
        try:
            with self._session() as session:
                resultado = session.execute(
                    delete(ObjetivoORM).where(
                        ObjetivoORM.id == objetivo_id,
                        ObjetivoORM.usuario_id == usuario_id,
                    )
                )
                if resultado.rowcount == 0:
                    raise EscritaRepositorioError(
                        f"Objetivo {objetivo_id} não encontrado para remoção."
                    )
        except ErroRepositorio:
            raise
        except SQLAlchemyError as erro:
            raise EscritaRepositorioError("Erro ao remover objetivo no banco de dados.") from erro

    def registrar_auditoria(self, evento: EventoAuditoria) -> None:
        try:
            with self._session() as session:
                orm = AuditoriaEventoORM(
                    missao_id=evento.missao_id,
                    usuario_id=evento.usuario_id,
                    acao=evento.acao,
                    detalhes=evento.detalhes,
                    criado_em=evento.criado_em,
                )
                session.add(orm)
                session.flush()
                evento.evento_id = orm.evento_id
        except SQLAlchemyError as erro:
            raise EscritaRepositorioError(
                "Erro ao registrar auditoria no banco de dados."
            ) from erro

    def listar_auditoria_por_missao(self, missao_id: int) -> list[EventoAuditoria]:
        try:
            with self._session() as session:
                eventos = session.execute(
                    select(AuditoriaEventoORM)
                    .where(AuditoriaEventoORM.missao_id == missao_id)
                    .order_by(AuditoriaEventoORM.criado_em, AuditoriaEventoORM.evento_id)
                ).scalars()
                return [self._orm_para_evento(evento) for evento in eventos]
        except SQLAlchemyError as erro:
            raise LeituraRepositorioError(
                "Erro ao listar auditoria da missão no banco de dados."
            ) from erro

    def buscar_revisao_por_periodo(
        self,
        usuario_id: int,
        start_date,
        end_date,
    ) -> RevisaoSemanal | None:
        try:
            with self._session() as session:
                orm = session.execute(
                    select(RevisaoSemanalORM).where(
                        RevisaoSemanalORM.usuario_id == usuario_id,
                        RevisaoSemanalORM.start_date == start_date,
                        RevisaoSemanalORM.end_date == end_date,
                    )
                ).scalar_one_or_none()
                return None if orm is None else self._orm_para_revisao(orm)
        except SQLAlchemyError as erro:
            raise LeituraRepositorioError(
                "Erro ao buscar revisão semanal no banco de dados."
            ) from erro

    def listar_revisoes_semanais(self, usuario_id: int) -> list[RevisaoSemanal]:
        try:
            with self._session() as session:
                revisoes = session.execute(
                    select(RevisaoSemanalORM)
                    .where(RevisaoSemanalORM.usuario_id == usuario_id)
                    .order_by(
                        RevisaoSemanalORM.start_date.desc(),
                        RevisaoSemanalORM.revisao_id.desc(),
                    )
                ).scalars()
                return [self._orm_para_revisao(revisao) for revisao in revisoes]
        except SQLAlchemyError as erro:
            raise LeituraRepositorioError(
                "Erro ao listar revisões semanais no banco de dados."
            ) from erro

    def salvar_revisao_semanal(self, revisao: RevisaoSemanal) -> None:
        try:
            with self._session() as session:
                orm = session.execute(
                    select(RevisaoSemanalORM).where(
                        RevisaoSemanalORM.usuario_id == revisao.usuario_id,
                        RevisaoSemanalORM.start_date == revisao.start_date,
                        RevisaoSemanalORM.end_date == revisao.end_date,
                    )
                ).scalar_one_or_none()
                if orm is None:
                    orm = RevisaoSemanalORM(
                        usuario_id=revisao.usuario_id,
                        start_date=revisao.start_date,
                        end_date=revisao.end_date,
                    )
                    session.add(orm)
                orm.reviewed_at = revisao.reviewed_at
                orm.resumo_operacional = revisao.resumo_operacional
                orm.completed_missions = revisao.completed_missions
                orm.pending_missions = revisao.pending_missions
                orm.failed_missions = revisao.failed_missions
                orm.high_priority_missions = revisao.high_priority_missions
                orm.observacao = revisao.observacao
                session.flush()
                revisao.atualizar_revisao_id(orm.revisao_id)
        except SQLAlchemyError as erro:
            raise EscritaRepositorioError(
                "Erro ao salvar revisão semanal no banco de dados."
            ) from erro
