import os


class ConfiguracaoBancoError(ValueError):
    """Erro levantado quando a configuração do banco está incompleta."""


def get_connection_string():
    """Monta a string de conexão do PostgreSQL a partir de variáveis de ambiente."""
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
