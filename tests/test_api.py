from fastapi.testclient import TestClient

from api import app, get_gerenciador
from gerenciador import GerenciadorDeMissoes
from missao import StatusMissao


class RepositorioFake:
    def __init__(self, missoes=None):
        self.missoes = list(missoes) if missoes else []
        self.proximo_id = (
            max((missao.missao_id for missao in self.missoes), default=0) + 1
        )

    def carregar_dados(self):
        return sorted(
            self.missoes,
            key=lambda m: (m.prioridade.value, m.missao_id),
        )

    def adicionar_missao(self, missao):
        missao.atualizar_missao_id(self.proximo_id)
        self.proximo_id += 1
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
        self.missoes = [
            missao for missao in self.missoes if missao.missao_id != missao_id
        ]



def criar_cliente():
    repositorio = RepositorioFake()
    gerenciador = GerenciadorDeMissoes(repositorio)

    def override_get_gerenciador():
        return gerenciador

    app.dependency_overrides[get_gerenciador] = override_get_gerenciador
    return TestClient(app), gerenciador



def limpar_overrides():
    app.dependency_overrides.clear()



def test_post_cria_missao_com_contrato_padronizado():
    client, _ = criar_cliente()

    resposta = client.post(
        "/api/v1/missoes",
        json={
            "titulo": "Estudar FastAPI",
            "prioridade": 1,
            "prazo": "20-04-2026",
            "instrucao": "Revisar response_model",
        },
    )

    assert resposta.status_code == 201
    assert resposta.json() == {
        "id": 1,
        "titulo": "Estudar FastAPI",
        "prioridade": 1,
        "prazo": "20-04-2026",
        "instrucao": "Revisar response_model",
        "status": "Aguardando Recruta!",
    }
    limpar_overrides()



def test_get_lista_missoes():
    client, gerenciador = criar_cliente()
    gerenciador.adicionar_missao(
        {
            "titulo": "Missão A",
            "prioridade": 2,
            "prazo": "20-04-2026",
            "instrucao": "A",
            "status": StatusMissao.PENDENTE,
        }
    )

    resposta = client.get("/api/v1/missoes")

    assert resposta.status_code == 200
    assert resposta.json() == [
        {
            "id": 1,
            "titulo": "Missão A",
            "prioridade": 2,
            "prazo": "20-04-2026",
            "instrucao": "A",
            "status": "Aguardando Recruta!",
        }
    ]
    limpar_overrides()



def test_get_detalha_missao_existente():
    client, gerenciador = criar_cliente()
    missao = gerenciador.adicionar_missao(
        {
            "titulo": "Detalhar",
            "prioridade": 1,
            "prazo": "20-04-2026",
            "instrucao": "Ver detalhes",
            "status": StatusMissao.PENDENTE,
        }
    )

    resposta = client.get(f"/api/v1/missoes/{missao.missao_id}")

    assert resposta.status_code == 200
    assert resposta.json()["id"] == missao.missao_id
    assert resposta.json()["titulo"] == "Detalhar"
    limpar_overrides()



def test_get_retorna_404_quando_missao_nao_existe():
    client, _ = criar_cliente()

    resposta = client.get("/api/v1/missoes/999")

    assert resposta.status_code == 404
    assert resposta.json() == {"detail": "Missão 999 não encontrada"}
    limpar_overrides()



def test_patch_atualiza_missao():
    client, gerenciador = criar_cliente()
    missao = gerenciador.adicionar_missao(
        {
            "titulo": "Antiga",
            "prioridade": 2,
            "prazo": "20-04-2026",
            "instrucao": "Antiga instrução",
            "status": StatusMissao.PENDENTE,
        }
    )

    resposta = client.patch(
        f"/api/v1/missoes/{missao.missao_id}",
        json={"titulo": "Nova", "prioridade": 1},
    )

    assert resposta.status_code == 200
    assert resposta.json()["titulo"] == "Nova"
    assert resposta.json()["prioridade"] == 1
    limpar_overrides()



def test_patch_conclui_missao():
    client, gerenciador = criar_cliente()
    missao = gerenciador.adicionar_missao(
        {
            "titulo": "Concluir",
            "prioridade": 2,
            "prazo": "20-04-2026",
            "instrucao": "Executar",
            "status": StatusMissao.PENDENTE,
        }
    )

    resposta = client.patch(f"/api/v1/missoes/{missao.missao_id}/concluir")

    assert resposta.status_code == 200
    assert resposta.json()["status"] == "Concluída"
    limpar_overrides()



def test_delete_remove_missao_e_retorna_mensagem_padronizada():
    client, gerenciador = criar_cliente()
    missao = gerenciador.adicionar_missao(
        {
            "titulo": "Remover",
            "prioridade": 3,
            "prazo": None,
            "instrucao": "Excluir",
            "status": StatusMissao.PENDENTE,
        }
    )

    resposta = client.delete(f"/api/v1/missoes/{missao.missao_id}")

    assert resposta.status_code == 200
    assert resposta.json() == {
        "mensagem": "Missão 'Remover' removida com sucesso"
    }
    limpar_overrides()



def test_post_retorna_400_para_erro_de_dominio():
    client, _ = criar_cliente()

    resposta = client.post(
        "/api/v1/missoes",
        json={
            "titulo": "Missão inválida",
            "prioridade": 9,
            "prazo": "20-04-2026",
            "instrucao": "Testar domínio",
        },
    )

    assert resposta.status_code == 400
    assert resposta.json() == {"detail": "Prioridade deve ser entre 1 e 3."}
    limpar_overrides()



def test_post_retorna_422_para_json_sem_campo_obrigatorio():
    client, _ = criar_cliente()

    resposta = client.post(
        "/api/v1/missoes",
        json={
            "titulo": "Missão sem instrução",
            "prioridade": 1,
            "prazo": "20-04-2026",
        },
    )

    assert resposta.status_code == 422
    limpar_overrides()
