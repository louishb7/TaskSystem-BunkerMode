from pydantic import BaseModel, Field


class OperacaoCreatePayload(BaseModel):
    nome: str = Field(min_length=1)
    descricao: str | None = None
    start_date: str = Field(min_length=1)
    end_date: str = Field(min_length=1)
    weekdays: list[int] = Field(min_length=1)
    ordem_titulo: str = Field(min_length=1)
    ordem_instrucao: str | None = None


class OperacaoMaterializarPayload(BaseModel):
    start_date: str = Field(min_length=1)
    end_date: str = Field(min_length=1)
