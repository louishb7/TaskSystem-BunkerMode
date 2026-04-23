import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from binascii import Error as BinasciiError
from typing import Any


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
    return os.getenv("BUNKERMODE_AUTH_SECRET", "bunkermode-dev-secret")


def generate_token(payload: dict[str, Any], expires_in: int = 3600) -> str:
    body = payload.copy()
    body["exp"] = int(time.time()) + expires_in
    encoded = base64.urlsafe_b64encode(
        json.dumps(body, separators=(",", ":")).encode("utf-8")
    ).decode("utf-8")
    signature = hmac.new(
        _get_secret().encode("utf-8"), encoded.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    return f"{encoded}.{signature}"


def decode_token(token: str) -> dict[str, Any]:
    try:
        encoded, signature = token.split(".", maxsplit=1)
    except ValueError as erro:
        raise ValueError("Token inválido.") from erro

    expected_signature = hmac.new(
        _get_secret().encode("utf-8"), encoded.encode("utf-8"), hashlib.sha256
    ).hexdigest()
    if not hmac.compare_digest(signature, expected_signature):
        raise ValueError("Token inválido.")

    try:
        payload = json.loads(
            base64.urlsafe_b64decode(encoded.encode("utf-8")).decode("utf-8")
        )
    except (BinasciiError, UnicodeDecodeError, json.JSONDecodeError) as erro:
        raise ValueError("Token inválido.") from erro

    if payload.get("exp", 0) < int(time.time()):
        raise ValueError("Token expirado.")
    return payload
