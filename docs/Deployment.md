# Implantação local no Linux Mint

## Escolha de execução

O hub roda como **serviço `systemd --user`**. É um processo Python padrão ligado ao servidor de áudio da sessão. Não precisa de Docker Engine, imagem, rede de contêiner ou ponte para o socket PipeWire/PulseAudio. Neste computador, o processo manual observado consumia aproximadamente 26 MB de RSS; não foi feito um benchmark comparativo com Docker, que não está instalado. O serviço mantém a mesma aplicação que já funciona no navegador.

## Endereço

O endereço principal é **[http://gns.hub](http://gns.hub)**. A entrada em `/etc/hosts` aponta esse nome para `127.0.0.1`. Um socket do sistema recebe apenas no loopback, na porta padrão HTTP (80), e `systemd-socket-proxyd` encaminha ao backend do usuário na porta 8765. Assim é possível digitar apenas `gns.hub` no navegador, sem expor o hub à rede de casa. O backend aceita esse nome nas verificações de `Host` e `Origin` das ações locais.

O endereço anterior `http://gns.localhost:8765` continua como alternativa técnica. Se o navegador estiver configurado com proxy, configure-o para ignorar `gns.hub`.

## Instalação

No checkout em `~/gns-hub`:

```bash
./scripts/install-service.sh
sudo ./scripts/install-local-name.sh
```

O primeiro script garante que o frontend esteja compilado, registra `deploy/gns-hub.service` no gerenciador do usuário e habilita/inicia o serviço. O segundo requer permissão de administrador para editar `/etc/hosts` e instalar o socket do sistema. Nenhuma unidade abre navegador automaticamente. Para iniciar antes do login após cada boot:

```bash
sudo loginctl enable-linger "$USER"
```

O `linger` faz o gerenciador do usuário iniciar no boot e sobreviver ao logout. Sem ele, o serviço começa no login, o que já atende o uso normal após entrar no desktop. O áudio pode depender da sessão gráfica e estar indisponível antes do login; o servidor web continua respondendo e passa a mostrar dispositivos quando o servidor de áudio surgir.

## Operação

```bash
systemctl --user status gns-hub.service
systemctl status gns-hub-proxy.socket
systemctl --user restart gns-hub.service
journalctl --user -u gns-hub.service -n 50 --no-pager
```

Para atualizar o frontend depois de um `git pull`, execute `npm ci && npm run build` em `apps/desktop`, depois reinicie o serviço. Para parar e desabilitar: `systemctl --user disable --now gns-hub.service`. Os dados de favoritos, nomes e visibilidade continuam em `~/.config/gns-hub/audio.json`.

## Limites

- O endereço funciona apenas neste computador. Acesso por outros dispositivos exigiria outro desenho de autenticação e rede.
- `gns.hub` é um apelido local. O acesso usa HTTP dentro do loopback, sem TLS; não use esse nome para acesso pela rede.
- O serviço precisa que o checkout permaneça em `~/gns-hub`, conforme a unidade instalada.
- A unidade usa `/usr/bin/python3` e `pactl` do Linux Mint, sem Node.js residente.

## Referências

- [RFC 6761: nomes sob `.localhost`](https://www.rfc-editor.org/rfc/rfc6761#section-6.3)
- [`loginctl enable-linger`](https://www.freedesktop.org/software/systemd/man/latest/loginctl.html)
- [Docker Engine: inicialização do daemon](https://docs.docker.com/engine/daemon/start/)
