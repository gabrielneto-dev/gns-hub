# gns-hub

Hub pessoal local para Linux Mint. A primeira função permite escolher a saída de áudio, mover a reprodução atual e alternar entre dois destinos favoritos.

## Iniciar

Requisitos: Python 3, `pactl` e um servidor PulseAudio ou PipeWire com compatibilidade PulseAudio. Para a primeira compilação da interface, Node.js e npm.

```bash
./scripts/start.sh
```

O comando compila a interface se necessário, inicia o serviço local e abre o navegador. O endereço aparece no terminal. Para encerrar, pressione `Ctrl+C`. Os favoritos ficam em `~/.config/gns-hub/audio.json` (ou em `$XDG_CONFIG_HOME/gns-hub/audio.json`).

## Uso

Na lista, selecione qualquer saída disponível. A estrela adiciona ou remove um favorito. Com dois favoritos disponíveis, **Trocar saída** alterna entre eles. `Ctrl+K` abre a busca. A lista pode ser atualizada manualmente e é recarregada quando a janela recebe foco.

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
