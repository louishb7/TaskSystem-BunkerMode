# Re-exports de compatibilidade: exceções centralizadas em core/exceptions.py.
from backend.core.exceptions import (  # noqa: F401
    AutenticacaoError,
    PermissaoNegadaError,
    UsuarioJaExisteError,
    UsuarioNaoEncontrado,
)
