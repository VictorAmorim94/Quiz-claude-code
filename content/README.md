# Banco de perguntas

| Arquivo              | Para quê                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------- |
| `questions.json`     | **Conteúdo real** (90 perguntas, 30 por nível). É o que vai para produção.                      |
| `questions.dev.json` | Fixture do projeto de dev: exemplos do PRD §6.5 + itens `[DEV]` fictícios. Nunca vai para prod. |

## Formato

```json
{
  "id": "beg-001",
  "level": "beginner",
  "category": "fundamentos",
  "statement": "Uma frase, até 200 caracteres, 100% verdadeira ou 100% falsa.",
  "answer": true,
  "explanation": "De 2 a 4 frases. Diz por que é V ou F e, se for F, qual é a verdade.",
  "doc_url": "https://code.claude.com/docs/en/overview",
  "active": true
}
```

- `id`: `{beg|int|adv}-NNN`, com o prefixo batendo com o `level`. Use **001–899**; a faixa 900+ é do fixture de dev.
- IDs são permanentes: nunca reutilize nem apague. Para tirar uma pergunta do jogo, use `"active": false`.
- `category`: `fundamentos`, `interfaces`, `seguranca`, `contexto`, `comandos`, `workflows`, `extensibilidade` ou `automacao`.
- `doc_url`: documentação oficial. Use `https://code.claude.com/docs/en/<página>`; os endereços antigos `docs.claude.com/en/docs/claude-code/...` hoje redirecionam para lá.

## Regras (prd.md §6)

- 30 perguntas ativas por nível, com **40–60% verdadeiras**.
- Distribuição sugerida por categoria:

| Categoria       | Iniciante | Intermediário | Avançado |
| --------------- | --------- | ------------- | -------- |
| fundamentos     | 8         | 2             | –        |
| interfaces      | 6         | 3             | –        |
| seguranca       | 6         | 5             | 3        |
| contexto        | 5         | 6             | 3        |
| comandos        | 3         | 7             | 2        |
| workflows       | 2         | 5             | 3        |
| extensibilidade | –         | 2             | 12       |
| automacao       | –         | –             | 7        |

- Evite absolutos que entregam a resposta ("sempre", "nunca", "apenas"), a menos que sejam o ponto da pergunta.
- Afirmações falsas devem ser equívocos reais e plausíveis.
- **Confira cada item na documentação oficial atual.** Nada de números voláteis (preços, limites, versões) nem recursos não documentados. Na dúvida, descarte.
- Termos técnicos em inglês, com crase (`CLAUDE.md`, `/init`, `PreToolUse`). Texto em PT-BR, tom amigável.

## Comandos

```bash
npm run validate            # valida questions.json no modo estrito (não toca no banco)
npm run validate -- --dev   # valida o fixture de dev
npm run seed                # valida (estrito) e faz upsert de questions.json
npm run seed -- --dev       # faz upsert do fixture (só no projeto de dev)
```

O modo estrito falha com erros (contagem, % de verdadeiras, IDs duplicados, campos inválidos, itens `[DEV]`) e mostra avisos para a distribuição de categorias e explicações fora de 2–4 frases.
