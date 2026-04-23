try:
    import psycopg
except ModuleNotFoundError:  # pragma: no cover
    psycopg = None

from auditoria import EventoAuditoria
from missao import Missao
from usuario import Usuario


class ErroRepositorio(ValueError):
    """Erro base para falhas de persistência do repositório."""


class DriverPostgresNaoInstaladoError(ErroRepositorio):
    """Erro levantado quando o driver do PostgreSQL não está disponível."""


class ConexaoRepositorioError(ErroRepositorio):
    """Erro levantado quando não é possível abrir conexão com o banco."""


class LeituraRepositorioError(ErroRepositorio):
    """Erro levantado quando a leitura de dados falha."""


class EscritaRepositorioError(ErroRepositorio):
    """Erro levantado quando uma operação de escrita falha."""


class MissaoNaoPersistidaError(ErroRepositorio):
    """Erro levantado quando a missão esperada não existe no banco."""


class UsuarioNaoPersistidoError(ErroRepositorio):
    """Erro levantado quando o usuário esperado não existe no banco."""


class RepositorioPostgres:
    """Responsável por carregar e persistir dados do BunkerMode no PostgreSQL."""

    def __init__(self, connection_string: str):
        self.connection_string = connection_string

    def _conectar(self):
        if psycopg is None:
            raise DriverPostgresNaoInstaladoError(
                "Driver psycopg não está instalado no ambiente atual."
            )
        try:
            return psycopg.connect(self.connection_string)
        except psycopg.Error as erro:
            raise ConexaoRepositorioError(
                "Não foi possível conectar ao banco de dados."
            ) from erro

    def inicializar_schema(self) -> None:
        comandos = [
            """
            CREATE TABLE IF NOT EXISTS usuarios (
                usuario_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                usuario TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                senha_hash TEXT NOT NULL,
                ativo BOOLEAN NOT NULL DEFAULT TRUE,
                nome_general TEXT NULL
            );
            """,
            """
            ALTER TABLE IF EXISTS usuarios
            ADD COLUMN IF NOT EXISTS nome_general TEXT NULL;
            """,
            """
            ALTER TABLE IF EXISTS missoes
            ADD COLUMN IF NOT EXISTS is_decided BOOLEAN NOT NULL DEFAULT FALSE;
            """,
            """
            CREATE TABLE IF NOT EXISTS missao_contextos (
                missao_id INTEGER PRIMARY KEY,
                criada_por_id INTEGER NULL REFERENCES usuarios(usuario_id) ON DELETE SET NULL,
                responsavel_id INTEGER NULL REFERENCES usuarios(usuario_id) ON DELETE SET NULL
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS auditoria_eventos (
                evento_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
                missao_id INTEGER NULL,
                usuario_id INTEGER NULL REFERENCES usuarios(usuario_id) ON DELETE SET NULL,
                acao TEXT NOT NULL,
                detalhes TEXT NOT NULL,
                criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
            );
            """,
        ]
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    for comando in comandos:
                        cursor.execute(comando)
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError(
                "Erro ao inicializar o schema complementar do banco de dados."
            ) from erro

    def _reconstruir_missao(self, linha: tuple) -> Missao:
        missao_id, titulo, prioridade, prazo, instrucao, status, is_decided = linha
        return Missao(
            missao_id=missao_id,
            titulo=titulo,
            prioridade=prioridade,
            prazo=prazo,
            instrucao=instrucao,
            status=status,
            is_decided=is_decided,
        )

    def _reconstruir_usuario(self, linha: tuple) -> Usuario:
        usuario_id, usuario, email, senha_hash, ativo, nome_general = linha
        return Usuario(
            usuario_id=usuario_id,
            usuario=usuario,
            email=email,
            senha_hash=senha_hash,
            ativo=ativo,
            nome_general=nome_general,
        )

    def _reconstruir_evento(self, linha: tuple) -> EventoAuditoria:
        evento_id, missao_id, usuario_id, acao, detalhes, criado_em = linha
        return EventoAuditoria(
            evento_id=evento_id,
            missao_id=missao_id,
            usuario_id=usuario_id,
            acao=acao,
            detalhes=detalhes,
            criado_em=criado_em,
        )

    def carregar_dados(self) -> list[Missao]:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT missao_id, titulo, prioridade, prazo, instrucao, status, is_decided
                        FROM missoes
                        ORDER BY prioridade, missao_id;
                        """
                    )
                    linhas = cursor.fetchall()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise LeituraRepositorioError(
                "Erro ao carregar missões do banco de dados."
            ) from erro
        return [self._reconstruir_missao(linha) for linha in linhas]

    def carregar_dados_por_responsavel(self, responsavel_id: int) -> list[Missao]:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT m.missao_id, m.titulo, m.prioridade, m.prazo, m.instrucao, m.status, m.is_decided
                        FROM missoes m
                        JOIN missao_contextos mc ON mc.missao_id = m.missao_id
                        WHERE mc.responsavel_id = %s
                        ORDER BY m.prioridade, m.missao_id;
                        """,
                        (responsavel_id,),
                    )
                    linhas = cursor.fetchall()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise LeituraRepositorioError(
                "Erro ao carregar missões do responsável no banco de dados."
            ) from erro
        return [self._reconstruir_missao(linha) for linha in linhas]

    def buscar_por_id(self, missao_id: int) -> Missao | None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT missao_id, titulo, prioridade, prazo, instrucao, status, is_decided
                        FROM missoes
                        WHERE missao_id = %s;
                        """,
                        (missao_id,),
                    )
                    linha = cursor.fetchone()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise LeituraRepositorioError(
                "Erro ao buscar missão no banco de dados."
            ) from erro
        return None if linha is None else self._reconstruir_missao(linha)

    def adicionar_missao(self, missao: Missao) -> None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO missoes (titulo, prioridade, prazo, instrucao, status, is_decided)
                        VALUES (%s, %s, %s, %s, %s, %s)
                        RETURNING missao_id;
                        """,
                        (
                            missao.titulo,
                            missao.prioridade.value,
                            missao.prazo_date,
                            missao.instrucao,
                            missao.status.value,
                            missao.is_decided,
                        ),
                    )
                    missao_id = cursor.fetchone()[0]
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError(
                "Erro ao adicionar missão no banco de dados."
            ) from erro
        missao.atualizar_missao_id(missao_id)

    def atualizar_missao(self, missao: Missao) -> None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        UPDATE missoes
                        SET titulo = %s,
                            prioridade = %s,
                            prazo = %s,
                            instrucao = %s,
                            status = %s,
                            is_decided = %s
                        WHERE missao_id = %s;
                        """,
                        (
                            missao.titulo,
                            missao.prioridade.value,
                            missao.prazo_date,
                            missao.instrucao,
                            missao.status.value,
                            missao.is_decided,
                            missao.missao_id,
                        ),
                    )
                    if cursor.rowcount == 0:
                        raise MissaoNaoPersistidaError(
                            f"Missão {missao.missao_id} não encontrada para atualização."
                        )
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError(
                "Erro ao atualizar missão no banco de dados."
            ) from erro

    def remover_missao(self, missao_id: int) -> None:
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        "DELETE FROM missoes WHERE missao_id = %s;",
                        (missao_id,),
                    )
                    if cursor.rowcount == 0:
                        raise MissaoNaoPersistidaError(
                            f"Missão {missao_id} não encontrada para remoção."
                        )

                    for tabela_auxiliar in ("missao_contextos", "auditoria_eventos"):
                        try:
                            cursor.execute(
                                f"DELETE FROM {tabela_auxiliar} WHERE missao_id = %s;",
                                (missao_id,),
                            )
                        except psycopg.Error:
                            pass
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError(
                "Erro ao remover missão do banco de dados."
            ) from erro

    def adicionar_usuario(self, usuario: Usuario) -> None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO usuarios (usuario, email, senha_hash, ativo)
                        VALUES (%s, %s, %s, %s)
                        RETURNING usuario_id;
                        """,
                        (
                            usuario.usuario,
                            usuario.email,
                            usuario.senha_hash,
                            usuario.ativo,
                        ),
                    )
                    usuario.usuario_id = cursor.fetchone()[0]
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError(
                "Erro ao adicionar usuário no banco de dados."
            ) from erro

    def buscar_usuario_por_email(self, email: str) -> Usuario | None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT usuario_id, usuario, email, senha_hash, ativo, nome_general
                        FROM usuarios
                        WHERE email = %s;
                        """,
                        (email.strip().lower(),),
                    )
                    linha = cursor.fetchone()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise LeituraRepositorioError(
                "Erro ao buscar usuário pelo email no banco de dados."
            ) from erro
        return None if linha is None else self._reconstruir_usuario(linha)

    def buscar_usuario_por_id(self, usuario_id: int) -> Usuario | None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT usuario_id, usuario, email, senha_hash, ativo, nome_general
                        FROM usuarios
                        WHERE usuario_id = %s;
                        """,
                        (usuario_id,),
                    )
                    linha = cursor.fetchone()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise LeituraRepositorioError(
                "Erro ao buscar usuário pelo ID no banco de dados."
            ) from erro
        return None if linha is None else self._reconstruir_usuario(linha)

    def atualizar_nome_general(self, usuario_id: int, nome_general: str) -> None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        UPDATE usuarios
                        SET nome_general = %s
                        WHERE usuario_id = %s;
                        """,
                        (nome_general.strip(), usuario_id),
                    )
                    if cursor.rowcount == 0:
                        raise UsuarioNaoPersistidoError(
                            f"Usuário {usuario_id} não encontrado para atualizar o nome do General."
                        )
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError(
                "Erro ao atualizar o nome do General no banco de dados."
            ) from erro

    def salvar_contexto_missao(
        self,
        missao_id: int,
        criada_por_id: int | None,
        responsavel_id: int | None,
    ) -> None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO missao_contextos (missao_id, criada_por_id, responsavel_id)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (missao_id)
                        DO UPDATE SET criada_por_id = EXCLUDED.criada_por_id,
                                      responsavel_id = EXCLUDED.responsavel_id;
                        """,
                        (missao_id, criada_por_id, responsavel_id),
                    )
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError(
                "Erro ao salvar contexto da missão no banco de dados."
            ) from erro

    def buscar_contexto_missao(self, missao_id: int) -> dict | None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        "SELECT criada_por_id, responsavel_id FROM missao_contextos WHERE missao_id = %s;",
                        (missao_id,),
                    )
                    linha = cursor.fetchone()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise LeituraRepositorioError(
                "Erro ao buscar contexto da missão no banco de dados."
            ) from erro
        if linha is None:
            return None
        criada_por_id, responsavel_id = linha
        return {
            "criada_por_id": criada_por_id,
            "responsavel_id": responsavel_id,
        }

    def registrar_auditoria(self, evento: EventoAuditoria) -> None:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        INSERT INTO auditoria_eventos (missao_id, usuario_id, acao, detalhes, criado_em)
                        VALUES (%s, %s, %s, %s, %s)
                        RETURNING evento_id;
                        """,
                        (
                            evento.missao_id,
                            evento.usuario_id,
                            evento.acao,
                            evento.detalhes,
                            evento.criado_em,
                        ),
                    )
                    evento.evento_id = cursor.fetchone()[0]
                conexao.commit()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise EscritaRepositorioError(
                "Erro ao registrar auditoria no banco de dados."
            ) from erro

    def listar_auditoria_por_missao(self, missao_id: int) -> list[EventoAuditoria]:
        self.inicializar_schema()
        try:
            with self._conectar() as conexao:
                with conexao.cursor() as cursor:
                    cursor.execute(
                        """
                        SELECT evento_id, missao_id, usuario_id, acao, detalhes, criado_em
                        FROM auditoria_eventos
                        WHERE missao_id = %s
                        ORDER BY criado_em, evento_id;
                        """,
                        (missao_id,),
                    )
                    linhas = cursor.fetchall()
        except ErroRepositorio:
            raise
        except psycopg.Error as erro:
            raise LeituraRepositorioError(
                "Erro ao listar auditoria da missão no banco de dados."
            ) from erro
        return [self._reconstruir_evento(linha) for linha in linhas]
