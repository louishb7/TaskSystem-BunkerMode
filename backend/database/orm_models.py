from datetime import date, datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Identity,
    Index,
    Integer,
    Text,
    UniqueConstraint,
    VARCHAR,
    text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class UsuarioORM(Base):
    __tablename__ = "usuarios"

    usuario_id: Mapped[int] = mapped_column(
        Integer,
        Identity(
            always=True,
            start=1,
            increment=1,
            minvalue=1,
            maxvalue=2147483647,
            cycle=False,
            cache=1,
        ),
        primary_key=True,
    )
    usuario: Mapped[str] = mapped_column(Text, nullable=False)
    email: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    senha_hash: Mapped[str] = mapped_column(Text, nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    nome_general: Mapped[str | None] = mapped_column(Text, nullable=True)
    active_mode: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        server_default=text("'general'"),
    )
    planning_window: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        server_default=text("'night'"),
    )
    timezone: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        server_default=text("'America/Recife'"),
    )
    emergency_unlock_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    timezone_updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )


class SonhoORM(Base):
    __tablename__ = "sonhos"
    __table_args__ = (
        CheckConstraint(
            "tipo IN ('principal', 'secundario')",
            name="sonhos_tipo_check",
        ),
        CheckConstraint(
            "status IN ('ativo', 'arquivado', 'concluido')",
            name="sonhos_status_check",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        Identity(
            always=True,
            start=1,
            increment=1,
            minvalue=1,
            maxvalue=2147483647,
            cycle=False,
            cache=1,
        ),
        primary_key=True,
    )
    usuario_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("usuarios.usuario_id", ondelete="CASCADE"),
        nullable=False,
    )
    titulo: Mapped[str] = mapped_column(VARCHAR(200), nullable=False)
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    tipo: Mapped[str] = mapped_column(VARCHAR(20), nullable=False)
    status: Mapped[str] = mapped_column(
        VARCHAR(20),
        nullable=False,
        server_default=text("'ativo'"),
    )
    justificativa_arquivamento: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )
    archived_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    concluded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class ObjetivoORM(Base):
    __tablename__ = "objetivos"
    __table_args__ = (
        CheckConstraint(
            "progresso >= 0 AND progresso <= 100",
            name="objetivos_progresso_check",
        ),
        CheckConstraint(
            "status IN ('ativo', 'concluido', 'pausado', 'abandonado')",
            name="objetivos_status_check",
        ),
    )

    id: Mapped[int] = mapped_column(
        Integer,
        Identity(
            always=True,
            start=1,
            increment=1,
            minvalue=1,
            maxvalue=2147483647,
            cycle=False,
            cache=1,
        ),
        primary_key=True,
    )
    usuario_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("usuarios.usuario_id", ondelete="CASCADE"),
        nullable=False,
    )
    sonho_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("sonhos.id", ondelete="SET NULL"),
        nullable=True,
    )
    titulo: Mapped[str] = mapped_column(VARCHAR(200), nullable=False)
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    data_alvo: Mapped[date | None] = mapped_column(Date, nullable=True)
    progresso: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    status: Mapped[str] = mapped_column(
        VARCHAR(20),
        nullable=False,
        server_default=text("'ativo'"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )
    concluded_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    order_index: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))


class MissaoORM(Base):
    __tablename__ = "missoes"
    __table_args__ = (
        Index(
            "idx_missoes_prazo",
            "prazo",
            postgresql_where=text("prazo IS NOT NULL"),
        ),
    )

    missao_id: Mapped[int] = mapped_column(
        Integer,
        Identity(
            always=True,
            start=1,
            increment=1,
            minvalue=1,
            maxvalue=2147483647,
            cycle=False,
            cache=1,
        ),
        primary_key=True,
    )
    titulo: Mapped[str] = mapped_column(Text, nullable=False)
    prioridade: Mapped[int] = mapped_column(Integer, nullable=False)
    prazo: Mapped[date | None] = mapped_column(Date, nullable=True)
    instrucao: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(Text, nullable=False)
    is_pinned: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    failed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    failure_reason_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    failure_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    soldier_excuse: Mapped[str | None] = mapped_column(Text, nullable=True)
    general_verdict: Mapped[str | None] = mapped_column(Text, nullable=True)
    recurrence_weekdays: Mapped[str | None] = mapped_column(Text, nullable=True)
    recurrence_end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    duration_type: Mapped[str | None] = mapped_column(Text, nullable=True)
    objetivo_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("objetivos.id", ondelete="SET NULL"),
        nullable=True,
    )
    sonho_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("sonhos.id", ondelete="SET NULL"),
        nullable=True,
    )


