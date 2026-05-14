from datetime import date, datetime, timedelta

from missao import Missao
from operacao import Operacao
from services.exceptions import PermissaoNegadaError
from services.missao_service import LEGACY_DEFAULT_PRIORITY
from services.operational_day import operational_date_for


class OperacaoService:
    """Casos de uso da primeira versão de Operações."""

    def __init__(self, repositorio, now_provider=None):
        self.repositorio = repositorio
        self._now_provider = now_provider or datetime.now

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
            is_decided=dados.get("is_decided", False),
            created_at=self._now(),
        )
        self.repositorio.adicionar_operacao(operacao)
        return operacao.to_dict()

    def listar_operacoes(self, usuario=None) -> list[dict]:
        self._garantir_modo_general(usuario)
        operacoes = self.repositorio.listar_operacoes_por_usuario(usuario.usuario_id)
        operacoes = [self._reativar_se_periodo_nao_passou(operacao) for operacao in operacoes]
        return [operacao.to_dict() for operacao in operacoes]

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
            return operacao.to_dict()
        operacao.encerrar()
        self.repositorio.atualizar_operacao(operacao)
        return operacao.to_dict()

    def materializar_periodo(self, usuario=None, start_date=None, end_date=None) -> dict:
        if usuario is None:
            raise PermissaoNegadaError("Usuário não identificado para materializar operações.")
        inicio = self._parse_date(start_date, "Data inicial da materialização inválida.")
        fim = self._parse_date(end_date, "Data final da materialização inválida.")
        if fim < inicio:
            raise ValueError("Período de materialização inválido.")
        if (fim - inicio).days > 62:
            raise ValueError("Materialização limitada a 63 dias por chamada.")

        geradas = []
        operacoes = self.repositorio.listar_operacoes_por_usuario(usuario.usuario_id)
        for operacao in operacoes:
            operacao = self._reativar_se_periodo_nao_passou(operacao)
            if not operacao.esta_ativa():
                continue
            dia = inicio
            while dia <= fim:
                if operacao.cobre_data(dia):
                    existente = self.repositorio.buscar_missao_de_operacao_por_data(
                        operacao.operacao_id,
                        dia,
                    )
                    if existente is None:
                        missao = self._criar_missao_da_operacao(operacao, usuario, dia)
                        if missao is not None:
                            geradas.append(missao)
                dia += timedelta(days=1)

        return {"generated": len(geradas), "mission_ids": [missao.missao_id for missao in geradas]}

    def materializar_dia_operacional(self, usuario=None) -> dict:
        hoje = operational_date_for(self._now())
        return self.materializar_periodo(usuario=usuario, start_date=hoje, end_date=hoje)

    def _criar_missao_da_operacao(self, operacao: Operacao, usuario, dia: date) -> Missao | None:
        missao = Missao(
            titulo=operacao.ordem_titulo,
            prioridade=LEGACY_DEFAULT_PRIORITY,
            prazo=dia,
            instrucao=operacao.ordem_instrucao,
            is_decided=operacao.is_decided,
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
            from auditoria import EventoAuditoria

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
