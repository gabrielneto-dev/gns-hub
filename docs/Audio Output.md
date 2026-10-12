# Ferramenta: saída de áudio

Status: primeira funcionalidade implementada no aplicativo local; pacote Tauri pendente · 2026-10-12

## Objetivo

Permitir escolher a saída de som do Linux Mint sem abrir as configurações do sistema. O usuário pode percorrer uma **fila ordenada de destinos favoritos** e escolher qualquer saída disponível e visível na lista. A troca deve afetar o áudio que já está tocando, além de definir o destino para novos áudios.

## Escopo da primeira versão

- Listar saídas de reprodução detectadas, com nomes legíveis, tipo quando identificável, disponibilidade e indicação da saída ativa.
- Tratar como destinos distintos tanto saídas separadas (por exemplo, Bluetooth, USB ou HDMI) quanto portas de uma mesma saída (por exemplo, alto-falantes e fone P2).
- Selecionar uma saída pela lista; definir uma fila ordenada de favoritos e avançar circularmente por ela pelo botão de troca rápida.
- Mostrar na tela principal somente destinos disponíveis e não ocultados pelo usuário. Permitir renomear cada destino e gerenciar/restaurar os ocultos em uma área separada.
- Atualizar a saída padrão e mover imediatamente os fluxos de reprodução ativos para a saída escolhida.
- Pular temporariamente favoritos desconectados ou ocultos na fila; permitir consultar dispositivos indisponíveis em **Gerenciar**.
- Atualizar o estado ao abrir a tela, ao voltar o foco e após uma troca. Um comando de atualização manual cobre mudanças de hardware enquanto a tela está aberta; observação automática de hotplug pode ser adicionada depois.

## Fora do escopo inicial

- Troca de microfone/entrada, volume, mute, perfil Bluetooth, mixer por aplicativo e regras automáticas por horário ou conexão.
- Executar comandos de shell escritos pelo usuário.
- Controle remoto ou operação para vários usuários.

## Descoberta relevante no ambiente-alvo

O Linux Mint inspecionado expõe PulseAudio sobre PipeWire. Nele, saídas Bluetooth são sinks separados; alto-falantes e fone P2 podem ser portas do **mesmo sink**. Portanto, uma implementação que só troca o sink padrão não atende todos os casos. Não persistir nomes físicos, endereços Bluetooth ou IDs observados neste computador na documentação pública. IDs numéricos de sink e stream mudam entre sessões e não devem ser usados como favoritos persistentes.

## Experiência de interface

Na tela ou card **Áudio**, mostrar o destino atual e um botão **Próxima saída**. A lista principal contém só saídas disponíveis e visíveis, com nome personalizado quando houver. A área **Gerenciar** permite ocultar/restaurar saídas e consultar as desconectadas. Favoritos formam uma fila ordenável. O botão avança para a próxima saída disponível e visível, voltando ao início após a última; com menos de duas elegíveis, fica desabilitado. Se a saída atual não estiver na fila, começa pela primeira. Favoritos desconectados ou ocultos permanecem salvos, mas são pulados até voltarem a ficar elegíveis. Após uma troca, mostrar sucesso ou erro específico, inclusive quando parte dos fluxos não pôde ser movida.

A paleta de comandos pode expor as ações **Selecionar saída de áudio…** e **Trocar entre favoritos**. Ela usa o mesmo registro de ações da tela, sem duplicar lógica. Componentes, cores, foco e estados seguem `Design.md`.

## Contrato com o worker

| Operação | Entrada | Saída |
| --- | --- | --- |
| `audio.list_outputs` | nenhuma | destinos detectados, disponibilidade, ativo, favoritos |
| `audio.set_output` | ID lógico de um destino listado | destino final, quantidade de fluxos movidos, avisos |
| `audio.set_favorites` | IDs lógicos distintos, em ordem | fila gravada ou erro de validação |
| `audio.toggle_favorite` | nenhuma | resultado de `set_output` ou motivo de indisponibilidade |
| `audio.rename_output` | ID lógico e nome personalizado, vazio para restaurar | estado atualizado |
| `audio.set_visibility` | ID lógico e visibilidade | estado atualizado |

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
| Fone Bluetooth desconectado ou favorito ausente | Pular na fila; mantê-lo salvo para quando voltar a ficar disponível |
| Porta P2 indisponível | Mostrar somente em **Gerenciar**; não forçar perfil nem selecionar automaticamente |
| Servidor de áudio inacessível | Informar falha de conexão; não alterar favoritos nem apresentar estado antigo como atual |
| Fluxo termina durante a mudança | Continuar os demais; relatar apenas falhas relevantes |
| Mudança de porta/sink falha | Mostrar motivo e reconsultar o estado real antes de atualizar a UI |
| Aplicativo fixa sua própria saída | Informar que alguns aplicativos podem ignorar ou recriar o destino; não prometer controle absoluto sobre clientes externos |

## Critérios de aceitação

1. A lista distingue alto-falantes, fone P2, Bluetooth, USB e HDMI quando aparecerem como destinos disponíveis, sem expor IDs técnicos como rótulos principais.
2. Alternar entre duas saídas conectadas muda o padrão e o áudio de um aplicativo já reproduzindo, sem alterar microfone.
3. Alternar entre alto-falantes e fone P2 funciona mesmo quando compartilham o mesmo sink.
4. Desconectar um favorito preserva sua configuração e o retira temporariamente da rotação; reconectar permite nova seleção após atualização.
5. A troca rápida é acessível por teclado e não executa uma ação diferente da lista.
6. Nenhum nome/endereço de dispositivo desta máquina fica fixado no código ou nos documentos públicos.
7. A tela principal não mostra saídas indisponíveis nem ocultas; o gerenciamento permite restaurar as ocultas e renomear destinos.
8. Com três ou mais favoritos disponíveis, cada clique avança uma posição e, após o último, retorna ao primeiro.

## Fontes técnicas

- [Manual de `pactl`: listagem JSON, default sink, porta e movimento de fluxos](https://manpages.debian.org/bookworm/pulseaudio-utils/pactl.1.en.html)
- [WirePlumber: `wpctl` e comportamento do dispositivo padrão](https://pipewire.pages.freedesktop.org/wireplumber/man/wpctl.html)
