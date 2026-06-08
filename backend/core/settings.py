from pydantic_settings import BaseSettings, SettingsConfigDict


class ConfiguracaoBancoError(ValueError):
    """Erro levantado quando a configuração do banco está incompleta."""


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    bunkermode_env: str = ""
    bunkermode_auth_secret: str = ""
    bunkermode_db_url: str = ""
    bunkermode_db_host: str = "localhost"
    bunkermode_db_port: int = 5432
    bunkermode_db_name: str = "bunkermode"
    bunkermode_db_user: str = ""
    bunkermode_db_password: str = ""
    bunkermode_cors_allow_origins: str = ""
    bunkermode_api_host: str = "0.0.0.0"
    bunkermode_api_port: int = 8000
    bunkermode_api_reload: bool = False

    def is_production(self) -> bool:
        return self.bunkermode_env.strip().lower() in {"production", "prod"}

    def get_connection_string(self) -> str:
        if self.bunkermode_db_url:
            return self.bunkermode_db_url

        if not self.bunkermode_db_password:
            raise ConfiguracaoBancoError(
                "Defina BUNKERMODE_DB_PASSWORD ou BUNKERMODE_DB_URL antes de executar."
            )

        return (
            f"postgresql+psycopg://{self.bunkermode_db_user}:{self.bunkermode_db_password}"
            f"@{self.bunkermode_db_host}:{self.bunkermode_db_port}/{self.bunkermode_db_name}"
        )

    def validate_for_production(self) -> None:
        if not self.is_production():
            return

        if not self.bunkermode_db_url and self.bunkermode_db_host in {"", "localhost"}:
            raise RuntimeError(
                "Em produção, defina BUNKERMODE_DB_URL. localhost não é válido."
            )


settings = Settings()


def get_connection_string() -> str:
    return settings.get_connection_string()


def is_production_environment() -> bool:
    return settings.is_production()


def validate_database_config_for_runtime() -> None:
    settings.validate_for_production()
