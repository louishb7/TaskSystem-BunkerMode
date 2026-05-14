from datetime import date, datetime, timedelta

from missao import StatusMissao
from revisao import RevisaoSemanal
from services.exceptions import PermissaoNegadaError
from services.operational_day import operational_date_for
from services.relatorio_service import RelatorioService


class RevisaoService:
    """Fecha a revisão semanal do General a partir dos dados operacionais."""

    def __init__(self, repositorio, now_provider=None):
        self.repositorio = repositorio
        self._now_provider = now_provider or datetime.now
        self.relatorio_service = RelatorioService(repositorio)

    def obter_estado(self, usuario) -> dict:
        self._garantir_modo_general(usuario)
        periodo = self._semana_anterior()
        existente = self.repositorio.buscar_revisao_por_periodo(
            usuario.usuario_id,
            periodo[0],
            periodo[1],
        )
        leitura = self._montar_leitura(usuario.usuario_id, periodo[0], periodo[1])
        total_operacional = leitura["report"]["total_missions"] + leitura["pending_missions"]
        pendente = existente is None and total_operacional > 0

        return {
            "pending": pendente,
            "period": {
                "start_date": periodo[0].isoformat(),
                "end_date": periodo[1].isoformat(),
            },
            "review": None if existente is None else existente.to_dict(),
            "reading": leitura,
        }

    def listar_revisoes(self, usuario) -> list[dict]:
        self._garantir_modo_general(usuario)
        return [
            revisao.to_dict()
            for revisao in self.repositorio.listar_revisoes_semanais(usuario.usuario_id)
        ]

    def fechar_revisao(self, usuario, observacao: str | None = None) -> dict:
        self._garantir_modo_general(usuario)
        periodo = self._semana_anterior()
        existente = self.repositorio.buscar_revisao_por_periodo(
            usuario.usuario_id,
            periodo[0],
            periodo[1],
        )
        if existente is not None:
            return existente.to_dict()

        leitura = self._montar_leitura(usuario.usuario_id, periodo[0], periodo[1])
        resumo = self._resumo_operacional(leitura)
        revisao = RevisaoSemanal(
            usuario_id=usuario.usuario_id,
            start_date=periodo[0],
            end_date=periodo[1],
            reviewed_at=self._now(),
            resumo_operacional=resumo,
            completed_missions=leitura["report"]["completed_missions"],
            pending_missions=leitura["pending_missions"],
            failed_missions=leitura["report"]["failed_missions"],
            committed_missions_failed=leitura["report"]["committed_missions_failed"],
            observacao=observacao,
        )
        self.repositorio.salvar_revisao_semanal(revisao)
        return revisao.to_dict()

    def _montar_leitura(self, usuario_id: int, start_date: date, end_date: date) -> dict:
        report = self.relatorio_service.get_weekly_report(usuario_id, start_date, end_date)
        missoes = list(self.repositorio.carregar_dados_por_responsavel(usuario_id))
        pendentes = [
            missao
            for missao in missoes
            if missao.is_pending() and self._missao_no_periodo_por_prazo(missao, start_date, end_date)
        ]
        falhas = [
            missao
            for missao in missoes
            if self._falha_contabilizavel(missao)
            and self._missao_no_periodo_por_evento(missao, start_date, end_date)
        ]
        decididas_quebradas = [missao for missao in falhas if missao.is_decided]

        return {
            "report": report,
            "pending_missions": len(pendentes),
            "failures": [missao.to_dict() for missao in falhas],
            "broken_decided": [missao.to_dict() for missao in decididas_quebradas],
            "operational_history": [
                missao.to_dict()
                for missao in missoes
                if self._missao_no_periodo_por_evento(missao, start_date, end_date)
                or self._missao_no_periodo_por_prazo(missao, start_date, end_date)
            ],
        }

    def _resumo_operacional(self, leitura: dict) -> str:
        report = leitura["report"]
        total = report["total_missions"] + leitura["pending_missions"]
        return (
            f"{report['completed_missions']} executadas, "
            f"{leitura['pending_missions']} pendentes, "
            f"{report['failed_missions']} falhas em {total} ordens analisadas."
        )

    def _semana_anterior(self) -> tuple[date, date]:
        hoje = operational_date_for(self._now())
        inicio_semana_atual = hoje - timedelta(days=hoje.weekday())
        fim = inicio_semana_atual - timedelta(days=1)
        inicio = fim - timedelta(days=6)
        return inicio, fim

    def _missao_no_periodo_por_prazo(self, missao, start_date: date, end_date: date) -> bool:
        return missao.due_date is not None and start_date <= missao.due_date <= end_date

    def _missao_no_periodo_por_evento(self, missao, start_date: date, end_date: date) -> bool:
        data_evento = missao.completed_at or missao.failed_at
        if data_evento is None:
            return False
        data_operacional = operational_date_for(data_evento)
        return start_date <= data_operacional <= end_date

    def _falha_contabilizavel(self, missao) -> bool:
        if getattr(missao.failure_reason_type, "value", None) == "done_not_marked":
            return False
        if missao.status not in {
            StatusMissao.FALHA_PENDENTE_JUSTIFICATIVA,
            StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO,
            StatusMissao.FALHA_REVISADA,
        }:
            return False
        return True

    def _garantir_modo_general(self, usuario) -> None:
        if usuario is not None and getattr(usuario, "active_mode", "general") != "general":
            raise PermissaoNegadaError(
                "Revisão do General disponível apenas com o modo General ativo."
            )

    def _now(self) -> datetime:
        return self._now_provider()
