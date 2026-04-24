from datetime import datetime

from fastapi import HTTPException

from api.routes import (
    criar_missao,
    editar_missao,
    justificar_missao,
    listar_missoes_historicas,
    listar_missoes,
    listar_missoes_em_revisao,
    login,
    obter_relatorio_semanal,
    registrar_usuario,
    revisar_justificativa,
)
from api.schemas import (
    LoginPayload,
    MissaoCreatePayload,
    MissaoUpdatePayload,
    RegistroPayload,
    RevisaoJustificativaPayload,
    SoldierExcusePayload,
)
from missao import Missao, StatusMissao
from services.auth_service import AuthService
from services.missao_service import MissaoService
from services.relatorio_service import RelatorioService


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

    def atualizar_nome_general(self, usuario_id, nome_general):
        usuario = self.buscar_usuario_por_id(usuario_id)
        if usuario is not None:
            usuario.definir_nome_general(nome_general)

    def atualizar_modo_ativo(self, usuario_id, active_mode):
        usuario = self.buscar_usuario_por_id(usuario_id)
        if usuario is not None:
            usuario.definir_modo(active_mode)

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


def preparar_ambiente():
    repo = RepositorioV2Fake()
    auth = AuthService(repo)
    missoes = MissaoService(repo)
    relatorios = RelatorioService(repo)

    usuario = registrar_usuario(
        RegistroPayload(usuario="Henrique", email="henrique@email.com", senha="segredo123"),
        auth_service=auth,
    )
    resultado_login = login(
        LoginPayload(email="henrique@email.com", senha="segredo123"),
        auth_service=auth,
    )
    usuario_obj = auth.obter_usuario_por_token(resultado_login["access_token"])
    return repo, auth, missoes, relatorios, usuario, usuario_obj


def test_auth_register_login_e_me_v2():
    _, _, _, _, usuario, usuario_obj = preparar_ambiente()

    assert usuario["email"] == "henrique@email.com"
    assert usuario_obj.usuario == "Henrique"
    assert usuario_obj.active_mode == "general"


def test_soldado_nao_pode_concluir_missao_vencida():
    repo, auth, missoes, _, usuario_dict, usuario = preparar_ambiente()
    criar_missao(
        MissaoCreatePayload(
            titulo="Missão vencida",
            prioridade=1,
            prazo="01-01-2020",
            instrucao="Executar operação",
            responsavel_id=usuario_dict["id"],
        ),
        usuario=usuario,
        missao_service=missoes,
    )
    usuario.definir_modo("soldier")
    auth.alterar_modo(usuario.usuario_id, "soldier")

    try:
        missoes.concluir_missao(1, usuario=usuario)
    except ValueError as erro:
        assert "fora do prazo" in str(erro)
    else:
        raise AssertionError("A conclusão da missão vencida deveria falhar.")

    resposta = listar_missoes(usuario=usuario, missao_service=missoes)
    assert resposta[0]["status"] == "Falha aguardando justificativa"
    assert resposta[0]["failure_reason"] is None


def test_api_retorna_403_quando_soldado_tenta_criar_missao():
    _, auth, missoes, _, usuario_dict, usuario = preparar_ambiente()
    usuario.definir_modo("soldier")
    auth.alterar_modo(usuario.usuario_id, "soldier")

    try:
        criar_missao(
            MissaoCreatePayload(
                titulo="Missão bloqueada",
                prioridade=1,
                prazo="24-04-2026",
                instrucao="Executar operação",
                responsavel_id=usuario_dict["id"],
            ),
            usuario=usuario,
            missao_service=missoes,
        )
    except HTTPException as erro:
        assert erro.status_code == 403
    else:
        raise AssertionError("Criar missão em modo Soldier deveria retornar 403.")


def test_soldado_pode_justificar_e_general_revisar():
    repo, auth, missoes, _, usuario_dict, usuario = preparar_ambiente()
    criar_missao(
        MissaoCreatePayload(
            titulo="Missão vencida",
            prioridade=1,
            prazo="01-01-2020",
            instrucao="Executar operação",
            responsavel_id=usuario_dict["id"],
        ),
        usuario=usuario,
        missao_service=missoes,
    )
    usuario.definir_modo("soldier")
    auth.alterar_modo(usuario.usuario_id, "soldier")

    try:
        missoes.concluir_missao(1, usuario=usuario)
    except ValueError:
        pass

    justificativa = justificar_missao(
        1,
        SoldierExcusePayload(reason="Perdi a janela por atraso externo."),
        usuario=usuario,
        missao_service=missoes,
    )
    assert justificativa["status"] == "Falha justificada aguardando revisão"

    usuario.definir_modo("general")
    repo.atualizar_modo_ativo(usuario.usuario_id, "general")
    revisoes = listar_missoes_em_revisao(usuario=usuario, missao_service=missoes)
    assert [item["id"] for item in revisoes] == [1]

    resposta = revisar_justificativa(
        1,
        RevisaoJustificativaPayload(accepted=True),
        usuario=usuario,
        missao_service=missoes,
    )
    assert resposta["status"] == "Falha revisada"
    assert resposta["general_verdict"] == "accepted"


