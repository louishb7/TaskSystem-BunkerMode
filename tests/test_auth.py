import hashlib
import hmac
from datetime import date, datetime, timezone

import pytest

from auth import decode_token, generate_token, hash_password
from services.auth_service import AuthService
from services.exceptions import AutenticacaoError, PermissaoNegadaError
from usuario import Usuario


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


class RepositorioAuthFake:
    def __init__(self, usuario=None):
        self.usuario = usuario or Usuario(
            usuario_id=1,
            usuario="Henrique",
            email="henrique@email.com",
            senha_hash=hash_password("segredo123"),
        )

    def buscar_usuario_por_email(self, email):
        if self.usuario.email == email.strip().lower():
            return self.usuario
        return None

    def buscar_usuario_por_id(self, usuario_id):
        if self.usuario.usuario_id == usuario_id:
            return self.usuario
        return None

    def adicionar_usuario(self, usuario):
        usuario.usuario_id = 1
        self.usuario = usuario

    def atualizar_modo_ativo(self, usuario_id, active_mode):
        self.usuario.definir_modo(active_mode)

    def atualizar_turno_planejamento(self, usuario_id, planning_window):
        self.usuario.definir_turno_planejamento(planning_window)

    def atualizar_timezone(self, usuario_id, timezone_name):
        self.usuario.definir_timezone(timezone_name)

    def registrar_uso_emergencia_general(self, usuario_id, local_date):
        self.usuario.registrar_uso_emergencia_general(local_date)


def service_em(agora_utc, usuario=None):
    return AuthService(
        RepositorioAuthFake(usuario),
        now_provider=lambda: agora_utc,
    )


@pytest.mark.parametrize(
    ("turno", "hora", "esperado"),
    [
        ("morning", "05:00:00", True),
        ("morning", "10:59:00", True),
        ("morning", "11:00:00", False),
        ("afternoon", "12:00:00", True),
        ("afternoon", "17:59:00", True),
        ("afternoon", "18:00:00", False),
        ("night", "21:00:00", True),
        ("night", "23:30:00", True),
        ("night", "00:30:00", True),
        ("night", "02:59:00", True),
        ("night", "03:00:00", False),
        ("night", "12:00:00", False),
    ],
)
def test_turno_planejamento_valida_janelas_inclusive_madrugada(turno, hora, esperado):
    service = AuthService(RepositorioAuthFake())
    local_time = datetime.fromisoformat(f"2026-04-24T{hora}").time()

    assert service._dentro_do_turno(turno, local_time) is esperado


def test_unlock_emergencial_usa_data_local_do_timezone_do_usuario():
    recife = Usuario(
        usuario_id=1,
        usuario="Recife",
        email="recife@email.com",
        senha_hash=hash_password("segredo123"),
        planning_window="morning",
        timezone="America/Recife",
        active_mode="soldier",
    )
    lisboa = Usuario(
        usuario_id=1,
        usuario="Lisboa",
        email="lisboa@email.com",
        senha_hash=hash_password("segredo123"),
        planning_window="morning",
        timezone="Europe/Lisbon",
        active_mode="soldier",
    )
    agora_utc = datetime(2026, 4, 25, 2, 30, tzinfo=timezone.utc)

    service_em(agora_utc, recife).liberar_general(1, "segredo123")
    service_em(agora_utc, lisboa).liberar_general(1, "segredo123")

    assert recife.emergency_unlock_date == date(2026, 4, 24)
    assert lisboa.emergency_unlock_date == date(2026, 4, 25)


def test_unlock_emergencial_permite_um_uso_por_dia_local():
    usuario = Usuario(
        usuario_id=1,
        usuario="Henrique",
        email="henrique@email.com",
        senha_hash=hash_password("segredo123"),
        planning_window="morning",
        timezone="America/Recife",
        active_mode="soldier",
    )

    service_em(datetime(2026, 4, 24, 15, 0, tzinfo=timezone.utc), usuario).liberar_general(
        1,
        "segredo123",
    )
    assert usuario.active_mode == "general"
    assert usuario.emergency_unlock_date == date(2026, 4, 24)

    usuario.definir_modo("soldier")
    with pytest.raises(PermissaoNegadaError, match="passe de emergência"):
        service_em(
            datetime(2026, 4, 24, 16, 0, tzinfo=timezone.utc),
            usuario,
        ).liberar_general(1, "segredo123")

    service_em(datetime(2026, 4, 25, 15, 0, tzinfo=timezone.utc), usuario).liberar_general(
        1,
        "segredo123",
    )
    assert usuario.emergency_unlock_date == date(2026, 4, 25)


def test_unlock_dentro_do_turno_nao_consume_emergencia():
    usuario = Usuario(
        usuario_id=1,
        usuario="Henrique",
        email="henrique@email.com",
        senha_hash=hash_password("segredo123"),
        planning_window="morning",
        timezone="America/Recife",
        active_mode="soldier",
    )

    service_em(datetime(2026, 4, 24, 12, 0, tzinfo=timezone.utc), usuario).liberar_general(
        1,
        "segredo123",
    )

    assert usuario.active_mode == "general"
    assert usuario.emergency_unlock_date is None


def test_unlock_valida_senha_antes_de_consumir_emergencia():
    usuario = Usuario(
        usuario_id=1,
        usuario="Henrique",
        email="henrique@email.com",
        senha_hash=hash_password("segredo123"),
        planning_window="morning",
        timezone="America/Recife",
        active_mode="soldier",
    )

    with pytest.raises(AutenticacaoError):
        service_em(datetime(2026, 4, 24, 15, 0, tzinfo=timezone.utc), usuario).liberar_general(
            1,
            "senha-errada",
        )

    assert usuario.emergency_unlock_date is None


def test_configuracao_de_turno_e_timezone_respeita_modo_general():
    usuario = Usuario(
        usuario_id=1,
        usuario="Henrique",
        email="henrique@email.com",
        senha_hash=hash_password("segredo123"),
        active_mode="soldier",
    )
    service = AuthService(RepositorioAuthFake(usuario))

    with pytest.raises(PermissaoNegadaError):
        service.alterar_turno_planejamento(1, "morning")
    with pytest.raises(PermissaoNegadaError):
        service.alterar_timezone(1, "Europe/Lisbon")

    usuario.definir_modo("general")
    service.alterar_turno_planejamento(1, "afternoon")
    service.alterar_timezone(1, "Europe/Lisbon")

    assert usuario.planning_window == "afternoon"
    assert usuario.timezone == "Europe/Lisbon"


def test_timezone_invalido_falha_claramente():
    usuario = Usuario(
        usuario_id=1,
        usuario="Henrique",
        email="henrique@email.com",
        senha_hash=hash_password("segredo123"),
        active_mode="general",
    )
    service = AuthService(RepositorioAuthFake(usuario))

    with pytest.raises(ValueError, match="Timezone inválido."):
        service.alterar_timezone(1, "Nao/Existe")
