# gns-hub

Hub pessoal local para Linux Mint. A primeira função permite escolher a saída de áudio, mover a reprodução atual e percorrer uma fila de destinos favoritos.

## Iniciar

Requisitos: Python 3, `pactl` e um servidor PulseAudio ou PipeWire com compatibilidade PulseAudio. Para a primeira compilação da interface, Node.js e npm.

```bash
./scripts/start.sh
```

O comando compila a interface se necessário, inicia o serviço em `http://127.0.0.1:8765` e abre o navegador. Para encerrar, pressione `Ctrl+C`. A porta pode ser alterada com `GNS_HUB_PORT`. Favoritos, nomes e visibilidade ficam em `~/.config/gns-hub/audio.json` (ou em `$XDG_CONFIG_HOME/gns-hub/audio.json`).

## Uso

Na lista principal aparecem apenas as saídas disponíveis e visíveis. Use o lápis para dar um nome personalizado, o olho para ocultar um dispositivo e a estrela para adicioná-lo à fila de favoritos. **Gerenciar** permite restaurar dispositivos ocultos e consultar os desconectados. As setas da fila mudam a ordem; **Próxima saída** avança e volta ao início, ignorando temporariamente favoritos ocultos ou indisponíveis. `Ctrl+K` abre a busca das saídas visíveis. A lista pode ser atualizada manualmente e é recarregada quando a janela recebe foco.

O aplicativo opera só em `127.0.0.1`, sem conta e sem serviço externo. A ação de troca altera a saída de som do usuário atual. O microfone não é modificado.

## Desenvolvimento

```bash
cd apps/desktop
npm ci
npm run build
cd ../..
python3 -m unittest discover -s tests -v
```

O frontend usa React/TypeScript/Vite. O backend local usa Python padrão e `pactl`, sem executar texto arbitrário como shell. O pacote Tauri e o worker Rust descritos em `docs/Technology.md` continuam como destino arquitetural; este ambiente ainda não tem compilador Rust nem os arquivos de desenvolvimento do WebKitGTK para gerar esse pacote.

Especificações e decisões estão em [docs/README.md](docs/README.md).
