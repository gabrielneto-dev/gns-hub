<!-- CONTEXT-ENGINEERING:START -->
# Sistema de contexto do projeto

`Context/` é a memória persistente deste projeto. A sessão atual é temporária.

## Recuperação

Para cada tarefa não trivial, leia `Context/MAP.md` e `Context/STATE.md`, selecione apenas os índices `_index.md` das branches relevantes e abra registros atômicos conforme a necessidade. Siga relações e fontes somente quando afetarem a tarefa. Não carregue `Context/` inteiro por padrão.

## Fontes de verdade

- `AGENTS.md`: regras operacionais permanentes.
- `Context/MAP.md`: rotas de recuperação.
- `Context/STATE.md`: estado atual.
- `Context/core/`: fundamentos estáveis.
- `Context/branches/`: conhecimento por domínio.
- `Context/global/`: questões, decisões, planos e riscos transversais.
- `Context/checkpoints/`: marcos de continuidade.
- `Context/sources/`: proveniência e evidência.
- `Context/_meta/`: configuração, taxonomia, catálogo e manutenção.

## Escrita

Leia contexto automaticamente quando necessário. Faça a persistência completa somente quando o usuário pedir semanticamente para salvar, persistir ou atualizar o contexto, criar um checkpoint, ou equivalente. Nesse caso, siga o protocolo de `Context/README.md`: confira mudanças reais, destile conhecimento durável, deduplique, atualize registros, checkpoint, STATE, índices e catálogo. Não copie a conversa literalmente.

Nunca grave senhas, tokens, chaves, cookies ou valores de credenciais em `Context/`. Nomes de variáveis de ambiente e referências a gerenciadores de segredos são permitidos.

Regras duráveis sobre como trabalhar pertencem aqui. Estado temporário e conhecimento detalhado pertencem a `Context/`.
<!-- CONTEXT-ENGINEERING:END -->