class OperacaoORM(Base):
    __tablename__ = "operacoes"

    operacao_id: Mapped[int] = mapped_column(
        Integer,
        Identity(
            always=True,
            start=1,
            increment=1,
            minvalue=1,
            maxvalue=2147483647,
            cycle=False,
            cache=1,
        ),
        primary_key=True,
    )
    usuario_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("usuarios.usuario_id", ondelete="CASCADE"),
        nullable=False,
    )
    nome: Mapped[str] = mapped_column(Text, nullable=False)
    descricao: Mapped[str | None] = mapped_column(Text, nullable=True)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    weekdays: Mapped[str] = mapped_column(Text, nullable=False)
    ordem_titulo: Mapped[str] = mapped_column(Text, nullable=False)
    ordem_instrucao: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_pinned: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    status: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        server_default=text("'ativa'"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )


class MissaoContextoORM(Base):
    __tablename__ = "missao_contextos"
    __table_args__ = (
        Index(
            "idx_missao_contextos_responsavel_id",
            "responsavel_id",
            postgresql_where=text("responsavel_id IS NOT NULL"),
        ),
        Index(
            "idx_missao_contextos_operacao_dia",
            "operacao_id",
            "operacao_dia",
            unique=True,
            postgresql_where=text("operacao_id IS NOT NULL AND operacao_dia IS NOT NULL"),
        ),
    )

    missao_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    criada_por_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("usuarios.usuario_id", ondelete="SET NULL"),
        nullable=True,
    )
    responsavel_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("usuarios.usuario_id", ondelete="SET NULL"),
        nullable=True,
    )
    operacao_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("operacoes.operacao_id", ondelete="SET NULL"),
        nullable=True,
    )
    operacao_dia: Mapped[date | None] = mapped_column(Date, nullable=True)


class AuditoriaEventoORM(Base):
    __tablename__ = "auditoria_eventos"

    evento_id: Mapped[int] = mapped_column(
        Integer,
        Identity(
            always=True,
            start=1,
            increment=1,
            minvalue=1,
            maxvalue=2147483647,
            cycle=False,
            cache=1,
        ),
        primary_key=True,
    )
    missao_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    usuario_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("usuarios.usuario_id", ondelete="SET NULL"),
        nullable=True,
    )
    acao: Mapped[str] = mapped_column(Text, nullable=False)
    detalhes: Mapped[str] = mapped_column(Text, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )


class RevisaoSemanalORM(Base):
    __tablename__ = "revisoes_semanais"
    __table_args__ = (
        UniqueConstraint("usuario_id", "start_date", "end_date"),
    )

    revisao_id: Mapped[int] = mapped_column(
        Integer,
        Identity(
            always=True,
            start=1,
            increment=1,
            minvalue=1,
            maxvalue=2147483647,
            cycle=False,
            cache=1,
        ),
        primary_key=True,
    )
    usuario_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("usuarios.usuario_id", ondelete="CASCADE"),
        nullable=False,
    )
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    reviewed_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )
    resumo_operacional: Mapped[str] = mapped_column(Text, nullable=False)
    completed_missions: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )
    pending_missions: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )
    failed_missions: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )
    high_priority_missions: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )
    observacao: Mapped[str | None] = mapped_column(Text, nullable=True)
