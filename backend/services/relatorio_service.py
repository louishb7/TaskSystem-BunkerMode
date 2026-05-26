from datetime import date, datetime

from backend.services.exceptions import PermissaoNegadaError
from backend.services.operational_day import operational_date_for, operational_week_bounds


class RelatorioService:
    """Calcula relatórios semanais a partir do histórico persistido das missões."""

    def __init__(self, repositorio, now_provider=None):
        self.repositorio = repositorio
        self._now_provider = now_provider or datetime.now

    def get_weekly_report_for_user(
        self,
        usuario,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> dict:
        if usuario is not None and getattr(usuario, "active_mode", "general") != "general":
            raise PermissaoNegadaError(
                "Relatório semanal disponível apenas com o modo General ativo."
            )
        return self.get_weekly_report(usuario.usuario_id, start_date, end_date)

    def get_weekly_report(self, user_id: int, start_date: date | None = None, end_date: date | None = None) -> dict:
        inicio, fim = self._resolve_intervalo(start_date, end_date)
        missoes = list(self.repositorio.carregar_dados_por_responsavel(user_id))

        consideradas = [
            missao
            for missao in missoes
            if self._pertence_a_semana(missao, inicio, fim)
        ]

        total = len(consideradas)
        concluidas = [m for m in consideradas if m.is_completed()]
        falhas = [m for m in consideradas if m.is_failed()]

        return {
            "start_date": inicio.isoformat(),
            "end_date": fim.isoformat(),
            "total_missions": total,
            "completed_missions": len(concluidas),
            "failed_missions": len(falhas),
            "completion_rate": 0 if total == 0 else round((len(concluidas) / total) * 100, 2),
            "high_priority_missions": sum(1 for m in consideradas if m.is_pinned),
            "missions_waiting_justification": 0,
            "missions_waiting_review": 0,
            "reviewed_failures": len(falhas),
            "failure_reasons": [],
        }

    def _pertence_a_semana(self, missao, inicio: date, fim: date) -> bool:
        data_evento = missao.completed_at or missao.failed_at
        if data_evento is None:
            return False
        return inicio <= operational_date_for(data_evento) <= fim

    def _resolve_intervalo(self, start_date: date | None, end_date: date | None) -> tuple[date, date]:
        if (start_date is None) != (end_date is None):
            raise ValueError("Informe start_date e end_date juntos para filtrar o relatório.")
        if start_date and end_date:
            if end_date < start_date:
                raise ValueError("Intervalo semanal inválido.")
            return start_date, end_date

        return operational_week_bounds(self._today())

    def _today(self) -> date:
        return operational_date_for(self._now())

    def _now(self) -> datetime:
        return self._now_provider()
