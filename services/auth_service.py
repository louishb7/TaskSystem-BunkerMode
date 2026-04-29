from datetime import datetime, time, timedelta, timezone as utc_timezone
from zoneinfo import ZoneInfo

from auth import decode_token, generate_token, hash_password, verify_password
from services.exceptions import (
    AutenticacaoError,
    PermissaoNegadaError,
    UsuarioJaExisteError,
    UsuarioNaoEncontrado,
)
from usuario import Usuario


class AuthService:
    """Gerencia cadastro e autenticação de usuários."""

    TIMEZONE_CHANGE_COOLDOWN = timedelta(days=30)
    # Suspensão temporária para a fase de testes: o retorno ao General
    # não deve ser bloqueado por horário enquanto a alternância mobile é validada.
    # Reative quando o fluxo estiver estável e a janela de planejamento voltar a valer.
    GENERAL_UNLOCK_WINDOW_ENFORCEMENT_ENABLED = False

    PLANNING_WINDOWS = {
        "morning": (time(5, 0), time(10, 59, 59)),
        "afternoon": (time(12, 0), time(17, 59, 59)),
        "night": (time(21, 0), time(2, 59, 59)),
    }

    def __init__(self, repositorio, now_provider=None):
        self.repositorio = repositorio
        self.now_provider = now_provider or self._utc_now

    def registrar_usuario(self, dados: dict) -> Usuario:
        existente = self.repositorio.buscar_usuario_por_email(dados["email"])
        if existente is not None:
            raise UsuarioJaExisteError("E-mail já está em uso.")

        usuario = Usuario(
            usuario=dados["usuario"],
            email=dados["email"],
            senha_hash=hash_password(dados["senha"]),
        )
        self.repositorio.adicionar_usuario(usuario)
        return usuario

    def autenticar(self, email: str, senha: str) -> dict:
        usuario = self.repositorio.buscar_usuario_por_email(email)
        if usuario is None or not verify_password(senha, usuario.senha_hash):
            raise AutenticacaoError("Credenciais inválidas.")
        if not usuario.ativo:
            raise AutenticacaoError("Usuário inativo.")

        token = generate_token({"sub": usuario.usuario_id, "email": usuario.email})
        return {"access_token": token, "token_type": "bearer", "usuario": usuario}

    def obter_usuario_por_token(self, token: str) -> Usuario:
        payload = decode_token(token)
        usuario = self.repositorio.buscar_usuario_por_id(payload["sub"])
        if usuario is None:
            raise UsuarioNaoEncontrado("Usuário autenticado não encontrado.")
        return usuario

    def definir_nome_general(self, usuario_id: int, nome_general: str) -> Usuario:
        usuario = self.repositorio.buscar_usuario_por_id(usuario_id)
        if usuario is None:
            raise UsuarioNaoEncontrado("Usuário autenticado não encontrado.")
        if usuario.active_mode != "general":
            raise PermissaoNegadaError(
                "Identidade do General só pode ser alterada no modo General."
            )

        usuario.definir_nome_general(nome_general)
        self.repositorio.atualizar_nome_general(usuario.usuario_id, usuario.nome_general)
        return usuario

    def alterar_modo(self, usuario_id: int, modo: str) -> Usuario:
        if str(modo).strip().lower() != "soldier":
            raise ValueError("Este endpoint aceita apenas a ativação do modo Soldado.")
        usuario = self.repositorio.buscar_usuario_por_id(usuario_id)
        if usuario is None:
            raise UsuarioNaoEncontrado("Usuário autenticado não encontrado.")

        usuario.definir_modo(modo)
        self.repositorio.atualizar_modo_ativo(usuario.usuario_id, usuario.active_mode)
        return usuario

    def liberar_general(self, usuario_id: int, senha: str) -> Usuario:
        usuario = self.repositorio.buscar_usuario_por_id(usuario_id)
        if usuario is None:
            raise UsuarioNaoEncontrado("Usuário autenticado não encontrado.")
        if not verify_password(senha, usuario.senha_hash):
            raise AutenticacaoError("Senha incorreta.")

        if self.GENERAL_UNLOCK_WINDOW_ENFORCEMENT_ENABLED:
            agora_local = self._agora_no_timezone_usuario(usuario)
            data_local = agora_local.date()
            if not self._dentro_do_turno(usuario.planning_window, agora_local.time()):
                if usuario.emergency_unlock_date == data_local:
                    raise PermissaoNegadaError(
                        "General fora do posto e passe de emergência já utilizado hoje."
                    )
                usuario.registrar_uso_emergencia_general(data_local)
                self.repositorio.registrar_uso_emergencia_general(
                    usuario.usuario_id,
                    usuario.emergency_unlock_date,
                )

        usuario.definir_modo("general")
        self.repositorio.atualizar_modo_ativo(usuario.usuario_id, usuario.active_mode)
        return usuario

    def alterar_turno_planejamento(self, usuario_id: int, planning_window: str) -> Usuario:
        usuario = self.repositorio.buscar_usuario_por_id(usuario_id)
        if usuario is None:
            raise UsuarioNaoEncontrado("Usuário autenticado não encontrado.")
        if usuario.active_mode != "general":
            raise PermissaoNegadaError(
                "Turno de planejamento só pode ser alterado no modo General."
            )

        agora_local = self._agora_no_timezone_usuario(usuario)
        if not self._dentro_do_turno(usuario.planning_window, agora_local.time()):
            raise PermissaoNegadaError(
                "Turno de planejamento só pode ser alterado dentro do turno atual."
            )

        usuario.definir_turno_planejamento(planning_window)
        self.repositorio.atualizar_turno_planejamento(
            usuario.usuario_id,
            usuario.planning_window,
        )
        return usuario

    def alterar_timezone(self, usuario_id: int, timezone: str) -> Usuario:
        usuario = self.repositorio.buscar_usuario_por_id(usuario_id)
        if usuario is None:
            raise UsuarioNaoEncontrado("Usuário autenticado não encontrado.")
        if usuario.active_mode != "general":
            raise PermissaoNegadaError("Fuso horário só pode ser alterado no modo General.")

        timezone_validado = usuario._validar_timezone(timezone)
        agora_utc = self._agora_utc()
        if (
            usuario.timezone_updated_at is not None
            and agora_utc - usuario.timezone_updated_at < self.TIMEZONE_CHANGE_COOLDOWN
        ):
            raise PermissaoNegadaError(
                "Fuso horário só pode ser alterado uma vez a cada 30 dias."
            )

        usuario.timezone = timezone_validado
        usuario.registrar_alteracao_timezone(agora_utc)
        self.repositorio.atualizar_timezone(
            usuario.usuario_id,
            usuario.timezone,
            usuario.timezone_updated_at,
        )
        return usuario

    def _utc_now(self) -> datetime:
        return datetime.now(utc_timezone.utc)

    def _agora_utc(self) -> datetime:
        agora = self.now_provider()
        if agora.tzinfo is None:
            agora = agora.replace(tzinfo=utc_timezone.utc)
        return agora.astimezone(utc_timezone.utc)

    def _agora_no_timezone_usuario(self, usuario: Usuario) -> datetime:
        return self._agora_utc().astimezone(ZoneInfo(usuario.timezone))

    def _dentro_do_turno(self, planning_window: str, local_time: time) -> bool:
        if planning_window not in self.PLANNING_WINDOWS:
            raise ValueError("Turno de planejamento inválido.")
        start, end = self.PLANNING_WINDOWS[planning_window]
        if start <= end:
            return start <= local_time <= end
        return local_time >= start or local_time <= end
