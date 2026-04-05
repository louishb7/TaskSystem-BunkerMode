# BunkerMode

Sistema de gerenciamento de missões em Python com arquitetura modular, preparado para evolução para API.

## Estrutura

- **missao.py**  
  Entidade principal. Responsável por validação de prioridade e prazo, além das regras da missão.

- **gerenciador.py**  
  Camada de regras de negócio. Controla criação, edição, conclusão, remoção e listagem.

- **repositorio.py**  
  Persistência em JSON. Converte objetos em dados e vice-versa.

- **interface.py**  
  Responsável pela entrada e saída via terminal.

- **menu.py**  
  Orquestra o fluxo da aplicação (CLI).

- **main.py**  
  Ponto de entrada do sistema.

## Funcionalidades

- Criar missão
- Listar missões por prioridade
- Visualizar detalhes
- Editar missão
- Marcar como concluída
- Remover missão
- Gerar relatório (pendentes/concluídas)

## Execução

```bash
python main.py