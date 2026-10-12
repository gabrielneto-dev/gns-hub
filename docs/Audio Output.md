# Ferramenta: saída de áudio

Status: primeira funcionalidade implementada no aplicativo local; pacote Tauri pendente · 2026-10-12

## Objetivo

Permitir escolher a saída de som do Linux Mint sem abrir as configurações do sistema. O usuário pode alternar rapidamente entre **dois destinos favoritos** e também escolher **qualquer saída disponível** em uma lista. A troca deve afetar o áudio que já está tocando, além de definir o destino para novos áudios.

## Escopo da primeira versão

- Listar saídas de reprodução detectadas, com nomes legíveis, tipo quando identificável, disponibilidade e indicação da saída ativa.
- Tratar como destinos distintos tanto saídas separadas (por exemplo, Bluetooth, USB ou HDMI) quanto portas de uma mesma saída (por exemplo, alto-falantes e fone P2).
- Selecionar uma saída pela lista; definir dois favoritos e alternar entre eles por um botão de troca rápida.
- Atualizar a saída padrão e mover imediatamente os fluxos de reprodução ativos para a saída escolhida.
- Informar quando um favorito estiver desconectado ou uma porta indisponível; não escolher outro destino silenciosamente.
- Atualizar o estado ao abrir a tela, ao voltar o foco e após uma troca. Um comando de atualização manual cobre mudanças de hardware enquanto a tela está aberta; observação automática de hotplug pode ser adicionada depois.

## Fora do escopo inicial

- Troca de microfone/entrada, volume, mute, perfil Bluetooth, mixer por aplicativo e regras automáticas por horário ou conexão.
- Executar comandos de shell escritos pelo usuário.
- Controle remoto ou operação para vários usuários.

## Descoberta relevante no ambiente-alvo

O Linux Mint inspecionado expõe PulseAudio sobre PipeWire. Nele, saídas Bluetooth são sinks separados; alto-falantes e fone P2 podem ser portas do **mesmo sink**. Portanto, uma implementação que só troca o sink padrão não atende todos os casos. Não persistir nomes físicos, endereços Bluetooth ou IDs observados neste computador na documentação pública. IDs numéricos de sink e stream mudam entre sessões e não devem ser usados como favoritos persistentes.

## Experiência de interface

Na tela ou card **Áudio**, mostrar o destino atual e um botão **Trocar saída**. Abaixo, oferecer uma lista de destinos com nome, estado (ativo, disponível ou indisponível) e ação **Selecionar**. O usuário pode marcar até dois destinos como favoritos, um de cada vez; o botão só fica habilitado com dois favoritos disponíveis. Se o destino atual for um deles, o botão seleciona o outro. Se não for, seleciona o último favorito usado; sem histórico, seleciona o primeiro na ordem configurada. Se um favorito estiver indisponível, o botão fica desabilitado e explica por quê, mas a lista continua utilizável. Após uma troca, mostrar sucesso ou erro específico, inclusive quando parte dos fluxos não pôde ser movida.

A paleta de comandos pode expor as ações **Selecionar saída de áudio…** e **Trocar entre favoritos**. Ela usa o mesmo registro de ações da tela, sem duplicar lógica. Componentes, cores, foco e estados seguem `Design.md`.

## Contrato com o worker

| Operação | Entrada | Saída |
| --- | --- | --- |
| `audio.list_outputs` | nenhuma | destinos detectados, disponibilidade, ativo, favoritos |
| `audio.set_output` | ID lógico de um destino listado | destino final, quantidade de fluxos movidos, avisos |
| `audio.set_favorites` | até dois IDs lógicos distintos, em ordem | favoritos gravados ou erro de validação |
| `audio.toggle_favorite` | nenhuma | resultado de `set_output` ou motivo de indisponibilidade |

Os IDs lógicos apresentados à UI vêm de uma enumeração recente. O worker associa cada destino a `sink.name` e, quando existir, `port.name`; verifica tudo novamente antes de executar. Favoritos são guardados por chaves simbólicas, nunca por índices numéricos. Se uma mudança de perfil ou reconexão alterar a chave, o favorito é mostrado como não resolvido e pode ser reassociado pelo usuário.

## Algoritmo inicial para PipeWire/PulseAudio

1. Consultar `pactl -f json list sinks`, `pactl get-default-sink` e os fluxos atuais. Transformar cada sink/porta relevante em um destino lógico. `availability: not available` impede seleção; disponibilidade desconhecida exige tentativa controlada e erro claro se falhar.
2. Ao selecionar, enumerar novamente para evitar IDs obsoletos e validar que o destino ainda existe. Para uma porta, chamar `pactl set-sink-port <sink> <port>`. Definir `pactl set-default-sink <sink>` para novos fluxos.
3. Consultar os `sink-inputs` em reprodução e, quando o sink mudou, chamar `pactl move-sink-input <id> <sink>` para cada um. Se a troca foi só de porta no mesmo sink, os fluxos já usam esse sink e não precisam ser movidos entre sinks.
4. Reconsultar sink padrão e porta ativa. Retornar sucesso completo ou parcial. Se um fluxo desapareceu durante a troca, tratar como condição transitória; outras falhas são informadas sem fingir que houve troca completa.

`pactl` será invocado com executável e argumentos separados, sem `sh -c`. Os parâmetros vêm apenas de destinos enumerados e validados pelo worker. Limitar duração e tamanho da saída. O adaptador de áudio ficará atrás de uma interface para permitir implementação nativa PipeWire no futuro, se o CLI se mostrar frágil ou custoso.

## Comportamentos de erro

| Situação | Resposta esperada |
| --- | --- |
| Fone Bluetooth desconectado ou favorito ausente | Desabilitar troca para ele; manter seleção atual e oferecer lista |
| Porta P2 indisponível | Mostrar como indisponível; não forçar perfil nem selecionar automaticamente |
| Servidor de áudio inacessível | Informar falha de conexão; não alterar favoritos nem apresentar estado antigo como atual |
| Fluxo termina durante a mudança | Continuar os demais; relatar apenas falhas relevantes |
| Mudança de porta/sink falha | Mostrar motivo e reconsultar o estado real antes de atualizar a UI |
| Aplicativo fixa sua própria saída | Informar que alguns aplicativos podem ignorar ou recriar o destino; não prometer controle absoluto sobre clientes externos |

## Critérios de aceitação

1. A lista distingue alto-falantes, fone P2, Bluetooth, USB e HDMI quando aparecerem como destinos disponíveis, sem expor IDs técnicos como rótulos principais.
2. Alternar entre duas saídas conectadas muda o padrão e o áudio de um aplicativo já reproduzindo, sem alterar microfone.
3. Alternar entre alto-falantes e fone P2 funciona mesmo quando compartilham o mesmo sink.
4. Desconectar um favorito mantém o outro e mostra indisponibilidade clara; reconectar permite nova seleção após atualização.
5. A troca rápida é acessível por teclado e não executa uma ação diferente da lista.
6. Nenhum nome/endereço de dispositivo desta máquina fica fixado no código ou nos documentos públicos.

## Fontes técnicas

- [Manual de `pactl`: listagem JSON, default sink, porta e movimento de fluxos](https://manpages.debian.org/bookworm/pulseaudio-utils/pactl.1.en.html)
- [WirePlumber: `wpctl` e comportamento do dispositivo padrão](https://pipewire.pages.freedesktop.org/wireplumber/man/wpctl.html)