def test_listagem_operacional_nao_retorna_concluidas_ou_falhas_revisadas():
    repo, _, missoes, _, usuario_dict, usuario = preparar_ambiente()
    repo.missoes = [
        Missao(
            missao_id=1,
            titulo="Pendente",
            prioridade=1,
            prazo="30-04-2099",
            instrucao="Executar",
            status=StatusMissao.PENDENTE,
            user_id=usuario.usuario_id,
        ),
        Missao(
            missao_id=2,
            titulo="Concluída",
            prioridade=1,
            prazo="22-04-2026",
            instrucao="Executar",
            status=StatusMissao.CONCLUIDA,
            completed_at=datetime(2026, 4, 22, 10, 0, 0),
            user_id=usuario.usuario_id,
        ),
        Missao(
            missao_id=3,
            titulo="Falha revisada",
            prioridade=1,
            prazo="23-04-2026",
            instrucao="Executar",
            status=StatusMissao.FALHA_REVISADA,
            failed_at=datetime(2026, 4, 23, 10, 0, 0),
            failure_reason="Falhou.",
            general_verdict="accepted",
            user_id=usuario.usuario_id,
        ),
    ]
    repo.contextos = {
        1: {"criada_por_id": usuario_dict["id"], "responsavel_id": usuario_dict["id"]},
        2: {"criada_por_id": usuario_dict["id"], "responsavel_id": usuario_dict["id"]},
        3: {"criada_por_id": usuario_dict["id"], "responsavel_id": usuario_dict["id"]},
    }

    resposta = listar_missoes(usuario=usuario, missao_service=missoes)

    assert [missao["id"] for missao in resposta] == [1]


def test_listagem_soldado_retorna_apenas_executaveis_ou_justificaveis():
    repo, auth, missoes, _, usuario_dict, usuario = preparar_ambiente()
    repo.missoes = [
        Missao(
            missao_id=1,
            titulo="Pendente de hoje",
            prioridade=1,
            prazo="24-04-2026",
            instrucao="Executar",
            status=StatusMissao.PENDENTE,
            user_id=usuario.usuario_id,
        ),
        Missao(
            missao_id=2,
            titulo="Futura",
            prioridade=1,
            prazo="30-04-2099",
            instrucao="Executar",
            status=StatusMissao.PENDENTE,
            user_id=usuario.usuario_id,
        ),
        Missao(
            missao_id=3,
            titulo="Aguardando revisão",
            prioridade=1,
            prazo="23-04-2026",
            instrucao="Executar",
            status=StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO,
            failed_at=datetime(2026, 4, 23, 10, 0, 0),
            failure_reason="Falhou.",
            user_id=usuario.usuario_id,
        ),
        Missao(
            missao_id=4,
            titulo="Falha para justificar",
            prioridade=1,
            prazo="01-01-2020",
            instrucao="Executar",
            status=StatusMissao.FALHA_PENDENTE_JUSTIFICATIVA,
            failed_at=datetime(2026, 4, 23, 10, 0, 0),
            user_id=usuario.usuario_id,
        ),
    ]
    repo.contextos = {
        1: {"criada_por_id": usuario_dict["id"], "responsavel_id": usuario_dict["id"]},
        2: {"criada_por_id": usuario_dict["id"], "responsavel_id": usuario_dict["id"]},
        3: {"criada_por_id": usuario_dict["id"], "responsavel_id": usuario_dict["id"]},
        4: {"criada_por_id": usuario_dict["id"], "responsavel_id": usuario_dict["id"]},
    }
    usuario.definir_modo("soldier")
    auth.alterar_modo(usuario.usuario_id, "soldier")

    resposta = listar_missoes(usuario=usuario, missao_service=missoes)

    assert [missao["id"] for missao in resposta] == [4, 1]


