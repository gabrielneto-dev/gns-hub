# Estado do projeto

Last updated: 2026-10-12
Latest checkpoint: `checkpoints/CP-20261012-1414-context-bootstrap.md`

## Objetivo atual

Desenvolver inicialmente um hub pessoal do computador com atalhos e funcionalidades simples, evoluindo-o conforme o uso.

## Existente e funcional

- Estrutura inicial de memória e instruções compartilhadas instalada.
- O propósito inicial foi informado pelo responsável e registrado em `CTX-FCT-20261012-desktop-hub-scope`.
- Especificações de arquitetura, visual e stack de trabalho estão em `docs/` (rota em `MAP.md`).
- Ainda não existem arquivos de implementação do produto.

## Em andamento

- Primeira ferramenta definida: troca de saída de áudio; automações e integrações por API ainda não definidas. Implementação ainda não iniciada.

## Bloqueios

- Outras ações, APIs e gatilhos de automação ainda não foram escolhidos.

## Decisões ativas

- Stack de trabalho do protótipo: React/TypeScript/Vite/Tauri e worker Rust independente no Linux Mint, sujeita a medição de RAM; veja `docs/Technology.md` e `docs/Backend.md`.

## Perguntas críticas

- `CTX-QUE-20261012-initial-features`: primeiras funcionalidades e requisitos dos atalhos.

## Próximos passos prováveis

1. Criar o scaffold e a casca visual conforme `docs/Implementation Plan.md`.
2. Implementar a ferramenta de saída de áudio descrita em `docs/Audio Output.md`, escolher a primeira automação e medir RAM antes de consolidar a stack.
