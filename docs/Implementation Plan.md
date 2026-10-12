# Plano de implementação — gns-hub

Status: sequência técnica inicial; primeira funcionalidade definida · 2026-10-12

**Entrega atual:** a ferramenta de áudio está funcional via frontend React/Vite e backend local Python; veja o [README principal](../README.md). As etapas abaixo registram a evolução planejada para Tauri/Rust e outras funções ainda não definidas.

Este plano transforma [System Design.md](System%20Design.md), [Technology.md](Technology.md), [Backend.md](Backend.md) e [Design.md](Design.md) em etapas verificáveis. Ele delimita a primeira ação local em [Audio Output.md](Audio%20Output.md); não autoriza outros comandos locais nem integrações ainda não definidas.

## Estrutura de código prevista

```text
apps/
  desktop/                 # React, TypeScript, Vite, Tailwind, componentes
    src/
      app/                 # casca, rotas, provedores mínimos
      components/          # componentes próprios e shadcn adaptado
      features/            # telas por funcionalidade
      lib/worker-client/   # contrato tipado com o núcleo Tauri
      styles/              # tokens de Design.md
    src-tauri/             # janela e ponte Rust para o worker
  worker/                  # processo Rust de fundo
crates/
  domain/                  # ações, validação, regras e interfaces
  protocol/                # mensagens versionadas entre Tauri e worker
docs/                     # arquitetura, design, tecnologia e planos
```

Nomes de pastas podem ser ajustados quando o scaffold real for criado. O importante é que UI, domínio, protocolo e adaptadores tenham responsabilidades separadas; o worker é o único escritor do banco.

## Etapa 1 — base visual e execução

- Criar o workspace com Tauri, React, TypeScript estrito e Vite; fixar versões e lockfiles.
- Aplicar cores, tipografia, espaçamento e estados de `Design.md` por tokens de tema do Tailwind.
- Adicionar só os componentes shadcn/ui necessários à casca; implementar sidebar, cabeçalho, área principal e estados básicos.
- Criar navegação declarativa quando houver mais de uma tela. Uma paleta visual pode inicialmente listar destinos sem executar ações.
- Testar janela em desktop e notebook no Linux Mint; revisar contraste, foco, teclado e movimento reduzido.

**Pronto quando:** a janela abre e fecha, a interface segue os tokens e não precisa de servidor Node em produção.

## Etapa 2 — worker e contrato seguro

- Criar o binário Rust de fundo, unidade `systemd --user` e IPC por socket Unix privado do usuário.
- Definir protocolo versionado e erros estruturados; a UI consulta saúde/versão do worker e exibe indisponibilidade.
- Criar registro de ações vazio, validação no worker e primeira migração SQLite.
- Testar reinício do worker, desconexão, janela fechada e reconexão ao abrir.

**Pronto quando:** o worker continua ativo com a janela fechada, não há porta HTTP aberta pelo hub, e a UI lida com worker ausente sem travar.

## Etapa 3 — primeira funcionalidade real: saída de áudio

- Implementar [Audio Output.md](Audio%20Output.md): descoberta de sinks/portas, seleção de qualquer saída, dois favoritos e troca rápida.
- Alterar o destino padrão e mover fluxos ativos, com validação de disponibilidade e resultado parcial explícito.
- Expor a ferramenta na interface e na paleta de comandos pelo mesmo registro de ações.
- Persistir favoritos, mostrar estados e registrar resultado sem identificadores físicos fixados no código.

**Pronto quando:** a função pode ser usada pelo teclado e mouse, falhas são recuperáveis e a execução obedece ao contrato de segurança.

## Etapa 4 — primeira automação e primeira API

- Escolher um caso concreto de automação que deva funcionar com a janela fechada; definir gatilho, timeout, cancelamento, repetição e retenção do histórico.
- Se houver integração por API, implementar adaptador com host permitido, segredo fora do banco, timeout, política de repetição e estado de erro.
- Testar acesso a credenciais depois do login e com a janela fechada.

**Pronto quando:** a tarefa funciona sem WebView, a interface mostra status ao reabrir e uma API indisponível não derruba o worker.

## Etapa 5 — medição e distribuição local

- Medir PSS e CPU com janela aberta/fechada, tempo de abertura e memória após uso prolongado, conforme `Technology.md`.
- Definir limite aceitável em MB a partir do computador do responsável; otimizar somente gargalos observados.
- Preparar pacote Linux adequado ao Mint e instalação/desinstalação da unidade do usuário.
- Validar migração e backup/exportação de dados sem credenciais, logs rotativos e recuperação de falhas.

**Pronto quando:** é possível instalar, iniciar o worker com o aplicativo, fechar a janela mantendo tarefas e remover o app sem deixar o serviço ativo indevidamente. Início automático no login, se escolhido, deve ser testado separadamente.

## Decisões de produto ainda necessárias

1. Outros atalhos e comandos além da primeira ferramenta de saída de áudio.
2. Primeira automação que justifica o worker residente.
3. Primeira API, se houver, e escopo dos dados acessados.
4. Limite de RAM aceitável e se o app deve iniciar automaticamente ao login.
5. Necessidade real de acesso remoto, contas, CMS, IA ou voz — nenhuma está no primeiro corte.

Essas escolhas não impedem o scaffold nem a primeira tela visual, mas impedem declarar as funcionalidades do produto como concluídas.