def test_api_retorna_400_para_revisao_em_estado_invalido():
    _, _, missoes, _, usuario_dict, usuario = preparar_ambiente()
    criar_missao(
        MissaoCreatePayload(
            titulo="Missão ainda pendente",
            prioridade=1,
            prazo="30-04-2099",
            instrucao="Executar operação",
            responsavel_id=usuario_dict["id"],
        ),
        usuario=usuario,
        missao_service=missoes,
    )

    try:
        revisar_justificativa(
            1,
            RevisaoJustificativaPayload(accepted=True),
            usuario=usuario,
            missao_service=missoes,
        )
    except HTTPException as erro:
        assert erro.status_code == 400
    else:
        raise AssertionError("Revisão fora do estado correto deveria retornar 400.")


def test_general_pode_reabrir_missao_concluida():
    _, auth, missoes, _, usuario_dict, usuario = preparar_ambiente()
    criar_missao(
        MissaoCreatePayload(
            titulo="Missão concluível",
            prioridade=1,
            prazo="30-04-2099",
            instrucao="Executar operação",
            responsavel_id=usuario_dict["id"],
        ),
        usuario=usuario,
        missao_service=missoes,
    )

    usuario.definir_modo("soldier")
    auth.alterar_modo(usuario.usuario_id, "soldier")
    missoes.concluir_missao(1, usuario=usuario)

    usuario.definir_modo("general")
    auth.liberar_general(usuario.usuario_id, "segredo123")
    resposta = editar_missao(
        1,
        MissaoUpdatePayload(
            titulo="Missão concluível",
            prioridade=1,
            prazo="30-04-2099",
            instrucao="Executar operação",
            status="Pendente",
        ),
        usuario=usuario,
        missao_service=missoes,
    )

    assert resposta["status"] == "Pendente"
    assert resposta["completed_at"] is None


def test_historico_de_missoes_retorna_apenas_finalizadas():
    repo, _, missoes, _, usuario_dict, usuario = preparar_ambiente()
    repo.missoes = [
        Missao(
            missao_id=1,
            titulo="Concluída",
            prioridade=1,
            prazo="22-04-2026",
            instrucao="Executar",
            status=StatusMissao.CONCLUIDA,
            completed_at=datetime(2026, 4, 22, 10, 0, 0),
            user_id=usuario.usuario_id,
        ),
        Missao(
            missao_id=2,
            titulo="Falha revisada",
            prioridade=1,
            prazo="23-04-2026",
            instrucao="Executar",
            status=StatusMissao.FALHA_REVISADA,
            failed_at=datetime(2026, 4, 23, 10, 0, 0),
            failure_reason="Falhou.",
            general_verdict="accepted",
            user_id=usuario.usuario_id,
        ),
        Missao(
            missao_id=3,
            titulo="Pendente",
            prioridade=1,
            prazo="30-04-2099",
            instrucao="Executar",
            status=StatusMissao.PENDENTE,
            user_id=usuario.usuario_id,
        ),
    ]
    repo.contextos = {
        1: {"criada_por_id": usuario_dict["id"], "responsavel_id": usuario_dict["id"]},
        2: {"criada_por_id": usuario_dict["id"], "responsavel_id": usuario_dict["id"]},
        3: {"criada_por_id": usuario_dict["id"], "responsavel_id": usuario_dict["id"]},
    }

    resposta = listar_missoes_historicas(usuario=usuario, missao_service=missoes)

    assert [missao["id"] for missao in resposta] == [1, 2]


def test_historico_de_missoes_bloqueado_no_modo_soldado():
    _, auth, missoes, _, _, usuario = preparar_ambiente()
    usuario.definir_modo("soldier")
    auth.alterar_modo(usuario.usuario_id, "soldier")

    try:
        listar_missoes_historicas(usuario=usuario, missao_service=missoes)
    except HTTPException as erro:
        assert erro.status_code == 403
    else:
        raise AssertionError("Histórico de missões em modo Soldier deveria retornar 403.")


