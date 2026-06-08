# Exceções de domínio do BunkerMode


class MissaoNaoEncontrada(Exception):
    """Missão não encontrada pelo ID."""


class UsuarioNaoEncontrado(Exception):
    """Usuário não encontrado."""


class UsuarioJaExisteError(ValueError):
    """E-mail já está em uso."""


class AutenticacaoError(ValueError):
    """Credenciais inválidas."""


class PermissaoNegadaError(PermissionError):
    """Usuário não tem permissão para esta ação."""
