from datetime import date, datetime, time, timedelta

from missao import StatusMissao


class RelatorioService:
    """Calcula relatórios semanais a partir do histórico persistido das missões."""

    def __init__(self, repositorio):
        self.repositorio = repositorio

    def get_weekly_report(self, user_id: int, start_date: date | None = None, end_date: date | None = None) -> dict:
        inicio, fim = self._resolve_intervalo(start_date, end_date)
        missoes = list(self.repositorio.carregar_dados_por_responsavel(user_id))

        consideradas = [
            missao
            for missao in missoes
            if self._pertence_a_semana(missao, inicio, fim)
        ]

        total = len(consideradas)
        concluidas = [m for m in consideradas if m.status == StatusMissao.CONCLUIDA]
        falhas = [
            m
            for m in consideradas
            if m.status in {
                StatusMissao.FALHA_PENDENTE_JUSTIFICATIVA,
                StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO,
                StatusMissao.FALHA_REVISADA,
            }
        ]
        falhas_decididas = [m for m in falhas if m.is_decided]
        aguardando_justificativa = [
            m for m in consideradas if m.status == StatusMissao.FALHA_PENDENTE_JUSTIFICATIVA
        ]
        aguardando_revisao = [
            m
            for m in consideradas
            if m.status == StatusMissao.FALHA_JUSTIFICADA_PENDENTE_REVISAO
        ]
        falhas_revisadas = [m for m in consideradas if m.status == StatusMissao.FALHA_REVISADA]
        motivos = [m.failure_reason for m in consideradas if m.failure_reason]

        return {
            "start_date": inicio.isoformat(),
            "end_date": fim.isoformat(),
            "total_missions": total,
            "completed_missions": len(concluidas),
            "failed_missions": len(falhas),
            "completion_rate": 0 if total == 0 else round((len(concluidas) / total) * 100, 2),
            "committed_missions_count": sum(1 for m in consideradas if m.is_decided),
            "committed_missions_failed": len(falhas_decididas),
            "missions_waiting_justification": len(aguardando_justificativa),
            "missions_waiting_review": len(aguardando_revisao),
            "reviewed_failures": len(falhas_revisadas),
            "failure_reasons": motivos,
        }

    def _pertence_a_semana(self, missao, inicio: date, fim: date) -> bool:
        if missao.due_date is not None and inicio <= missao.due_date <= fim:
            return True
        data_criacao = missao.created_at.date()
        return inicio <= data_criacao <= fim

    def _resolve_intervalo(self, start_date: date | None, end_date: date | None) -> tuple[date, date]:
        if start_date and end_date:
            if end_date < start_date:
                raise ValueError("Intervalo semanal inválido.")
            return start_date, end_date

        hoje = self._today()
        inicio = hoje - timedelta(days=hoje.weekday())
        fim = inicio + timedelta(days=6)
        return inicio, fim

    def _today(self) -> date:
        return datetime.combine(date.today(), time.min).date()
