# Design — gns-hub

Status: padrão visual inicial · 2026-10-12

## 1. Intenção visual

O hub deve parecer um centro de controle pessoal: **escuro, sóbrio, tecnológico e marcante**. Ciano e azul elétrico orientam o olhar. Vidro, neon e animações são parte reconhecível da identidade, mas cada efeito deve reforçar hierarquia, foco ou feedback. O conteúdo continua legível e fácil de percorrer.

Este documento é a referência visual para as futuras telas. A visão do produto e a estrutura de módulos estão em [System Design.md](System%20Design.md). Os valores abaixo são a primeira especificação e podem ser ajustados após um protótipo visual, mantendo nomes e papéis dos tokens.

## 2. Identidade

- Nome exibido: **gns-hub**. Usar caixa baixa na interface, com a grafia de marca `gns-hub`.
- Marca inicial: nome e símbolo geométrico simples, sem mascote ou ilustração obrigatórios. O símbolo deve funcionar em 20, 32 e 64 px, em uma cor e em negativo.
- Personalidade: precisa, controlável e futurista. Evitar excesso de decoração que concorra com ações e dados.
- Tema inicial: escuro. Tema claro pode ser estudado depois; não há paleta clara aprovada.

## 3. Paleta e papéis de cor

| Token | Valor inicial | Papel |
| --- | --- | --- |
| `bg.canvas` | `#070D16` | Fundo geral |
| `bg.surface` | `#101B2A` | Sidebar, painéis e cards sólidos |
| `bg.elevated` | `#172639` | Camadas elevadas, menus e modais |
| `border.default` | `#2B435B` | Divisórias e limites de componentes |
| `text.primary` | `#F3F9FF` | Títulos e conteúdo principal |
| `text.secondary` | `#ADC0D0` | Metadados, descrições e rótulos auxiliares |
| `accent.primary` | `#42D9F3` | Ação principal, seleção, foco e energia da marca |
| `accent.secondary` | `#4796FF` | Links, ações secundárias e gradientes de destaque |
| `text.on-accent` | `#07121D` | Texto/ícone sobre preenchimento ciano |
| `status.success` | `#56D7A0` | Sucesso |
| `status.warning` | `#FFCC66` | Atenção |
| `status.danger` | `#FF758F` | Erro e ação destrutiva |

**Proporção visual:** superfícies escuras dominam; acentos aparecem em ações, seleção e poucos pontos de energia. Não usar ciano em todos os cards. O gradiente ciano → azul é reservado para marca, ação de destaque ou estado ativo de alta importância.

**Contraste verificado nos pares principais:** texto principal sobre canvas ≈ 18,4:1; texto secundário sobre superfície ≈ 9,3:1; ciano sobre superfície ≈ 10,3:1; texto escuro sobre ciano ≈ 11,2:1. Validar novamente quando efeitos de transparência ou novas cores forem implementados.

## 4. Superfícies, vidro e luz

- Cards comuns usam `bg.surface` com borda `border.default` discreta. Superfícies sólidas são o padrão para leitura longa.
- Vidro é permitido na barra superior, na paleta de comandos, em painéis flutuantes e em poucos cards de destaque. Base sugerida: `rgba(16, 27, 42, 0.82)` sobre o canvas, `backdrop-filter: blur(16px)` e borda clara sutil. Fornecer fundo sólido quando o blur não existir.
- Glow é concentrado em foco, ação primária, item ativo e feedback transitório. Não aplicar halo contínuo a todos os elementos.
- Sombra de elevação: escura e difusa; luz colorida é um segundo detalhe, não o único indicador de interação.
- Mesmo sob vidro, textos e controles devem manter contraste suficiente contra o fundo real.

## 5. Tipografia

Usar a fonte de interface do sistema como base (`system-ui`, com fallbacks locais). Isso mantém leitura rápida e evita depender de um serviço de fontes. Monoespaçada do sistema pode aparecer em atalhos de teclado, IDs ou dados técnicos, nunca em parágrafos inteiros.

| Papel | Tamanho / entrelinha | Peso |
| --- | --- | --- |
| Título da página | 32 / 40 px | 650–700 |
| Título de seção | 22 / 30 px | 600–700 |
| Título de card | 17 / 24 px | 600 |
| Corpo | 15 / 24 px | 400–500 |
| Rótulo | 13 / 20 px | 500–600 |
| Microtexto | 12 / 18 px | 500; uso restrito |

Usar texto em português claro, com títulos curtos e rótulos que expressem a ação. Não depender de letras maiúsculas ou apenas da cor para comunicar hierarquia.

## 6. Geometria e espaçamento

- Escala de espaçamento: `4, 8, 12, 16, 24, 32, 48` px. Preferir `16–24` px dentro dos cards e `24–32` px entre grupos.
- Raios: `8` px para controles pequenos, `12` px para botões e campos, `16` px para cards, `20` px para modais. Cantos médios e respiro confortável são a regra.
- Bordas: 1 px. Usar linhas para agrupar conteúdo; não desenhar caixas aninhadas sem necessidade.
- Ícones: estilo linear simples, traço consistente, tamanho usual de 20 px. Um ícone isolado deve ter rótulo visível ou nome acessível.
- Área acionável mínima: 44 × 44 px em botões principais, ícones de ação e itens de navegação.

