from auditoria import EventoAuditoria
from core_exceptions import MissaoNaoEncontrada
from missao import Missao


class MissaoService:
    """Centraliza os casos de uso de missão da API."""

    def __init__(self, repositorio):
        self.repositorio = repositorio

    def criar_missao(self, dados: dict, usuario=None) -> Missao:
        campos_missao = {
            "titulo": dados["titulo"],
            "prioridade": dados["prioridade"],
            "prazo": dados.get("prazo"),
            "instrucao": dados["instrucao"],
        }
        if dados.get("status") is not None:
            campos_missao["status"] = dados["status"]

        missao = Missao(**campos_missao)
        self.repositorio.adicionar_missao(missao)

        if usuario is not None:
            responsavel_id = dados.get("responsavel_id") or usuario.usuario_id
            self.repositorio.salvar_contexto_missao(
                missao.missao_id,
                usuario.usuario_id,
                responsavel_id,
            )
            self._registrar_auditoria(
                missao_id=missao.missao_id,
                usuario_id=usuario.usuario_id,
                acao="missao_criada",
                detalhes=f"Missão '{missao.titulo}' criada.",
            )

        return missao

    def listar_missoes(self, usuario=None) -> list[Missao]:
        if usuario is not None:
            return list(
                self.repositorio.carregar_dados_por_responsavel(usuario.usuario_id)
            )
        return list(self.repositorio.carregar_dados())

    def editar_missao(self, missao_id: int, dados: dict, usuario=None) -> Missao:
        missao = self._buscar_por_id_do_usuario(missao_id, usuario)

        if "titulo" in dados:
            missao.atualizar_titulo(dados["titulo"])
        if "instrucao" in dados:
            missao.atualizar_instrucao(dados["instrucao"])
        if "prioridade" in dados:
            missao.atualizar_prioridade(dados["prioridade"])
        if "prazo" in dados:
            missao.atualizar_prazo(dados["prazo"])

        self.repositorio.atualizar_missao(missao)

        if usuario is not None:
            self._registrar_auditoria(
                missao_id=missao.missao_id,
                usuario_id=usuario.usuario_id,
                acao="missao_atualizada",
                detalhes=f"Missão '{missao.titulo}' atualizada.",
            )

        return missao

    def concluir_missao(self, missao_id: int, usuario=None) -> Missao:
        missao = self._buscar_por_id_do_usuario(missao_id, usuario)
        missao.concluir()
        self.repositorio.atualizar_missao(missao)

        if usuario is not None:
            self._registrar_auditoria(
                missao_id=missao.missao_id,
                usuario_id=usuario.usuario_id,
                acao="missao_concluida",
                detalhes=f"Missão '{missao.titulo}' concluída.",
            )

        return missao

    def listar_historico(self, missao_id: int, usuario=None) -> list[EventoAuditoria]:
        self._buscar_por_id_do_usuario(missao_id, usuario)
        return self.repositorio.listar_auditoria_por_missao(missao_id)

    def remover_missao(self, missao_id: int, usuario=None) -> None:
        missao = self._buscar_por_id_do_usuario(missao_id, usuario)
        self.repositorio.remover_missao(missao_id)

        if usuario is not None:
            self._registrar_auditoria(
                missao_id=missao_id,
                usuario_id=usuario.usuario_id,
                acao="missao_removida",
                detalhes=f"Missão '{missao.titulo}' removida.",
            )

    def buscar_por_id(self, missao_id: int) -> Missao:
        missao = self.repositorio.buscar_por_id(missao_id)
        if missao is None:
            raise MissaoNaoEncontrada(f"Missão {missao_id} não encontrada")
        return missao

    def _buscar_por_id_do_usuario(self, missao_id: int, usuario=None) -> Missao:
        missao = self.buscar_por_id(missao_id)
        if usuario is None:
            return missao

        contexto = self.repositorio.buscar_contexto_missao(missao_id)
        if contexto is None or contexto.get("responsavel_id") != usuario.usuario_id:
            raise MissaoNaoEncontrada(f"Missão {missao_id} não encontrada")

        return missao

    def _registrar_auditoria(
        self,
        *,
        missao_id: int,
        usuario_id: int,
        acao: str,
        detalhes: str,
    ) -> None:
        self.repositorio.registrar_auditoria(
            EventoAuditoria(
                missao_id=missao_id,
                usuario_id=usuario_id,
                acao=acao,
                detalhes=detalhes,
            )
        )
