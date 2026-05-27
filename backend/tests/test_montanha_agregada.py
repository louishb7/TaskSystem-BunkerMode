from datetime import datetime
from types import SimpleNamespace

import pytest

from backend.models.missao import Missao
from backend.models.objetivo import Objetivo
from backend.models.sonho import Sonho
from backend.services.exceptions import PermissaoNegadaError
from backend.services.montanha_service import MontanhaService


INSTANTE_TESTE = datetime(2026, 5, 20, 10, 0, 0)


class RepositorioMontanhaAgregadaFake:
    def __init__(self):
        self.sonhos = []
        self.objetivos = []
        self.missoes = []
        self.contextos = {}
        self.operacoes_lidas = 0

    def listar_sonhos_por_usuario(self, usuario_id):
        return [sonho for sonho in self.sonhos if sonho.usuario_id == usuario_id]

    def listar_objetivos_por_usuario(self, usuario_id):
        return [objetivo for objetivo in self.objetivos if objetivo.usuario_id == usuario_id]

    def carregar_dados_por_responsavel(self, responsavel_id):
        ids = {
            missao_id
            for missao_id, contexto in self.contextos.items()
            if contexto.get("responsavel_id") == responsavel_id
        }
        return [missao for missao in self.missoes if missao.missao_id in ids]

    def listar_operacoes_por_usuario(self, usuario_id):
        self.operacoes_lidas += 1
        return []

    def buscar_objetivo_por_id(self, objetivo_id):
        for objetivo in self.objetivos:
            if objetivo.objetivo_id == objetivo_id:
                return objetivo
        return None

    def atualizar_missao(self, missao_atualizada):
        for indice, missao in enumerate(self.missoes):
            if missao.missao_id == missao_atualizada.missao_id:
                self.missoes[indice] = missao_atualizada
                return

    def registrar_auditoria(self, evento):
        return None


def usuario_general():
    return SimpleNamespace(usuario_id=1, active_mode="general")


def test_montanha_agregada_retorna_sonhos_objetivos_e_ordens_em_uma_leitura():
    repo = RepositorioMontanhaAgregadaFake()
    sonho = Sonho(
        sonho_id=1,
        usuario_id=1,
        titulo="Campanha principal",
        tipo="principal",
        created_at=INSTANTE_TESTE,
        updated_at=INSTANTE_TESTE,
    )
    objetivo = Objetivo(
        objetivo_id=1,
        usuario_id=1,
        sonho_id=1,
        titulo="Tomar posição",
        progresso=20,
        created_at=INSTANTE_TESTE,
        updated_at=INSTANTE_TESTE,
    )
    missao = Missao(
        missao_id=1,
        titulo="Executar ordem",
        prioridade=1,
        prazo="20-05-2026",
        objetivo_id=1,
        user_id=1,
    )
    repo.sonhos.append(sonho)
    repo.objetivos.append(objetivo)
    repo.missoes.append(missao)
    repo.contextos[1] = {"responsavel_id": 1}

    payload = MontanhaService(repo, now_provider=lambda: INSTANTE_TESTE).obter_montanha(usuario_general())

    assert repo.operacoes_lidas == 1
    assert payload["sonhos"][0]["titulo"] == "Campanha principal"
    assert payload["objetivos"][0]["titulo"] == "Tomar posição"
    assert payload["missions"][0]["titulo"] == "Executar ordem"
    assert payload["missions"][0]["objetivo_id"] == 1
    assert payload["daily_missions"][0]["id"] == 1


def test_montanha_agregada_respeita_bloqueio_do_modo_soldado():
    repo = RepositorioMontanhaAgregadaFake()
    usuario = SimpleNamespace(usuario_id=1, active_mode="soldier")

    with pytest.raises(PermissaoNegadaError):
        MontanhaService(repo, now_provider=lambda: INSTANTE_TESTE).obter_montanha(usuario)
