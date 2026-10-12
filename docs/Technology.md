# Tecnologia — stack inicial do gns-hub

Status: decisão de trabalho para o protótipo Linux, sujeita à medição de memória · 2026-10-12

## Implementação disponível

A versão funcional atual usa React/TypeScript/Vite no navegador e um servidor local Python que chama `pactl`; veja o [README principal](../README.md). Ela cobre a primeira ferramenta de áudio. A embalagem Tauri e o worker Rust descritos abaixo ainda são a arquitetura planejada e dependem de Rust e dos pacotes de desenvolvimento WebKitGTK no ambiente de compilação. Não há medição comparativa de RAM entre essas duas versões.

## Premissas confirmadas

- Primeira plataforma: Linux Mint, um usuário, no próprio computador. O ambiente inspecionado é Linux Mint 22.3 x86_64; validar se também será o ambiente final de instalação.
- Prioridade principal: baixa memória em uso contínuo.
- A janela pode ser fechada, mas automações precisam continuar executando durante a sessão do usuário.
- A primeira ação local é a troca de saída de áudio, definida em [Audio Output.md](Audio%20Output.md). As primeiras APIs ainda não foram escolhidas; criar a estrutura sem habilitar ações arbitrárias.
- O usuário tem preferência inicial por Next.js, Tailwind e componentes prontos, mas pediu comparação técnica antes da decisão.

## O que determina a memória

O consumo real depende do **conjunto de processos**: WebView ou navegador, núcleo do aplicativo, worker contínuo, eventual servidor Node e integrações. Vite e Tailwind são ferramentas de build; não ficam como processos próprios em produção. Next.js com exportação estática também não mantém um servidor Next, mas perde funções que exigem runtime de servidor. No Linux, Tauri usa WebKitGTK para a WebView, que também consome memória. Com a janela fechada, a meta é manter apenas o worker Rust ativo. Não há número de RAM confiável sem medição neste computador.

## Alternativas avaliadas

| Arranjo | Quando a janela está aberta | Quando está fechada | Avaliação |
| --- | --- | --- | --- |
| React/Vite no navegador + worker | Navegador + worker + eventual gateway local | Worker | Aproveita navegador aberto, mas comandos exigem uma API local exposta e protegida |
| **React/Vite/Tauri + worker** | Núcleo Tauri + WebView + worker | Worker | Melhor separação entre interface e trabalho contínuo, sem Node residente |
| Next estático/Tauri + worker | Núcleo Tauri + WebView + worker | Worker | Sem servidor Next em produção, mas Server Actions e rotas dinâmicas de runtime não funcionam; pouco ganho para este hub |
| Next com servidor local + worker | Node + navegador/janela + worker | Node se necessário para o serviço, além do worker | Útil apenas se o hub precisar de funções dinâmicas próprias do Next; maior complexidade operacional |

Esta é uma análise arquitetural, **não um benchmark**. Um Next estático não deve ser chamado de pesado apenas pelo nome; a diferença prática precisa ser medida. Para o produto descrito, suas funções específicas não resolvem uma necessidade atual, enquanto Vite produz a interface estática diretamente.

## Decisão de trabalho

**Interface:** React + TypeScript estrito + Vite + Tauri. **Backend contínuo:** worker independente em Rust, gerenciado por `systemd --user` no Linux Mint. A ponte nativa do Tauri fala com o worker por socket Unix; a UI não chama um servidor HTTP local nem acessa sistema/segredos diretamente. O desenho detalhado está em [Backend.md](Backend.md).

A decisão permanece sujeita ao protótipo e à medição. Se o custo da janela Tauri for alto para o uso real, a UI React pode ser executada no navegador, mas isso exigirá um gateway local com autenticação e política de origem antes de expor comandos. O worker e as regras de domínio não dependem da WebView.

## Dependências por necessidade

