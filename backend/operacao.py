from datetime import date, datetime


class Operacao:
    """Representa um período fechado de foco definido pelo General."""

    STATUS_ATIVA = "ativa"
    STATUS_ENCERRADA = "encerrada"

    def __init__(
        self,
        operacao_id=None,
        usuario_id=None,
        nome=None,
        descricao=None,
        start_date=None,
        end_date=None,
        weekdays=None,
        ordem_titulo=None,
        ordem_instrucao=None,
        is_pinned=False,
        status=STATUS_ATIVA,
        created_at=None,
    ):
        self.operacao_id = self._validar_id(operacao_id, "Operação inválida.")
        self.usuario_id = self._validar_id(usuario_id, "Usuário da operação inválido.", obrigatorio=True)
        self.nome = self._validar_texto_obrigatorio(nome, "Nome da operação é obrigatório.")
        self.descricao = self._validar_texto_opcional(descricao)
        self.start_date = self._validar_data(start_date, "Data inicial da operação inválida.")
        self.end_date = self._validar_data(end_date, "Data final da operação inválida.")
        if self.end_date < self.start_date:
            raise ValueError("Data final da operação deve ser igual ou posterior à data inicial.")
        self.weekdays = self._validar_weekdays(weekdays)
        self.ordem_titulo = self._validar_texto_obrigatorio(
            ordem_titulo,
            "Título da ordem da operação é obrigatório.",
        )
        self.ordem_instrucao = self._validar_texto_opcional(ordem_instrucao)
        self.is_pinned = bool(is_pinned)
        self.status = self._validar_status(status)
        self.created_at = self._validar_datetime(created_at)

    def atualizar_operacao_id(self, operacao_id):
        self.operacao_id = self._validar_id(operacao_id, "Operação inválida.")

    def esta_ativa(self):
        return self.status == self.STATUS_ATIVA

    def cobre_data(self, data: date):
        return (
            self.esta_ativa()
            and self.start_date <= data <= self.end_date
            and data.weekday() in self.weekdays
        )

    def encerrar(self):
        self.status = self.STATUS_ENCERRADA

    def reativar(self):
        self.status = self.STATUS_ATIVA

    def to_dict(self):
        return {
            "id": self.operacao_id,
            "usuario_id": self.usuario_id,
            "nome": self.nome,
            "descricao": self.descricao,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "weekdays": self.weekdays,
            "ordem_titulo": self.ordem_titulo,
            "ordem_instrucao": self.ordem_instrucao,
            "is_pinned": self.is_pinned,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
        }

    @staticmethod
    def _validar_id(valor, mensagem, obrigatorio=False):
        if valor is None:
            if obrigatorio:
                raise ValueError(mensagem)
            return None
        try:
            convertido = int(valor)
        except (TypeError, ValueError) as erro:
            raise ValueError(mensagem) from erro
        if convertido <= 0:
            raise ValueError(mensagem)
        return convertido

    @staticmethod
    def _validar_texto_obrigatorio(valor, mensagem):
        if valor is None:
            raise ValueError(mensagem)
        texto = str(valor).strip()
        if not texto:
            raise ValueError(mensagem)
        return texto

    @staticmethod
    def _validar_texto_opcional(valor):
        if valor is None:
            return None
        texto = str(valor).strip()
        return texto or None

    @staticmethod
    def _validar_data(valor, mensagem):
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
    def _validar_weekdays(valores):
        if not isinstance(valores, list) or not valores:
            raise ValueError("Selecione ao menos um dia de execução.")
        dias = []
        for valor in valores:
            try:
                dia = int(valor)
            except (TypeError, ValueError) as erro:
                raise ValueError("Dia de execução inválido.") from erro
            if dia < 0 or dia > 6:
                raise ValueError("Dia de execução inválido.")
            if dia not in dias:
                dias.append(dia)
        return sorted(dias)

    @classmethod
    def _validar_status(cls, status):
        texto = str(status or "").strip().lower()
        if texto not in {cls.STATUS_ATIVA, cls.STATUS_ENCERRADA}:
            raise ValueError("Status da operação inválido.")
        return texto

    @staticmethod
    def _validar_datetime(valor):
        if valor is None:
            return datetime.now()
        if isinstance(valor, datetime):
            return valor
        if isinstance(valor, str):
            try:
                return datetime.fromisoformat(valor)
            except ValueError as erro:
                raise ValueError("Data de criação da operação inválida.") from erro
        raise ValueError("Data de criação da operação inválida.")
