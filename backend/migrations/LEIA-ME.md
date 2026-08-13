# migrations/

Este diretório não contém migrations ativas.

O schema atual do backend Python de referência é gerenciado pelo Alembic em
`alembic/versions/`. Os arquivos históricos manuais, se existirem em branches antigas, não
devem ser reaplicados.

Para subir o schema em um ambiente novo:

```bash
alembic upgrade head
```

Para o histórico de migrations ativas, consulte:

```bash
alembic/versions/
```
