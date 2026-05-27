from datetime import datetime
from types import SimpleNamespace

import pytest

from backend.models.missao import Missao, StatusMissao
from backend.services.comando_service import ComandoService
from backend.services.exceptions import PermissaoNegadaError


INSTANTE_TESTE = datetime(2026, 5, 20, 10, 0, 0)


class RepositorioComandoFake:
    def __init__(self):
        self.missoes = []
        self.contextos = {}
        self.revisoes = []
        self.operacoes_lidas = 0
        self.revisoes_lidas = 0

    def carregar_dados_por_responsavel(self, responsavel_id):
        ids = {
            missao_id
            for missao_id, contexto in self.contextos.items()
            if contexto.get("responsavel_id") == responsavel_id
        }
        return [missao for missao in self.missoes if missao.missao_id in ids]

    def atualizar_missao(self, missao_atualizada):
        for indice, missao in enumerate(self.missoes):
            if missao.missao_id == missao_atualizada.missao_id:
                self.missoes[indice] = missao_atualizada
                return

    def registrar_auditoria(self, evento):
        return None

    def buscar_revisao_por_periodo(self, usuario_id, start_date, end_date):
        return None

    def listar_revisoes_semanais(self, usuario_id):
        self.revisoes_lidas += 1
        return self.revisoes

    def listar_operacoes_por_usuario(self, usuario_id):
        self.operacoes_lidas += 1
        return []


def usuario_general():
    return SimpleNamespace(usuario_id=1, active_mode="general")


def test_comando_agrega_suporte_general_em_um_payload():
    repo = RepositorioComandoFake()
    missao = Missao(
        missao_id=1,
        titulo="Ordem concluída",
        prioridade=1,
        prazo="15-05-2026",
        status=StatusMissao.CONCLUIDA,
        user_id=1,
        completed_at=datetime(2026, 5, 15, 10, 0, 0),
    )
    repo.missoes.append(missao)
    repo.contextos[1] = {"responsavel_id": 1}

    payload = ComandoService(repo, now_provider=lambda: INSTANTE_TESTE).obter_suporte_general(usuario_general())

    assert payload["review_missions"] == []
    assert payload["historical_missions"][0]["titulo"] == "Ordem concluída"
    assert payload["review_state"]["pending"] is True
    assert payload["weekly_reviews"] == []
    assert payload["operations"] == []
    assert repo.revisoes_lidas == 1
    assert repo.operacoes_lidas == 1


def test_comando_agregado_respeita_bloqueio_do_modo_soldado():
    repo = RepositorioComandoFake()
    usuario = SimpleNamespace(usuario_id=1, active_mode="soldier")

    with pytest.raises(PermissaoNegadaError):
        ComandoService(repo, now_provider=lambda: INSTANTE_TESTE).obter_suporte_general(usuario)