| Área | Escolha | Momento |
| --- | --- | --- |
| Navegação | React Router em modo declarativo | Quando houver mais de uma tela |
| Estilo | Tailwind com tokens de `Design.md` | Primeira tela |
| Componentes | shadcn/ui; copiar apenas componentes usados | Conforme cada tela |
| Ícones | Lucide; imports individuais | Conforme cada tela |
| Busca/comandos | cmdk | Quando a paleta for implementada |
| Persistência | SQLite embutido, de propriedade do worker | Primeiros dados persistentes, com migrações |
| Dados remotos | `fetch`/adaptador Rust simples | Primeira API; considerar cache dedicado apenas se necessário |
| Estado React | Estado local e contexto pequeno | Início; biblioteca global só diante de complexidade real |
| CMS | Nenhum | Reavaliar com caso editorial concreto |

Fixar versões e lockfiles na implementação. Não adicionar biblioteca de formulários, animação, cache ou estado por antecipação. Tailwind gera CSS com as classes utilizadas e não precisa de runtime próprio; seus tokens de tema devem refletir `Design.md`. shadcn/ui entrega código editável para adaptar botões, diálogos e menus ao padrão visual.

## CMS e configuração

Headless CMS administra conteúdo por API; não é uma biblioteca de componentes. Para atalhos, grupos e preferências de uma pessoa, a configuração deve acontecer dentro do hub. O worker guarda dados estruturados em SQLite sem servidor de banco separado. Payload integra Next/Node e banco; Directus é um serviço adicional e recomenda recursos de hospedagem substanciais. Nenhum dos dois oferece benefício demonstrado agora. Reavaliar somente se surgirem páginas ricas, publicação editorial, fluxos de conteúdo ou administração externa.

## Medição e critério de revisão

Com a primeira tela e o worker mínimo funcionando, medir no Linux-alvo:

1. PSS de todos os processos do arranjo, separando janela aberta e fechada. RSS somado conta páginas compartilhadas repetidamente.
2. Abertura fria, repouso após iniciar, repouso após 30 minutos e pico após navegação e busca repetidas.
3. CPU em repouso, tempo de abertura, tamanho do pacote e comportamento após suspender/retomar.
4. Custo incremental de uma aba se o navegador já estiver aberto, com o mesmo conteúdo e worker.

Definir um limite de RAM aceitável antes de julgar a medição. Se Tauri não atender, comparar uma UI Vite no navegador com o mesmo worker. Não inferir vantagem numérica de benchmarks de outra máquina.

## Pendências que dependem das primeiras funções

- Outras ações locais e seus níveis de permissão; a primeira ação de áudio já está definida.
- Primeira integração por API e onde suas credenciais serão guardadas.
- Quais automações devem executar em segundo plano e seus gatilhos.
- Limite de RAM em MB, distribuição final do Linux e formato do pacote.
- Conteúdo que justificaria reconsiderar um CMS.

## Fontes primárias

- [Next.js: exportação estática](https://nextjs.org/docs/app/guides/static-exports)
- [Tauri: frontend e recomendação de Vite](https://tauri.app/start/frontend/), [integração de Next.js](https://tauri.app/start/frontend/nextjs/) e [modelo de processos](https://v2.tauri.app/concept/process-model/)
- [Vite: build estático](https://vite.dev/guide/build)
- [Tailwind: tokens](https://tailwindcss.com/docs/theme) e [detecção de classes](https://tailwindcss.com/docs/detecting-classes-in-source-files)
- [shadcn/ui: código editável](https://ui.shadcn.com/docs), [React Router: modo declarativo](https://reactrouter.com/start/declarative/installation), [Lucide](https://lucide.dev/guide/react/) e [cmdk](https://github.com/dip/cmdk)
- [Payload: requisitos](https://payloadcms.com/docs/getting-started/installation) e [Directus: recursos de hospedagem](https://docs.directus.io/self-hosted/docker-guide)
- [Linux: PSS](https://man7.org/linux/man-pages/man5/proc_pid_smaps.5.html)