## 7. Layout responsivo

### Desktop amplo (a partir de 1280 px de largura)

- Sidebar fixa de aproximadamente 256 px à esquerda.
- Área principal flexível com largura máxima de conteúdo de 1440 px e padding horizontal de 32 px.
- Cabeçalho da área principal com título, contexto e ações; a entrada da busca/comandos deve ficar sempre fácil de encontrar.
- Cards podem ocupar uma grade de 2 a 4 colunas conforme conteúdo e largura, nunca para preencher espaço artificialmente.

### Notebook e janelas menores (aproximadamente 768–1279 px)

- Sidebar pode reduzir para trilho de cerca de 72 px, mantendo nomes via tooltip e acesso à navegação completa.
- Conteúdo usa padding de 24 px e grade de 1 a 2 colunas.
- Busca/comandos permanece acessível no cabeçalho e por atalho de teclado quando este for definido.
- Se a janela ficar estreita demais para o trilho, a navegação passa a um painel acionável. O comportamento para celular não faz parte do escopo inicial.

Os limiares são pontos de partida para protótipo, não valores que justifiquem quebrar um componente; ajustar pelo conteúdo real.

## 8. Navegação e busca por comandos

- Sidebar: marca no topo, áreas principais no meio, configurações e estado geral na base. Item ativo tem marcador ciano, fundo levemente elevado e texto legível; hover e foco são distintos.
- Área principal: uma hierarquia por tela — título, descrição curta se necessária, ação principal e conteúdo. Evitar múltiplos painéis competindo por destaque.
- Paleta de comandos: camada central elevada com campo de busca, resultados agrupados, ícone, título e descrição curta. Indicar claramente a seleção por teclado e a ação antes de executá-la.
- Ações potencialmente sensíveis devem pedir confirmação no fluxo apropriado. O design da paleta não implica permissão para executar comandos arbitrários.
- O atalho de teclado da paleta ainda será definido junto da plataforma; mostrar o atalho na interface somente depois dessa decisão.

## 9. Componentes base

### Botões

| Variante | Uso | Aparência |
| --- | --- | --- |
| Primário | Ação principal da região | Fundo ciano, texto escuro, altura 44 px, raio 12 px |
| Secundário | Ação útil sem competir com a principal | Fundo elevado, borda visível, texto claro |
| Terciário | Ações locais de baixa ênfase | Fundo transparente; hover com superfície elevada |
| Perigo | Ação destrutiva confirmada | Cor de perigo, rótulo explícito e confirmação quando necessária |

Cada botão deve ter estados **default, hover, foco, pressionado, carregando e desabilitado**. O foco usa contorno de 2 px em ciano com separação visual; não remover o indicador nativo sem substituí-lo. Carregando preserva tamanho e rótulo da ação sempre que possível.

### Cards

Card padrão: superfície escura, borda sutil, raio 16 px, padding 20–24 px. Título, descrição, estado e ação têm posições consistentes. Um card pode ser clicável inteiro ou conter ações internas; evitar as duas interações concorrentes sem uma hierarquia óbvia. Card ativo pode receber borda ciano e luz discreta.

### Campos e menus

Campo padrão: altura mínima 44 px, fundo elevado, borda visível, rótulo persistente e ajuda/erro abaixo. Placeholder não substitui rótulo. Menus e popovers usam a camada elevada, borda e sombra; abrem sem cobrir a ação que lhes deu origem quando houver espaço.

### Feedback e estados

- **Vazio:** explicar o que falta e oferecer próxima ação quando existir.
- **Carregando:** manter estrutura estável; usar skeleton discreto ou indicador local.
- **Sucesso:** confirmação breve, sem bloquear trabalho.
- **Erro:** dizer o que falhou e oferecer recuperação; não usar só vermelho ou só ícone.
- **Indisponível:** um módulo ou integração falha dentro de sua área, sem esconder o restante do hub.

## 10. Movimento e acessibilidade

- Transições de interação: 160–240 ms. Entrada de painel ou paleta: até 280 ms. Animação ambiental, se houver, deve ser lenta e pouco frequente.
- Usar movimento para abertura, fechamento, foco, confirmação e mudança de estado. Evitar loops chamativos atrás de conteúdo.
- Respeitar `prefers-reduced-motion`: remover translações e animações decorativas; manter feedback imediato sem movimento.
- Teclado deve alcançar navegação, busca, menus, modais e ações. Foco visível em todos os controles.
- Ícones, cor e brilho nunca são a única forma de transmitir estado. Manter rótulos, texto de erro e indicação de seleção.
- Testar contraste após aplicar transparência, gradientes e estados reais; os valores da paleta isolada não garantem contraste em toda composição.

## 11. Aplicação e evolução

Ao construir uma tela, começar pela estrutura do `System Design.md`; aplicar os tokens, componentes e estados deste arquivo. Caso uma necessidade nova exija outro token ou variante, definir papel e uso antes de adicioná-lo. Não criar uma cor ou raio exclusivo de uma tela sem motivo funcional.

### Ainda em aberto

- Símbolo exato da marca.
- Visual concreto da primeira tela, dependente das funcionalidades iniciais.
- Plataforma e atalho de teclado da paleta de comandos.
- Teste visual em protótipo para ajustar intensidade de glow, transparência e largura da sidebar.
