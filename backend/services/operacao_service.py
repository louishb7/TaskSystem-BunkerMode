from datetime import date, datetime, timedelta

from backend.models.missao import Missao, StatusMissao
from backend.models.operacao import Operacao
from backend.services.exceptions import PermissaoNegadaError
from backend.services.missao_service import LEGACY_DEFAULT_PRIORITY
from backend.services.operational_day import (
    calendar_date_for,
    now_in_operational_timezone,
    operational_date_for,
)


class OperacaoService:
    """Casos de uso da primeira versão de Operações."""

    def __init__(self, repositorio, now_provider=None):
        self.repositorio = repositorio
        self._now_provider = now_provider or now_in_operational_timezone

    def criar_operacao(self, dados: dict, usuario=None) -> dict:
        self._garantir_modo_general(usuario)
        operacao = Operacao(
            usuario_id=getattr(usuario, "usuario_id", None),
            nome=dados.get("nome"),
            descricao=dados.get("descricao"),
            start_date=dados.get("start_date"),
            end_date=dados.get("end_date"),
            weekdays=dados.get("weekdays"),
            ordem_titulo=dados.get("ordem_titulo"),
            ordem_instrucao=dados.get("ordem_instrucao"),
            created_at=self._now(),
        )
        self.repositorio.adicionar_operacao(operacao)
        return operacao.to_dict()

    def listar_operacoes(self, usuario=None) -> list[dict]:
        self._garantir_modo_general(usuario)
        operacoes = self.repositorio.listar_operacoes_por_usuario(usuario.usuario_id)
        operacoes = [self._reativar_se_periodo_nao_passou(operacao) for operacao in operacoes]
        return [self._operacao_to_response(operacao) for operacao in operacoes]

    def encerrar_operacao(self, operacao_id: int, usuario=None) -> dict:
        self._garantir_modo_general(usuario)
        operacao = self.repositorio.buscar_operacao_por_id(operacao_id)
        if operacao is None or operacao.usuario_id != usuario.usuario_id:
            raise ValueError("Operação não encontrada.")
        operacao = self._reativar_se_periodo_nao_passou(operacao)
        if self._periodo_nao_passou(operacao):
            raise ValueError(
                "Operação ainda está dentro do período registrado. Ela só pode ser encerrada após a data final."
            )
        if not operacao.esta_ativa():
            return self._operacao_to_response(operacao)
        operacao.encerrar()
        self.repositorio.atualizar_operacao(operacao)
        return self._operacao_to_response(operacao)

    def cancelar_operacao(self, operacao_id: int, usuario=None) -> None:
        self._garantir_modo_general(usuario)
        operacao = self.repositorio.buscar_operacao_por_id(operacao_id)
        if operacao is None or operacao.usuario_id != usuario.usuario_id:
            raise ValueError("Operação não encontrada.")
        self.repositorio.remover_operacao(operacao.operacao_id, usuario.usuario_id)

    def materializar_periodo(self, usuario=None, start_date=None, end_date=None) -> dict:
        if usuario is None:
            raise PermissaoNegadaError("Usuário não identificado para materializar operações.")
        inicio = self._parse_date(start_date, "Data inicial da materialização inválida.")
        fim = self._parse_date(end_date, "Data final da materialização inválida.")
        if fim < inicio:
            raise ValueError("Período de materialização inválido.")
        if (fim - inicio).days > 62:
            raise ValueError("Materialização limitada a 63 dias por chamada.")

        operacoes = self.repositorio.listar_operacoes_por_usuario(usuario.usuario_id)
        operacoes_ativas = [
            operacao
            for operacao in (
                self._reativar_se_periodo_nao_passou(operacao)
                for operacao in operacoes
            )
            if operacao.esta_ativa()
        ]
        dias_por_operacao = {}
        dias_consultados = set()
        for operacao in operacoes_ativas:
            dia = inicio
            while dia <= fim:
                if operacao.cobre_data(dia):
                    dias_por_operacao.setdefault(operacao.operacao_id, []).append(dia)
                    dias_consultados.add(dia)
                dia += timedelta(days=1)

        listar_chaves = getattr(self.repositorio, "listar_chaves_missoes_de_operacoes", None)
        chaves_existentes = (
            listar_chaves(
                [operacao.operacao_id for operacao in operacoes_ativas],
                list(dias_consultados),
            )
            if callable(listar_chaves)
            else set()
        )

        geradas = []
        for operacao in operacoes_ativas:
            for dia in dias_por_operacao.get(operacao.operacao_id, []):
                chave = (operacao.operacao_id, dia)
                if chave in chaves_existentes:
                    continue
                if not callable(listar_chaves):
                    existente = self.repositorio.buscar_missao_de_operacao_por_data(
                        operacao.operacao_id,
                        dia,
                    )
                    if existente is not None:
                        continue
                missao = self._criar_missao_da_operacao(operacao, usuario, dia)
                if missao is not None:
                    geradas.append(missao)
                    chaves_existentes.add(chave)

        return {
            "generated": len(geradas),
            "mission_ids": [missao.missao_id for missao in geradas],
        }

    def materializar_dia_operacional(self, usuario=None) -> dict:
        hoje = operational_date_for(self._now())
        return self.materializar_periodo(usuario=usuario, start_date=hoje, end_date=hoje)

    def materializar_turno_soldado(self, usuario=None) -> dict:
        agora = self._now()
        dia_operacional = operational_date_for(agora)
        dia_calendario = calendar_date_for(agora)
        if dia_calendario != dia_operacional:
            return self.materializar_periodo(
                usuario=usuario,
                start_date=dia_operacional,
                end_date=dia_calendario,
            )
        return self.materializar_periodo(
            usuario=usuario,
            start_date=dia_operacional,
            end_date=dia_operacional,
        )

    def _criar_missao_da_operacao(self, operacao: Operacao, usuario, dia: date) -> Missao | None:
        missao = Missao(
            titulo=operacao.ordem_titulo,
            prioridade=LEGACY_DEFAULT_PRIORITY,
            prazo=dia,
            instrucao=operacao.ordem_instrucao,
            is_pinned=operacao.is_pinned,
            user_id=usuario.usuario_id,
            operacao_id=operacao.operacao_id,
            operacao_nome=operacao.nome,
        )
        criar_idempotente = getattr(self.repositorio, "criar_missao_de_operacao_se_ausente", None)
        if callable(criar_idempotente):
            missao_criada = criar_idempotente(
                missao,
                usuario.usuario_id,
                usuario.usuario_id,
                operacao.operacao_id,
                dia,
            )
            if missao_criada is None:
                return None
            missao = missao_criada
        else:
            self.repositorio.adicionar_missao(missao)
            self.repositorio.salvar_contexto_missao(
                missao.missao_id,
                usuario.usuario_id,
                usuario.usuario_id,
                operacao_id=operacao.operacao_id,
                operacao_dia=dia,
            )
        registrar_auditoria = getattr(self.repositorio, "registrar_auditoria", None)
        if callable(registrar_auditoria):
            from backend.models.auditoria import EventoAuditoria

            registrar_auditoria(
                EventoAuditoria(
                    missao_id=missao.missao_id,
                    usuario_id=usuario.usuario_id,
                    acao="missao_operacao_gerada",
                    detalhes=f"Operação '{operacao.nome}' gerou a ordem '{missao.titulo}'.",
                )
            )
        return missao

    @staticmethod
    def _parse_date(valor, mensagem):
        if isinstance(valor, datetime):
            return valor.date()
        if isinstance(valor, date):
            return valor
        if isinstance(valor, str):
            texto = valor.strip()
            for formato in ("%Y-%m-%d", "%d-%m-%Y"):
                try:
                    return datetime.strptime(texto, formato).date()
                except ValueError:
                    pass
        raise ValueError(mensagem)

    @staticmethod
    def _garantir_modo_general(usuario) -> None:
        if usuario is not None and getattr(usuario, "active_mode", "general") != "general":
            raise PermissaoNegadaError(
                "Planejamento indisponível enquanto o modo Soldado estiver ativo."
            )

    def _now(self) -> datetime:
        return self._now_provider()

    def _hoje_operacional(self) -> date:
        return operational_date_for(self._now())

    def _periodo_nao_passou(self, operacao: Operacao) -> bool:
        return self._hoje_operacional() <= operacao.end_date

    def _reativar_se_periodo_nao_passou(self, operacao: Operacao) -> Operacao:
        if operacao.status == Operacao.STATUS_ENCERRADA and self._periodo_nao_passou(operacao):
            operacao.reativar()
            self.repositorio.atualizar_operacao(operacao)
        return operacao

    def _operacao_to_response(self, operacao: Operacao) -> dict:
        response = operacao.to_dict()
        response["metrics"] = self._calcular_metricas(operacao)
        return response

    def _calcular_metricas(self, operacao: Operacao) -> dict:
        listar = getattr(self.repositorio, "listar_missoes_por_operacao", None)
        missoes = listar(operacao.operacao_id) if callable(listar) else []
        total = len(missoes)
        concluidas = [m for m in missoes if m.is_completed() or self._feita_sem_registro(m)]
        falhas = [
            m
            for m in missoes
            if m.status
            in {
                StatusMissao.FALHA_PENDENTE_JUSTIFICATIVA,
                StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO,
                StatusMissao.FALHA_REVISADA,
            }
            and not self._feita_sem_registro(m)
        ]
        return {
            "total_missions": total,
            "completed_missions": len(concluidas),
            "failed_missions": len(falhas),
            "completion_rate": 0 if total == 0 else round((len(concluidas) / total) * 100, 2),
        }

    @staticmethod
    def _feita_sem_registro(missao: Missao) -> bool:
        return getattr(missao.failure_reason_type, "value", None) == "done_not_marked"
