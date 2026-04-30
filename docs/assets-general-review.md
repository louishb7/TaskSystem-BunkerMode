# Auditoria de assets para o General

Data: 2026-04-30

## Decisão visual

Os assets existentes foram inspecionados como imagens, não apenas listados. A família visual atual é forte, escura e agressiva, com muito preto, vermelho e figura híbrida General/Soldado. Isso funciona como marca e como referência de tensão, mas não deve dominar a tela do General, porque reforça o brutalismo do Soldado.

A tela do General deve usar:

- `mobile/src/assets/bunkermode/backgrounds/bg_bunker_reference.png` como textura discreta, em baixa opacidade, por ser pequeno e não carregar personagem ou texto.
- Os boards de marca apenas como inspiração de composição: linhas de mapa, moldura técnica e eixo central.
- Logos/personagens descartados para fundo, porque são pesados, agressivos ou contêm texto de referência.

## Imagens encontradas

| Asset | Dimensões | Tamanho | Tipo | Uso decidido |
| --- | ---: | ---: | --- | --- |
| `mobile/src/assets/bunkermode/backgrounds/bg_bunker_reference.png` | 230 x 210 | 88K | PNG RGB | Textura/fundo discreto do General, com scrim claro e opacidade baixa. |
| `mobile/src/assets/bunkermode/brand_board_full_reference.png` | 1536 x 1024 | 1.7M | PNG RGB | Inspiração visual. Grande e carregado demais para fundo mobile. |
| `mobile/src/assets/bunkermode/templates/brand_identity_board_v1.png` | 1254 x 1254 | 1.6M | PNG RGB | Inspiração visual. Muito preto/vermelho para o General. |
| `mobile/src/assets/bunkermode/logo/app_icon_reference.png` | 225 x 282 | 64K | PNG RGB | Descartado. Contém texto de referência e personagem agressivo. |
| `mobile/src/assets/bunkermode/logo/logo_main_reference.png` | 312 x 282 | 112K | PNG RGB | Descartado para UI principal. Contém texto de referência. |
| `mobile/src/assets/bunkermode/logo/logo_simple_reference.png` | 267 x 282 | 76K | PNG RGB | Descartado para fundo. Personagem/olho vermelho puxa para execução. |
| `mobile/src/assets/bunkermode/logo/logo_final_selected.png` | 2048 x 2048 | 4.0M | PNG RGBA | Descartado para mobile General. Pesado e dominante. |
| `mobile/src/assets/bunkermode/logo/logo_no_arrow_bunker_reference.png` | 1254 x 1254 | 1.4M | PNG RGB | Descartado para fundo. Forte demais e centrado no personagem. |

## Folha de contato

| Fundo | Marca | Templates |
| --- | --- | --- |
| <img src="../mobile/src/assets/bunkermode/backgrounds/bg_bunker_reference.png" width="160" /> | <img src="../mobile/src/assets/bunkermode/brand_board_full_reference.png" width="220" /> | <img src="../mobile/src/assets/bunkermode/templates/brand_identity_board_v1.png" width="180" /> |

| Logo app | Logo principal | Logo simples |
| --- | --- | --- |
| <img src="../mobile/src/assets/bunkermode/logo/app_icon_reference.png" width="120" /> | <img src="../mobile/src/assets/bunkermode/logo/logo_main_reference.png" width="140" /> | <img src="../mobile/src/assets/bunkermode/logo/logo_simple_reference.png" width="140" /> |

| Logo final | Logo sem seta |
| --- | --- |
| <img src="../mobile/src/assets/bunkermode/logo/logo_final_selected.png" width="200" /> | <img src="../mobile/src/assets/bunkermode/logo/logo_no_arrow_bunker_reference.png" width="180" /> |
