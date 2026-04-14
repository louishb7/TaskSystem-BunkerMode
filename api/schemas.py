from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from auditoria import EventoAuditoria
from missao import Missao
from usuario import Usuario


class MissaoCreate(BaseModel):
    titulo: str = Field(..., examples=["Estudar FastAPI"])
    prioridade: int = Field(..., examples=[1])
    prazo: str | None = Field(default=None, examples=["20-04-2026"])
    instrucao: str = Field(..., examples=["Revisar response models"])


class MissaoUpdate(BaseModel):
    titulo: str | None = Field(default=None, examples=["Estudar testes HTTP"])
    prioridade: int | None = Field(default=None, examples=[2])
    prazo: str | None = Field(default=None, examples=["21-04-2026"])
    instrucao: str | None = Field(default=None, examples=["Criar TestClient"])


class MissaoV2Create(MissaoCreate):
    responsavel_id: int | None = Field(default=None, examples=[2])


class MissaoV2Update(MissaoUpdate):
    responsavel_id: int | None = Field(default=None, examples=[2])


class MissaoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    titulo: str
    prioridade: int
    prazo: str | None
    instrucao: str
    status: str

    @classmethod
    def from_entity(cls, missao: Missao) -> "MissaoResponse":
        return cls(
            id=missao.missao_id,
            titulo=missao.titulo,
            prioridade=missao.prioridade.value,
            prazo=missao.prazo,
            instrucao=missao.instrucao,
            status=missao.status.value,
        )


class UsuarioCreate(BaseModel):
    username: str = Field(..., examples=["general"])
    nome: str = Field(..., examples=["Comandante"])
    papel: str = Field(..., examples=["general"])
    senha: str = Field(..., min_length=6, examples=["segredo123"])


class LoginRequest(BaseModel):
    username: str
    senha: str


class UsuarioResponse(BaseModel):
    id: int
    username: str
    nome: str
    papel: str
    ativo: bool

    @classmethod
    def from_entity(cls, usuario: Usuario) -> "UsuarioResponse":
        return cls(
            id=usuario.usuario_id,
            username=usuario.username,
            nome=usuario.nome,
            papel=usuario.papel.value,
            ativo=usuario.ativo,
        )


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    usuario: UsuarioResponse


class AuditoriaResponse(BaseModel):
    id: int | None
    missao_id: int | None
    usuario_id: int | None
    acao: str
    detalhes: str
    criado_em: datetime

    @classmethod
    def from_entity(cls, evento: EventoAuditoria) -> "AuditoriaResponse":
        return cls(
            id=evento.evento_id,
            missao_id=evento.missao_id,
            usuario_id=evento.usuario_id,
            acao=evento.acao,
            detalhes=evento.detalhes,
            criado_em=evento.criado_em,
        )


class MensagemResponse(BaseModel):
    mensagem: str


class ErroResponse(BaseModel):
    detail: str
