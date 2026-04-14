class UsuarioNaoEncontrado(Exception):
    """Erro levantado quando um usuário não é encontrado."""


class UsuarioJaExisteError(ValueError):
    """Erro levantado quando o username já está em uso."""


class AutenticacaoError(ValueError):
    """Erro levantado quando as credenciais são inválidas."""


class PermissaoNegadaError(PermissionError):
    """Erro levantado quando o usuário não pode executar a ação."""
