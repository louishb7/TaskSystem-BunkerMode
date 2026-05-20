from datetime import datetime
from types import SimpleNamespace

import pytest

from objetivo import Objetivo
from services.objetivo_service import ObjetivoService
from services.sonho_service import SonhoService
from sonho import Sonho, TipoSonho


INSTANTE_TESTE = datetime(2026, 5, 20, 10, 0, 0)


class RepositorioMontanhaFake:
    def __init__(self):
        self.sonhos = []
        self.objetivos = []
        self.proximo_sonho_id = 1
        self.proximo_objetivo_id = 1

    def criar_sonho(self, sonho):
        sonho.atualizar_sonho_id(self.proximo_sonho_id)
        self.proximo_sonho_id += 1
        self.sonhos.append(sonho)

    def atualizar_sonho(self, sonho_atualizado):
        for indice, sonho in enumerate(self.sonhos):
            if sonho.sonho_id == sonho_atualizado.sonho_id:
                self.sonhos[indice] = sonho_atualizado
                return

    def promover_sonho_para_principal(self, usuario_id, sonho_id, instante):
        for sonho in self.sonhos:
            if sonho.usuario_id == usuario_id and sonho.esta_ativo() and sonho.tipo == TipoSonho.PRINCIPAL:
                sonho.definir_tipo(TipoSonho.SECUNDARIO, instante=instante)
        alvo = self.buscar_sonho_por_id(sonho_id)
        alvo.definir_tipo(TipoSonho.PRINCIPAL, instante=instante)

    def buscar_sonho_por_id(self, sonho_id):
        for sonho in self.sonhos:
            if sonho.sonho_id == sonho_id:
                return sonho
        return None

    def listar_sonhos_por_usuario(self, usuario_id):
        return [sonho for sonho in self.sonhos if sonho.usuario_id == usuario_id]

    def contar_sonhos_ativos_por_usuario(self, usuario_id):
        ativos = [sonho for sonho in self.sonhos if sonho.usuario_id == usuario_id and sonho.esta_ativo()]
        return {
            "total": len(ativos),
            "principal": len([sonho for sonho in ativos if sonho.tipo == TipoSonho.PRINCIPAL]),
            "secundario": len([sonho for sonho in ativos if sonho.tipo == TipoSonho.SECUNDARIO]),
        }

    def criar_objetivo(self, objetivo):
        objetivo.atualizar_objetivo_id(self.proximo_objetivo_id)
        self.proximo_objetivo_id += 1
        self.objetivos.append(objetivo)

    def atualizar_objetivo(self, objetivo_atualizado):
        for indice, objetivo in enumerate(self.objetivos):
            if objetivo.objetivo_id == objetivo_atualizado.objetivo_id:
                self.objetivos[indice] = objetivo_atualizado
                return

    def buscar_objetivo_por_id(self, objetivo_id):
        for objetivo in self.objetivos:
            if objetivo.objetivo_id == objetivo_id:
                return objetivo
        return None

    def listar_objetivos_por_usuario(self, usuario_id):
        return [objetivo for objetivo in self.objetivos if objetivo.usuario_id == usuario_id]

    def deletar_objetivo(self, objetivo_id, usuario_id):
        self.objetivos = [
            objetivo
            for objetivo in self.objetivos
            if not (objetivo.objetivo_id == objetivo_id and objetivo.usuario_id == usuario_id)
        ]


def usuario_general():
    return SimpleNamespace(usuario_id=1, active_mode="general")


def sonho_service(repo):
    return SonhoService(repo, now_provider=lambda: INSTANTE_TESTE)


def objetivo_service(repo):
    return ObjetivoService(repo, now_provider=lambda: INSTANTE_TESTE)


def criar_sonho(repo, tipo="secundario", titulo="Campanha"):
    sonho = Sonho(
        usuario_id=1,
        titulo=titulo,
        tipo=tipo,
        created_at=INSTANTE_TESTE,
        updated_at=INSTANTE_TESTE,
    )
    repo.criar_sonho(sonho)
    return sonho


def criar_objetivo(repo):
    objetivo = Objetivo(
        usuario_id=1,
        titulo="Tomar posição",
        progresso=20,
        created_at=INSTANTE_TESTE,
        updated_at=INSTANTE_TESTE,
    )
    repo.criar_objetivo(objetivo)
    return objetivo


def test_criar_sonho_principal_quando_ja_existe_lanca_erro():
    repo = RepositorioMontanhaFake()
    criar_sonho(repo, tipo="principal", titulo="Principal")

    with pytest.raises(ValueError, match="Já existe um sonho principal ativo."):
        sonho_service(repo).criar_sonho(
            usuario_general(),
            {"titulo": "Outro principal", "tipo": "principal"},
        )


def test_criar_sonho_com_quatro_ativos_lanca_erro():
    repo = RepositorioMontanhaFake()
    criar_sonho(repo, tipo="principal", titulo="Principal")
    criar_sonho(repo, titulo="Secundário 1")
    criar_sonho(repo, titulo="Secundário 2")
    criar_sonho(repo, titulo="Secundário 3")

    with pytest.raises(ValueError, match="Limite de quatro sonhos ativos atingido."):
        sonho_service(repo).criar_sonho(
            usuario_general(),
            {"titulo": "Excesso", "tipo": "secundario"},
        )


def test_arquivar_sonho_sem_justificativa_lanca_erro():
    repo = RepositorioMontanhaFake()
    sonho = criar_sonho(repo, tipo="principal")

    with pytest.raises(ValueError, match="Justificativa de arquivamento é obrigatória."):
        sonho_service(repo).arquivar_sonho(usuario_general(), sonho.sonho_id, " ")


def test_promover_para_principal_rebaixa_principal_atual():
    repo = RepositorioMontanhaFake()
    principal = criar_sonho(repo, tipo="principal", titulo="Campanha atual")
    secundario = criar_sonho(repo, tipo="secundario", titulo="Nova campanha")

    promovido = sonho_service(repo).promover_para_principal(usuario_general(), secundario.sonho_id)

    assert promovido["tipo"] == "principal"
    assert repo.buscar_sonho_por_id(principal.sonho_id).tipo == TipoSonho.SECUNDARIO


def test_atualizar_progresso_fora_de_zero_a_cem_lanca_erro():
    repo = RepositorioMontanhaFake()
    objetivo = criar_objetivo(repo)

    with pytest.raises(ValueError, match="Progresso do objetivo deve estar entre 0 e 100."):
        objetivo_service(repo).atualizar_progresso(usuario_general(), objetivo.objetivo_id, 120)


def test_atualizar_status_concluido_registra_concluded_at():
    repo = RepositorioMontanhaFake()
    objetivo = criar_objetivo(repo)

    atualizado = objetivo_service(repo).atualizar_status(
        usuario_general(),
        objetivo.objetivo_id,
        "concluido",
    )

    assert atualizado["status"] == "concluido"
    assert atualizado["concluded_at"] == INSTANTE_TESTE.isoformat()
