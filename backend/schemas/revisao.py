from pydantic import BaseModel


class LimparRelatorioFalhasPayload(BaseModel):
    start_date: str | None = None
    end_date: str | None = None


class FecharRevisaoPayload(BaseModel):
    observacao: str | None = None
