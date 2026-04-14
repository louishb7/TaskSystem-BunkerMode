from datetime import datetime

from fastapi.testclient import TestClient

from api.routes import app, get_auth_service, get_missao_service
from auditoria import EventoAuditoria
from services.auth_service import AuthService
from services.missao_service import MissaoService
from missao import Missao, StatusMissao


class RepositorioV2Fake:
    def __init__(self):
        self.missoes = []
        self.usuarios = []
        self.contextos = {}
        self.auditoria = []
        self.proximo_missao_id = 1
        self.proximo_usuario_id = 1
        self.proximo_evento_id = 1

    def carregar_dados(self):
        return sorted(self.missoes, key=lambda m: (m.prioridade.value, m.missao_id))

    def carregar_dados_por_responsavel(self, responsavel_id):
        ids = {
            missao_id
            for missao_id, contexto in self.contextos.items()
            if contexto.get("responsavel_id") == responsavel_id
        }
        return [missao for missao in self.carregar_dados() if missao.missao_id in ids]

    def adicionar_missao(self, missao):
        missao.atualizar_missao_id(self.proximo_missao_id)
        self.proximo_missao_id += 1
        self.missoes.append(missao)

    def buscar_por_id(self, missao_id):
        for missao in self.missoes:
            if missao.missao_id == missao_id:
                return missao
        return None

    def atualizar_missao(self, missao_atualizada):
        for indice, missao in enumerate(self.missoes):
            if missao.missao_id == missao_atualizada.missao_id:
                self.missoes[indice] = missao_atualizada
                return

    def remover_missao(self, missao_id):
        self.missoes = [m for m in self.missoes if m.missao_id != missao_id]
        self.contextos.pop(missao_id, None)

    def adicionar_usuario(self, usuario):
        usuario.usuario_id = self.proximo_usuario_id
        self.proximo_usuario_id += 1
        self.usuarios.append(usuario)

    def buscar_usuario_por_email(self, email):
        email = email.strip().lower()
        for usuario in self.usuarios:
            if usuario.email == email:
                return usuario
        return None

    def buscar_usuario_por_id(self, usuario_id):
        for usuario in self.usuarios:
            if usuario.usuario_id == usuario_id:
                return usuario
        return None

    def salvar_contexto_missao(self, missao_id, criada_por_id, responsavel_id):
        self.contextos[missao_id] = {
            "criada_por_id": criada_por_id,
            "responsavel_id": responsavel_id,
        }

    def buscar_contexto_missao(self, missao_id):
        return self.contextos.get(missao_id)

    def registrar_auditoria(self, evento):
        evento.evento_id = self.proximo_evento_id
        self.proximo_evento_id += 1
        self.auditoria.append(evento)

    def listar_auditoria_por_missao(self, missao_id):
        return [evento for evento in self.auditoria if evento.missao_id == missao_id]


class AmbienteV2:
    def __init__(self):
        self.repo = RepositorioV2Fake()
        self.auth = AuthService(self.repo)
        self.missoes = MissaoService(self.repo)

        app.dependency_overrides[get_auth_service] = lambda: self.auth
        app.dependency_overrides[get_missao_service] = lambda: self.missoes
        self.client = TestClient(app)

    def cleanup(self):
        app.dependency_overrides.clear()

    def registrar(self, usuario, email, senha="segredo123"):
        return self.client.post(
            "/api/v2/auth/register",
            json={"usuario": usuario, "email": email, "senha": senha},
        )

    def login(self, email, senha="segredo123"):
        return self.client.post(
            "/api/v2/auth/login", json={"email": email, "senha": senha}
        )


def test_auth_register_login_e_me_v2():
    env = AmbienteV2()
    try:
        resposta_registro = env.registrar("Henrique", "henrique@email.com")
        assert resposta_registro.status_code == 201
        assert resposta_registro.json()["email"] == "henrique@email.com"

        resposta_login = env.login("henrique@email.com")
        assert resposta_login.status_code == 200
        token = resposta_login.json()["access_token"]

        resposta_me = env.client.get(
            "/api/v2/usuarios/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resposta_me.status_code == 200
        assert resposta_me.json()["usuario"] == "Henrique"
    finally:
        env.cleanup()


def test_usuario_autenticado_cria_e_lista_missao():
    env = AmbienteV2()
    try:
        usuario = env.registrar("Henrique", "henrique@email.com")
        token = env.login("henrique@email.com").json()["access_token"]

        resposta_criacao = env.client.post(
            "/api/v2/missoes",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "titulo": "Missão crítica",
                "prioridade": 1,
                "prazo": "20-04-2026",
                "instrucao": "Executar operação",
                "responsavel_id": usuario.json()["id"],
            },
        )
        assert resposta_criacao.status_code == 201

        resposta_lista = env.client.get(
            "/api/v2/missoes",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resposta_lista.status_code == 200
        assert len(resposta_lista.json()) == 1
        assert resposta_lista.json()[0]["titulo"] == "Missão crítica"
    finally:
        env.cleanup()


def test_login_retorna_401_com_email_invalido():
    env = AmbienteV2()
    try:
        env.registrar("Henrique", "henrique@email.com")
        resposta = env.login("inexistente@email.com")
        assert resposta.status_code == 401
    finally:
        env.cleanup()


def test_usuario_autenticado_conclui_missao():
    env = AmbienteV2()
    try:
        usuario = env.auth.registrar_usuario(
            {"usuario": "Henrique", "email": "henrique@email.com", "senha": "segredo123"}
        )
        token = env.auth.autenticar("henrique@email.com", "segredo123")["access_token"]
        missao = Missao(
            titulo="Executar",
            prioridade=2,
            prazo="20-04-2026",
            instrucao="Concluir missão",
            status=StatusMissao.PENDENTE,
        )
        env.repo.adicionar_missao(missao)
        env.repo.salvar_contexto_missao(
            missao.missao_id,
            criada_por_id=usuario.usuario_id,
            responsavel_id=usuario.usuario_id,
        )

        resposta = env.client.patch(
            f"/api/v2/missoes/{missao.missao_id}/concluir",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resposta.status_code == 200
        assert resposta.json()["status"] == "Concluída"
    finally:
        env.cleanup()


def test_historico_retorna_eventos_da_missao():
    env = AmbienteV2()
    try:
        usuario = env.auth.registrar_usuario(
            {"usuario": "Henrique", "email": "henrique@email.com", "senha": "segredo123"}
        )
        token = env.auth.autenticar("henrique@email.com", "segredo123")["access_token"]
        missao = Missao(
            titulo="Auditar",
            prioridade=1,
            prazo=None,
            instrucao="Verificar histórico",
            status=StatusMissao.PENDENTE,
        )
        env.repo.adicionar_missao(missao)
        env.repo.salvar_contexto_missao(missao.missao_id, usuario.usuario_id, None)
        env.repo.registrar_auditoria(
            EventoAuditoria(
                missao_id=missao.missao_id,
                usuario_id=usuario.usuario_id,
                acao="missao_criada",
                detalhes="Missão criada no teste.",
                criado_em=datetime(2026, 4, 14, 12, 0, 0),
            )
        )

        resposta = env.client.get(
            f"/api/v2/missoes/{missao.missao_id}/historico",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resposta.status_code == 200
        assert resposta.json()[0]["acao"] == "missao_criada"
    finally:
        env.cleanup()
