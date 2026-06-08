import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    if not isinstance(password, str) or len(password) < 6:
        raise ValueError("Senha deve ter pelo menos 6 caracteres.")
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000
    ).hex()
    return f"{salt}${digest}"


def verify_password(password: str, password_hash: str) -> bool:
    try:
        salt, digest = password_hash.split("$", maxsplit=1)
    except ValueError:
        return False
    current = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000
    ).hex()
    return hmac.compare_digest(current, digest)


def _get_secret() -> str:
    secret = os.getenv("BUNKERMODE_AUTH_SECRET", "").strip()
    if not secret:
        raise RuntimeError("Defina BUNKERMODE_AUTH_SECRET antes de executar o BunkerMode.")
    return secret


def validate_auth_secret_configured() -> None:
    _get_secret()


def generate_token(payload: dict[str, Any], expires_in: int = 3600) -> str:
    body = payload.copy()
    body["exp"] = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
    return jwt.encode(body, _get_secret(), algorithm=ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(
            token,
            _get_secret(),
            algorithms=[ALGORITHM],
            options={"verify_sub": False},
        )
    except jwt.ExpiredSignatureError as erro:
        raise ValueError("Token expirado.") from erro
    except jwt.InvalidTokenError as erro:
        raise ValueError("Token inválido.") from erro
