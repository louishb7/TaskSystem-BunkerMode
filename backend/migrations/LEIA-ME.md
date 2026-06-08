# migrations/

Os arquivos .sql neste diretório são o histórico do schema manual antes da adoção do
Alembic.

Eles NAO devem ser aplicados manualmente.
O schema atual e gerenciado exclusivamente pelo Alembic.

Para subir o schema em um ambiente novo:

```bash
alembic upgrade head
```

Para o histórico de migrations ativas, consulte:

```bash
alembic/versions/
```
