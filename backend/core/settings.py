import os
from pathlib import Path


class ConfiguracaoBancoError(ValueError):
    """Erro levantado quando a configuração do banco está incompleta."""


def is_production_environment() -> bool:
    # Centraliza a leitura porque produção muda validações de boot e defaults seguros.
    environment = (
        os.getenv("BUNKERMODE_ENV")
        or os.getenv("ENV")
        or os.getenv("PYTHON_ENV")
        or ""
    ).strip().lower()
    return environment in {"production", "prod"}


def carregar_env_local(caminho: str = ".env") -> None:
    """Carrega variáveis simples de .env sem sobrescrever o ambiente."""
    arquivo_env = Path(caminho)
    if not arquivo_env.exists():
        return

    for linha in arquivo_env.read_text().splitlines():
        linha = linha.strip()
        if not linha or linha.startswith("#") or "=" not in linha:
            continue

        chave, valor = linha.split("=", maxsplit=1)
        os.environ.setdefault(chave.strip(), valor.strip().strip("\"'"))


def validate_database_config_for_runtime() -> None:
    # Falha no boot em produção para evitar erro tardio na primeira request.
    if not is_production_environment():
        return

    database_url = os.getenv("BUNKERMODE_DB_URL", "").strip()
    host = os.getenv("BUNKERMODE_DB_HOST", "localhost").strip()
    if not database_url and host in {"", "localhost"}:
        raise RuntimeError(
            "Em produção, defina BUNKERMODE_DB_URL com a URL completa do banco. "
            "localhost não é válido."
        )


def get_connection_string():
    """Monta a string de conexão do PostgreSQL a partir de variáveis de ambiente."""
    carregar_env_local()

    database_url = os.getenv("BUNKERMODE_DB_URL")
    if database_url:
        return database_url

    dbname = os.getenv("BUNKERMODE_DB_NAME", "bunkermode")
    user = os.getenv("BUNKERMODE_DB_USER", "henrique")
    password = os.getenv("BUNKERMODE_DB_PASSWORD")
    host = os.getenv("BUNKERMODE_DB_HOST", "localhost")
    port = os.getenv("BUNKERMODE_DB_PORT", "5432")

    if not password:
        raise ConfiguracaoBancoError(
            "Defina a variável de ambiente BUNKERMODE_DB_PASSWORD antes de executar o sistema."
        )

    return (
        f"dbname={dbname} "
        f"user={user} "
        f"password={password} "
        f"host={host} "
        f"port={port}"
    )
