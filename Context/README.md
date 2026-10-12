# Manual da memória do projeto

`Context/` guarda conhecimento operacional que deve sobreviver às sessões. `AGENTS.md` define como trabalhar; este diretório registra o que se sabe. O catálogo é derivado: os arquivos Markdown são canônicos.

## Camadas e diretórios

| Camada | Local | Uso |
| --- | --- | --- |
| L0 | `MAP.md`, `STATE.md` | orientação e estado presente |
| L1 | `branches/<domínio>/_index.md` | resumo e rotas de cada domínio real |
| L2 | `branches/**`, `global/**`, `checkpoints/**` | registros atômicos e marcos |
| L3 | `sources/**` | evidências e material primário, quando necessário |

`core/` contém fundamentos relativamente estáveis. `_meta/` contém configuração, taxonomia, templates, catálogo e changelog estrutural. `future/` recebe possibilidades ainda não aprovadas; `archive/` preserva material histórico retirado do conjunto ativo. Diretórios vazios são criados somente quando necessários.

## Registro e descoberta

Cada registro atômico usa YAML frontmatter com `id`, `type`, `title`, `branch`, `tags`, `status`, `created_at` e `updated_at`. Campos opcionais incluem `confidence`, `source_ids`, `related`, `depends_on`, `supersedes`, `superseded_by`, `valid_from`, `valid_until` e `revisit_at`. Use listas vazias ou `null` quando apropriado. IDs estáveis seguem `CTX-<TIPO>-YYYYMMDD-<slug>`; arquivos seguem `<TIPO>-YYYYMMDD-<slug>.md`. Checkpoints acrescentam `-HHMM-` após a data. Use tags canônicas de `_meta/taxonomy.yaml`, em kebab-case.

Tipos: `FCT` fact, `RES` research, `DEC` decision, `ASM` assumption, `QUE` question, `PLN` plan, `RSK` risk, `NTE` note, `SRC` source, `SUM` summary, `EXP` experiment, `CP` checkpoint. Não promova hipótese a fato, pesquisa a decisão ou ideia a plano aprovado.

## Recuperação progressiva

1. Defina objetivo, entidades, possíveis branches, tags e validade temporal da tarefa.
2. Leia `MAP.md` e `STATE.md`.
3. Leia apenas os índices de branches pertinentes.
4. Busque por ID, título, tags, tipo, status e palavras-chave no catálogo ou com `rg` (se disponível; caso contrário, ferramenta equivalente).
5. Abra os registros necessários. Siga `related`, `depends_on`, `source_ids` e sucessões por uma relação inicialmente; amplie apenas se necessário.
6. Prefira correspondência direta, status atual, data, confiança e fonte. Verifique o sucessor antes de usar um registro substituído.

## Intenções semânticas

- **salvar contexto**: execute o protocolo completo abaixo.
- **carregar contexto**: leia L0 e os índices pertinentes antes de seguir.
- **buscar contexto <assunto>**: pesquise metadados e conteúdo, retornando primeiro os registros mais relevantes.
- **status do contexto**: resuma STATE, último checkpoint, branches, perguntas e bloqueios.
- **auditar contexto**: verifique estrutura, links, IDs, relações, taxonomia, estado, catálogo e segredos.

Essas intenções não requerem parser nem frase exata.

## Protocolo para salvar contexto

1. Inspecione a tarefa, os artefatos e, se houver controle de versão, o diff real. Extraia decisões, motivos, fatos, hipóteses, questões, riscos, falhas importantes, testes e próximos passos.
2. Persista apenas o que um agente futuro precisará para continuar ou evitar retrabalho. Nunca copie a conversa integral. Procure registros equivalentes antes de criar novos.
3. Classifique e atualize registros atômicos. Preserve proveniência, datas, confiança e relações quando relevantes. Uma questão respondida recebe `status: answered` e referência à resposta; uma decisão substituída recebe `status: superseded` e `superseded_by`.
4. Crie um checkpoint compacto `checkpoints/CP-YYYYMMDD-HHMM-<slug>.md` com objetivo, mudanças, descobertas, decisões, problemas, estado, perguntas, próximos passos, arquivos e registros afetados. O checkpoint não substitui os registros atômicos.
5. Atualize `STATE.md` para representar somente o presente; atualize índices e `MAP.md` se as rotas mudarem; reconstrua `_meta/catalog.jsonl` a partir dos registros. Registre mudanças estruturais em `_meta/changelog.md`. Avalie se surgiu alguma regra operacional durável para `AGENTS.md`.
6. Valide IDs únicos, relações existentes, links, status, tags, catálogo, ausência de segredos e a capacidade de uma sessão nova encontrar o contexto necessário.

## Manutenção

Adicione uma branch apenas quando uma área relativamente independente surgir de evidência do projeto; crie `branches/<slug>/_index.md`, suas rotas em `MAP.md` e tags necessárias na taxonomia. Não copie documentação existente em massa: extraia somente memória útil e aponte para a fonte. Mantenha `MAP`, `STATE` e índices curtos; divida registros com assuntos independentes.

Conflitos exigem comparação de data, escopo, status, fonte, confiança e validade. Se persistirem, registre uma questão; não escolha silenciosamente. Resultados negativos relevantes devem registrar condições, causa e quando reconsiderar. Conteúdo temporal deve ter origem e janela de validade quando útil.

Auditorias verificam IDs duplicados, relações e links quebrados, sinônimos de tags, contradições, perguntas resolvidas ainda abertas, registros substituídos apresentados como ativos, índices desatualizados, documentos grandes, classificação ou proveniência ausente, divergência do catálogo e credenciais. Corrija sem apagar histórico importante. Para reconstruir o catálogo, percorra apenas os registros com frontmatter em `global/`, `branches/`, `checkpoints/`, `sources/`, `future/` e `archive/`; grave uma linha JSON por registro com os campos do schema do catálogo.