def test_usuario_nao_afeta_missao_de_outro_usuario():
    repo = RepositorioV2Fake()
    auth = AuthService(repo)
    missoes = MissaoService(repo)

    registrar_usuario(
        RegistroPayload(usuario="Henrique", email="henrique@email.com", senha="segredo123"),
        auth_service=auth,
    )
    registrar_usuario(
        RegistroPayload(usuario="Maria", email="maria@email.com", senha="segredo123"),
        auth_service=auth,
    )
    usuario_1 = auth.obter_usuario_por_token(
        login(LoginPayload(email="henrique@email.com", senha="segredo123"), auth_service=auth)["access_token"]
    )
    usuario_2 = auth.obter_usuario_por_token(
        login(LoginPayload(email="maria@email.com", senha="segredo123"), auth_service=auth)["access_token"]
    )

    criar_missao(
        MissaoCreatePayload(
            titulo="Missão privada",
            prioridade=1,
            prazo="30-04-2099",
            instrucao="Executar operação",
            responsavel_id=usuario_1.usuario_id,
        ),
        usuario=usuario_1,
        missao_service=missoes,
    )
    usuario_2.definir_modo("soldier")
    auth.alterar_modo(usuario_2.usuario_id, "soldier")

    try:
        missoes.concluir_missao(1, usuario=usuario_2)
    except Exception as erro:
        assert type(erro).__name__ == "MissaoNaoEncontrada"
    else:
        raise AssertionError("O segundo usuário não deveria alterar missão alheia.")


def test_relatorio_semanal_retorna_payload_esperado():
    repo, _, _, relatorios, usuario_dict, usuario = preparar_ambiente()
    repo.missoes = [
        Missao(
            missao_id=1,
            titulo="Concluir relatório",
            prioridade=1,
            prazo="22-04-2026",
            instrucao="Entregar versão final",
            status=StatusMissao.CONCLUIDA,
            completed_at=datetime(2026, 4, 22, 10, 0, 0),
            created_at=datetime(2026, 4, 21, 8, 0, 0),
            user_id=usuario.usuario_id,
        ),
        Missao(
            missao_id=2,
            titulo="Missão falha",
            prioridade=1,
            prazo="23-04-2026",
            instrucao="Executar",
            status=StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO,
            created_at=datetime(2026, 4, 22, 8, 0, 0),
            failed_at=datetime(2026, 4, 23, 12, 0, 0),
            failure_reason="Perdi o prazo por bloqueio externo.",
            user_id=usuario.usuario_id,
            is_decided=True,
        ),
    ]
    repo.contextos = {
        1: {"criada_por_id": usuario_dict["id"], "responsavel_id": usuario_dict["id"]},
        2: {"criada_por_id": usuario_dict["id"], "responsavel_id": usuario_dict["id"]},
    }

    payload = obter_relatorio_semanal(
        start_date="2026-04-20",
        end_date="2026-04-26",
        usuario=usuario,
        relatorio_service=relatorios,
    )

    assert payload["total_missions"] == 2
    assert payload["completed_missions"] == 1
    assert payload["completion_rate"] == 50.0
    assert payload["committed_missions_failed"] == 1
    assert payload["missions_waiting_justification"] == 0
    assert payload["missions_waiting_review"] == 1
    assert payload["failure_reasons"] == ["Perdi o prazo por bloqueio externo."]


def test_relatorio_semanal_retorna_403_em_modo_soldado():
    _, auth, _, relatorios, _, usuario = preparar_ambiente()
    usuario.definir_modo("soldier")
    auth.alterar_modo(usuario.usuario_id, "soldier")

    try:
        obter_relatorio_semanal(
            start_date="2026-04-20",
            end_date="2026-04-26",
            usuario=usuario,
            relatorio_service=relatorios,
        )
    except HTTPException as erro:
        assert erro.status_code == 403
    else:
        raise AssertionError("Relatório semanal em modo Soldier deveria retornar 403.")


def test_relatorio_semanal_retorna_400_para_intervalo_invertido():
    _, _, _, relatorios, _, usuario = preparar_ambiente()

    try:
        obter_relatorio_semanal(
            start_date="2026-04-26",
            end_date="2026-04-20",
            usuario=usuario,
            relatorio_service=relatorios,
        )
    except HTTPException as erro:
        assert erro.status_code == 400
        assert "Intervalo semanal inválido" in erro.detail
    else:
        raise AssertionError("Intervalo invertido deveria retornar erro HTTP 400.")


def test_relatorio_semanal_valida_formato_de_data():
    _, _, _, relatorios, _, usuario = preparar_ambiente()

    try:
        obter_relatorio_semanal(
            start_date="20-04-2026",
            end_date="2026-04-26",
            usuario=usuario,
            relatorio_service=relatorios,
        )
    except HTTPException as erro:
        assert erro.status_code == 400
        assert "YYYY-MM-DD" in erro.detail
    else:
        raise AssertionError("Datas inválidas deveriam retornar erro HTTP 400.")
