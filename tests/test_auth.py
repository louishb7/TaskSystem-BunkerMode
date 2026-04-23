import hashlib
import hmac

import pytest

from auth import decode_token, generate_token


def assinar_payload(payload: str, secret: str = "segredo-de-teste") -> str:
    return hmac.new(
        secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def test_decode_token_rejeita_token_malformado_com_value_error():
    with pytest.raises(ValueError, match="Token inválido."):
        decode_token("token.malformado")


def test_decode_token_rejeita_payload_json_invalido(monkeypatch):
    monkeypatch.setenv("BUNKERMODE_AUTH_SECRET", "segredo-de-teste")
    payload_invalido = "bmFvLWpzb24="
    assinatura = assinar_payload(payload_invalido)

    with pytest.raises(ValueError, match="Token inválido."):
        decode_token(f"{payload_invalido}.{assinatura}")


def test_decode_token_rejeita_assinatura_invalida():
    token = generate_token({"sub": 1})
    payload, _assinatura = token.split(".", maxsplit=1)

    with pytest.raises(ValueError, match="Token inválido."):
        decode_token(f"{payload}.assinatura-invalida")
