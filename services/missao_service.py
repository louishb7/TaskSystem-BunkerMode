from repositories.repositorio_postgres import RepositorioPostgres
from models.missao import Missao
from core.auditoria import registrar

class MissaoService:

    def __init__(self):
        self.repo = RepositorioPostgres()

    def criar_missao(self, usuario_id, data):
        missao = Missao(
            missao=data.titulo,
            prioridade=data.prioridade,
            prazo=data.prazo,
            descricao=data.descricao
        )

        nova = self.repo.criar_missao(usuario_id, missao)
        registrar(usuario_id, "CRIAR_MISSAO", missao.missao)
        return nova

    def listar_missoes(self, usuario_id):
        return self.repo.listar_missoes(usuario_id)

    def concluir_missao(self, usuario_id, missao_id):
        result = self.repo.concluir_missao(usuario_id, missao_id)
        registrar(usuario_id, "CONCLUIR_MISSAO", missao_id)
        return result

    def deletar_missao(self, usuario_id, missao_id):
        result = self.repo.deletar_missao(usuario_id, missao_id)
        registrar(usuario_id, "DELETAR_MISSAO", missao_id)
        return result
