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
        "ADD COLUMN IF NOT EXISTS planning_window",
        "ADD COLUMN IF NOT EXISTS timezone",
        "DROP COLUMN IF EXISTS is_decided",
        "SET failure_reason = soldier_excuse",
        "ADD COLUMN IF NOT EXISTS objetivo_id",
        "ADD COLUMN IF NOT EXISTS sonho_id",
        "ADD COLUMN IF NOT EXISTS recurrence_weekdays",
        "ADD COLUMN IF NOT EXISTS recurrence_end_date",
        "ADD COLUMN IF NOT EXISTS duration_type",
        "CREATE TABLE IF NOT EXISTS operacoes",
        "CREATE TABLE IF NOT EXISTS missao_contextos",
        "ADD COLUMN IF NOT EXISTS operacao_id",
        "ADD COLUMN IF NOT EXISTS operacao_dia",
        "CREATE TABLE IF NOT EXISTS auditoria_eventos",
        "CREATE TABLE IF NOT EXISTS revisoes_semanais",
        "DROP TABLE IF EXISTS operational_day_overrides",
        "idx_missao_contextos_responsavel_id",
    ]

    for trecho in trechos_obrigatorios:
        assert trecho in sql


def test_migration_montanha_cria_usuarios_antes_de_tabelas_dependentes():
    sql = MIGRATION_PATH.read_text()

    assert sql.index("CREATE TABLE IF NOT EXISTS usuarios") < sql.index(
        "CREATE TABLE IF NOT EXISTS sonhos"
    )
