from pydantic import BaseModel, Field, ConfigDict

from missao import Missao


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


class MensagemResponse(BaseModel):
    mensagem: str


class ErroResponse(BaseModel):
    detail: str
