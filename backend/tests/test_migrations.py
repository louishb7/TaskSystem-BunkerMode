from pathlib import Path


MIGRATION_PATH = (
    Path(__file__).resolve().parents[1]
    / "migrations"
    / "20260520_montanha_fase_1.sql"
)


def test_migration_montanha_inclui_dependencias_de_leitura_de_missoes():
    sql = MIGRATION_PATH.read_text()

    trechos_obrigatorios = [
        "ADD COLUMN IF NOT EXISTS is_pinned",
        "ADD COLUMN IF NOT EXISTS objetivo_id",
        "ADD COLUMN IF NOT EXISTS sonho_id",
        "ADD COLUMN IF NOT EXISTS recurrence_weekdays",
        "ADD COLUMN IF NOT EXISTS recurrence_end_date",
        "ADD COLUMN IF NOT EXISTS duration_type",
        "CREATE TABLE IF NOT EXISTS operacoes",
        "CREATE TABLE IF NOT EXISTS missao_contextos",
        "ADD COLUMN IF NOT EXISTS operacao_id",
        "ADD COLUMN IF NOT EXISTS operacao_dia",
        "idx_missao_contextos_responsavel_id",
    ]

    for trecho in trechos_obrigatorios:
        assert trecho in sql
