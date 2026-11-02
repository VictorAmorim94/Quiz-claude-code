# PRD — Quiz Claude Code (Verdadeiro ou Falso)

> **Status:** v1.0 — pronto para implementação
> **Data:** 2026-11-01
> **Autor:** Victor Ugo Amorim Lima (com Claude Code)
> **Consumidor deste documento:** Claude Code, para construir o projeto do zero nesta pasta.

---

## 1. Resumo

Aplicação web de quiz **Verdadeiro ou Falso** sobre **Claude Code**. O jogador escolhe um nível (Iniciante, Intermediário, Avançado ou Misto), responde a **10 afirmações** sorteadas e, **depois de cada resposta**, vê se acertou, uma explicação curta e um link para a documentação oficial. No fim da rodada, informa um **nickname** e entra no **ranking global por nível**, ordenado por acertos e, no empate, pelo menor tempo.

O gabarito **nunca vai para o navegador**: as respostas são corrigidas no servidor (Supabase Edge Functions), o que impede trapaça no ranking.

---

## 2. Contexto e problema

- O Claude Code é usado por perfis cada vez mais variados: devs, analistas de dados, PMs e gestores. Muita gente tem ideias erradas sobre o que ele faz ("só funciona no VS Code", "é só autocomplete", "edita arquivos sem pedir permissão").
- Faltam formas **rápidas e divertidas** de testar e reforçar esse conhecimento, do nível de negócio ao técnico avançado.
- O formato Verdadeiro/Falso é ótimo para **desfazer mitos**: cada afirmação falsa é um equívoco comum, corrigido na hora pela explicação.

## 3. Objetivos

| # | Objetivo | Como medir |
|---|----------|------------|
| O1 | Ensinar conceitos de Claude Code, do básico ao avançado | % de jogadores que concluem a rodada (meta ≥ 70%) |
| O2 | Gerar engajamento e rejogabilidade | Média de rodadas por jogador (meta ≥ 2) |
| O3 | Criar competição saudável | % de rodadas concluídas que enviam ao ranking (meta ≥ 40%) |
| O4 | Conteúdo confiável | 0 perguntas com gabarito errado reportadas e não corrigidas em até 7 dias |

### Fora do escopo (v1)
- Login/contas de usuário (o jogador se identifica só por nickname).
- Temporizador visível por pergunta (o tempo é medido sem ser exibido, só para desempate).
- Botões de compartilhamento em redes sociais.
- Desempenho por categoria na tela de resultado.
- Outros idiomas além do PT-BR.
- Painel administrativo de perguntas (o conteúdo é gerenciado via arquivo JSON + script de seed).

---

## 4. Público-alvo e personas

| Persona | Perfil | Nível típico | O que busca |
|---------|--------|--------------|-------------|
| **Ana, gestora** | Lidera um time de dados e avalia adotar Claude Code | Iniciante | Entender o que a ferramenta faz, para quem serve, custos e riscos |
| **Bruno, analista de dados** | Usa Claude Code para SQL, notebooks e scripts | Intermediário | Dominar CLAUDE.md, comandos, permissões e fluxos do dia a dia |
| **Carla, engenheira de software** | Usuária avançada, automatiza fluxos | Avançado | Testar o que sabe sobre hooks, MCP, subagents, skills, SDK e modo headless |

---

## 5. Requisitos funcionais

### 5.1 User stories

- **US01** — Como jogador, quero escolher um nível (Iniciante, Intermediário, Avançado ou Misto) para jogar no meu ritmo.
- **US02** — Como jogador, quero responder 10 afirmações com os botões **Verdadeiro** ou **Falso**.
- **US03** — Como jogador, quero saber logo após responder se acertei, ler uma explicação e ter um link para a documentação oficial.
- **US04** — Como jogador, quero ver meu progresso (ex.: "Pergunta 4 de 10") e minha pontuação parcial.
- **US05** — Como jogador, quero ver no fim minha pontuação, meu tempo total e a revisão de todas as perguntas.
- **US06** — Como jogador, quero informar um nickname e entrar no ranking do nível que joguei.
- **US07** — Como visitante, quero ver o ranking por nível nas abas **Geral** e **Semanal**.
- **US08** — Como jogador, quero jogar de novo e receber perguntas diferentes.
- **US09** — Como jogador, quero usar o tema claro ou escuro.
- **US10** — Como jogador, quero ver meu histórico local (melhores pontuações por nível) sem precisar criar conta.

### 5.2 Regras de negócio

| ID | Regra |
|----|-------|
| RN01 | Cada rodada tem **exatamente 10 perguntas**, sorteadas no servidor entre as perguntas **ativas** do nível. |
| RN02 | O modo **Misto** sorteia 3 de Iniciante, 4 de Intermediário e 3 de Avançado, em ordem crescente de dificuldade. |
| RN03 | O banco deve ter equilíbrio entre V e F: entre **40% e 60%** de afirmações verdadeiras por nível. Cada rodada sorteada também deve ter **de 3 a 7** verdadeiras (o servidor refaz o sorteio se cair fora disso). |
| RN04 | Cada pergunta só pode ser respondida **uma vez** por rodada; a resposta não pode ser alterada. |
| RN05 | As perguntas devem ser respondidas **na ordem**; não dá para pular. |
| RN06 | Pontuação = número de acertos (0–10). Cada acerto vale 1 ponto, em todos os níveis. |
| RN07 | O **tempo da rodada** é medido no servidor: do `started_at` da sessão até o registro da 10ª resposta. |
| RN08 | Ordem do ranking: **acertos ↓**, **tempo ↑**, **data de conclusão ↑**. |
| RN09 | Existem **4 rankings**, um por nível: `beginner`, `intermediate`, `advanced` e `mixed`. Cada um tem as abas **Geral** (todas as rodadas) e **Semanal** (rodadas concluídas a partir da segunda-feira 00:00, horário de America/Sao_Paulo). |
| RN10 | No ranking, cada nickname aparece **uma vez por nível e período**, com a sua melhor rodada. Mostrar o Top 50. |
| RN11 | Nickname: de 3 a 20 caracteres, regex `^[A-Za-z0-9_À-ÿ .-]+$`, sem espaços nas pontas, **sem palavrões** (lista PT/EN no servidor). Nickname não é único: duas pessoas podem usar o mesmo. |
| RN12 | Enviar ao ranking é **opcional** e só vale para rodada concluída, uma vez por sessão. |
| RN13 | A sessão expira **30 minutos** após o início. Respostas ou envios a uma sessão expirada são rejeitados. |
| RN14 | Rodadas com tempo total **abaixo de 15 segundos** são aceitas no resultado, mas **bloqueadas no ranking** (provável uso de bot). |
| RN15 | Rate limit: no máximo **30 sessões por hora por IP** (o IP é guardado só como hash SHA-256 com salt). |
| RN16 | O cliente tenta evitar perguntas repetidas: envia os IDs das últimas 30 perguntas vistas (localStorage) e o servidor as evita quando o banco tiver perguntas suficientes. |

### 5.3 Fluxo e telas

```
[Home] ──► [Seleção de nível] ──► [Pergunta n/10] ⇄ [Feedback] ──► [Resultado] ──► [Enviar ao ranking] ──► [Ranking]
   └──────────────────────────────────────────────────────────────────────────────────────────────────────► [Ranking]
```

1. **Home (`/`)**
   - Título, subtítulo ("Teste o que você sabe sobre Claude Code — do negócio ao avançado") e CTA "Começar".
   - Link para o Ranking e o card "Seus recordes" (localStorage).
2. **Seleção de nível (`/play`)**
   - 4 cards: Iniciante, Intermediário, Avançado e Misto, cada um com uma descrição curta e exemplos de temas.
3. **Quiz (`/play/:level`)**
   - Barra de progresso (n/10), selo do nível, categoria da pergunta e texto da afirmação.
   - Botões grandes **Verdadeiro** e **Falso**, com atalhos de teclado `V`/`F` (e `←`/`→`).
   - Enquanto espera o servidor: botões desabilitados e spinner.
   - **Feedback inline:** ✅ Correto / ❌ Incorreto, a resposta certa, a explicação (2–4 frases), o link "Saiba mais na documentação" (abre em nova aba) e o botão **Próxima** (atalho `Enter`).
   - Sair no meio da rodada pede confirmação ("Você vai perder o progresso").
4. **Resultado (`/result`)**
   - Pontuação grande (ex.: 8/10), tempo total (mm:ss) e mensagem por faixa:
     - 0–4: "Bom começo! Revise as explicações e tente de novo."
     - 5–7: "Mandou bem! Você já domina o essencial."
     - 8–9: "Excelente! Você conhece Claude Code de verdade."
     - 10: "Perfeito! Nível mestre em Claude Code."
   - Formulário de nickname (pré-preenchido com o último usado) e botão "Enviar ao ranking". Depois do envio, mostra a posição alcançada.
   - Revisão: lista das 10 afirmações com a resposta dada, a correta e a explicação (pode ser recolhida).
   - Botões "Jogar novamente (mesmo nível)", "Trocar de nível" e "Ver ranking".
5. **Ranking (`/leaderboard`)**
   - Abas de nível (4) e alternância Geral/Semanal.
   - Tabela com posição, nickname, acertos, tempo e data. Top 3 com destaque (🥇🥈🥉).
   - Destaque da linha do jogador, se o nickname bater com o último enviado neste navegador.
6. **404** com link para a Home.

### 5.4 Tema e acessibilidade
- Tema claro/escuro: segue o `prefers-color-scheme` por padrão e tem um toggle no header que persiste em `localStorage` (`theme: light | dark | system`).
- WCAG 2.1 AA: contraste ≥ 4.5:1, foco visível, navegação completa por teclado e feedback anunciado via `aria-live="polite"`.
- Certo/errado nunca depende só da cor: usar ícone e texto também.
- Responsivo a partir de 360px de largura; botões V/F com no mínimo 48px de altura.

---

## 6. Conteúdo: banco de perguntas

### 6.1 Volume e distribuição
- **90 perguntas no MVP**: 30 por nível.
- 40–60% verdadeiras por nível (RN03).
- Cada pergunta pertence a **uma categoria**. Distribuição sugerida:

| Categoria (`category`) | Iniciante | Intermediário | Avançado |
|---|---|---|---|
| `fundamentos` — o que é, para quem serve, casos de uso, limites | 8 | 2 | – |
| `interfaces` — CLI, desktop, web, extensões de IDE, instalação | 6 | 3 | – |
| `seguranca` — permissões, aprovações, modos, dados | 6 | 5 | 3 |
| `contexto` — CLAUDE.md, memória, janela de contexto, /compact | 5 | 6 | 3 |
| `comandos` — slash commands, atalhos, /init, /clear, plan mode | 3 | 7 | 2 |
| `workflows` — git, PRs, testes, revisão de código, boas práticas | 2 | 5 | 3 |
| `extensibilidade` — MCP, hooks, subagents, skills, plugins | – | 2 | 12 |
| `automacao` — modo headless (`-p`), Agent SDK, CI/GitHub Actions | – | – | 7 |
| **Total** | **30** | **30** | **30** |

### 6.2 Definição de níveis
- **Iniciante (negócio):** linguagem não técnica. O que é, para que serve, quem pode usar, onde roda, noções de segurança e custo.
- **Intermediário (usuário):** uso diário. CLAUDE.md, comandos nativos, permissões, plan mode, integração com git, como dar bom contexto.
- **Avançado (power user/dev):** configuração e extensão. `settings.json` e escopos, hooks e seus eventos, MCP, subagents, skills, plugins, modo headless, Agent SDK e CI.

### 6.3 Guia de redação (obrigatório)
1. A afirmação é **uma frase**, de no máximo 200 caracteres, sem ambiguidade. Deve ser 100% verdadeira ou 100% falsa.
2. Evitar absolutos que entregam a resposta ("sempre", "nunca", "apenas"), salvo quando eles são o ponto da pergunta.
3. Afirmações falsas devem refletir **equívocos reais e plausíveis**, não absurdos.
4. A explicação tem de **2 a 4 frases**: diz por que é V ou F e, se for F, qual é a verdade.
5. Todo item tem `doc_url` apontando para a documentação oficial (`https://docs.claude.com/en/docs/claude-code/...`) ou a página mais próxima.
6. **Precisão é crítica:** antes do seed, cada pergunta deve ser conferida contra a documentação oficial atual. Não use números voláteis (preços, limites, versões) nem recursos não documentados. Na dúvida, descarte a pergunta.
7. Termos técnicos ficam em inglês com formatação de código quando aplicável (`CLAUDE.md`, `/init`, `PreToolUse`, `settings.json`).
8. Texto em PT-BR, tom amigável e direto.

### 6.4 Formato do arquivo de conteúdo
Arquivo-fonte versionado: `content/questions.json`, validado por schema Zod no script de seed.

```json
[
  {
    "id": "beg-001",
    "level": "beginner",
    "category": "fundamentos",
    "statement": "Claude Code é uma ferramenta de programação agêntica que pode ler arquivos, editar código e executar comandos no terminal.",
    "answer": true,
    "explanation": "Claude Code é um assistente agêntico: ele navega pelo projeto, edita arquivos e roda comandos (com sua permissão) para cumprir tarefas descritas em linguagem natural.",
    "doc_url": "https://docs.claude.com/en/docs/claude-code/overview",
    "active": true
  }
]
```

- `id`: `{beg|int|adv}-{NNN}`, estável. Nunca reutilizar o ID de uma pergunta removida (para desativar, use `active: false`).
- `level`: `beginner | intermediate | advanced`.

### 6.5 Exemplos de calibração
Exemplos para guiar o tom e a dificuldade. **Também precisam ser revalidados contra a documentação** antes de entrar no banco.

| Nível | Afirmação | Gabarito | Ideia da explicação |
|---|---|---|---|
| Iniciante | Claude Code só pode ser usado dentro do VS Code. | F | Há CLI no terminal, app desktop, versão web e extensões para VS Code e JetBrains. |
| Iniciante | Claude Code pode executar comandos no terminal, como rodar testes. | V | Ele executa comandos de shell, pedindo permissão conforme as configurações. |
| Iniciante | Só desenvolvedores profissionais conseguem tirar proveito do Claude Code. | F | Analistas, PMs e outros perfis usam para análises, scripts, documentação e automações. |
| Iniciante | Por padrão, Claude Code pede aprovação antes de ações como editar arquivos ou rodar comandos. | V | O sistema de permissões exige aprovação, que pode ser ajustada nas configurações. |
| Intermediário | O arquivo `CLAUDE.md` na raiz do projeto é carregado automaticamente como contexto na sessão. | V | Serve como memória do projeto: convenções, comandos de build, arquitetura. |
| Intermediário | O comando `/init` gera um `CLAUDE.md` inicial analisando o código do projeto. | V | Ele cria um ponto de partida que o time deve revisar e manter. |
| Intermediário | No plan mode, Claude Code edita arquivos livremente enquanto monta o plano. | F | O plan mode é para pesquisa e planejamento; as edições só começam depois que o plano é aprovado. |
| Intermediário | O comando `/compact` resume a conversa para liberar espaço na janela de contexto. | V | Ele condensa o histórico, mantendo o essencial e liberando contexto. |
| Intermediário | O arquivo `.claude/settings.local.json` foi feito para ser commitado e compartilhado com o time. | F | Ele guarda preferências pessoais e normalmente fica fora do git; o compartilhado é o `.claude/settings.json`. |
| Avançado | MCP significa Model Context Protocol, um padrão aberto para conectar ferramentas e fontes de dados ao Claude. | V | Servidores MCP expõem ferramentas e recursos ao Claude Code. |
| Avançado | Um hook `PreToolUse` pode bloquear a execução de uma ferramenta antes que ela rode. | V | Esses hooks rodam antes da chamada e podem impedi-la (ex.: saída com código 2). |
| Avançado | Subagents compartilham a mesma janela de contexto da conversa principal. | F | Cada subagent tem o próprio contexto e devolve só o resultado, o que preserva o contexto principal. |
| Avançado | `claude -p "..."` executa o Claude Code em modo não interativo, útil em scripts e CI. | V | É o modo headless/print, que imprime o resultado e encerra. |
| Avançado | Uma skill é definida por uma pasta que contém um arquivo `SKILL.md` com instruções e metadados. | V | O `SKILL.md` descreve quando e como usar a skill e pode trazer arquivos de apoio. |
| Avançado | Hooks são configurados exclusivamente por variáveis de ambiente. | F | Hooks são configurados nos arquivos `settings.json` (usuário, projeto ou local). |

---

## 7. Requisitos não funcionais

| Categoria | Requisito |
|---|---|
| Performance | LCP < 2.5s em 4G; bundle JS inicial < 200 KB gzip; correção da resposta (Edge Function) com p95 < 600 ms |
| Disponibilidade | Depende do Vercel e do Supabase (free tier aceitável no MVP) |
| Segurança | Gabarito só no servidor; RLS em todas as tabelas; `service_role` só nas Edge Functions; IP guardado apenas como hash |
| Privacidade/LGPD | Só nickname público e hash de IP. Aviso curto: "Seu nickname ficará visível publicamente no ranking." Sem cookies de rastreamento |
| Compatibilidade | Últimas 2 versões de Chrome, Edge, Firefox e Safari, desktop e mobile |
| Acessibilidade | WCAG 2.1 AA (ver 5.4) |
| Qualidade | TypeScript `strict`, ESLint e Prettier sem erros, testes passando no CI |
| Observabilidade | Logs estruturados nas Edge Functions; erros no front registrados no console (Sentry fica para o roadmap) |

---

## 8. Arquitetura técnica

### 8.1 Stack

| Camada | Tecnologia |
|---|---|
| Frontend | **Vite + React 18 + TypeScript (strict)** |
| Estilo | **Tailwind CSS** (`darkMode: 'class'`) |
| Roteamento | React Router v6 |
| Estado servidor | TanStack Query (ranking); estado da rodada com `useReducer` + Context |
| Validação | Zod (front, seed e Edge Functions) |
| Backend | **Supabase**: Postgres + RLS + **Edge Functions (Deno/TypeScript)** |
| Cliente | `@supabase/supabase-js` v2 |
| Testes | Vitest + React Testing Library (unit/componentes), Playwright (e2e), `deno test` (functions) |
| Deploy | Front na **Vercel**; banco e functions no **Supabase Cloud** |
| CI | GitHub Actions: lint, typecheck, testes e build |

### 8.2 Visão geral

```
┌──────────────────────┐        HTTPS         ┌────────────────────────────────────┐
│  SPA React (Vercel)  │ ───────────────────► │  Supabase Edge Functions           │
│  - nunca recebe o    │                      │  start-session / submit-answer /   │
│    gabarito antes    │ ◄─────────────────── │  submit-score                      │
│    de responder      │                      │        │ service_role               │
│                      │  RPC (anon key)      │        ▼                           │
│                      │ ───────────────────► │  Postgres (RLS)                    │
│                      │  get_leaderboard()   │  questions · sessions ·            │
└──────────────────────┘                      │  session_answers · leaderboard     │
                                              └────────────────────────────────────┘
```

**Princípio central:** o cliente recebe só `id`, `statement`, `category` e `level` de cada pergunta. `answer`, `explanation` e `doc_url` de uma pergunta só voltam **depois** que ela é respondida, pela `submit-answer`.

### 8.3 Modelo de dados (Postgres)

```sql
-- Enums
create type quiz_level as enum ('beginner', 'intermediate', 'advanced');
create type board_level as enum ('beginner', 'intermediate', 'advanced', 'mixed');

-- Banco de perguntas (populado via seed)
create table questions (
  id           text primary key,                 -- ex.: 'beg-001'
  level        quiz_level not null,
  category     text not null,
  statement    text not null check (char_length(statement) <= 200),
  answer       boolean not null,
  explanation  text not null,
  doc_url      text not null,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on questions (level) where active;

-- Sessão de jogo (uma por rodada)
create table sessions (
  id            uuid primary key default gen_random_uuid(),
  level         board_level not null,
  question_ids  text[] not null,                 -- ordem sorteada (10)
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,                     -- preenchido na 10ª resposta
  score         smallint,                        -- preenchido na 10ª resposta
  duration_ms   integer,                         -- finished_at - started_at
  ip_hash       text not null,
  submitted     boolean not null default false,
  expires_at    timestamptz not null default now() + interval '30 minutes'
);
create index on sessions (ip_hash, started_at);

-- Respostas de cada sessão
create table session_answers (
  session_id   uuid not null references sessions(id) on delete cascade,
  position     smallint not null check (position between 0 and 9),
  question_id  text not null references questions(id),
  user_answer  boolean not null,
  is_correct   boolean not null,
  answered_at  timestamptz not null default now(),
  primary key (session_id, position)
);

-- Entradas do ranking
create table leaderboard (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null unique references sessions(id),
  level        board_level not null,
  nickname     text not null check (char_length(nickname) between 3 and 20),
  score        smallint not null check (score between 0 and 10),
  duration_ms  integer not null,
  finished_at  timestamptz not null,
  created_at   timestamptz not null default now()
);
create index on leaderboard (level, score desc, duration_ms asc, finished_at asc);
create index on leaderboard (level, finished_at);
```

**RLS:** ativar em **todas** as tabelas, **sem policies para `anon`/`authenticated`**. Todo acesso passa pelas Edge Functions (`service_role`) ou pela RPC abaixo.

```sql
-- Ranking público: melhor rodada por nickname, por nível/período
create or replace function get_leaderboard(p_level board_level, p_period text default 'all', p_limit int default 50)
returns table (rank bigint, nickname text, score smallint, duration_ms integer, finished_at timestamptz)
language sql stable security definer set search_path = public as $$
  with filtered as (
    select * from leaderboard
    where level = p_level
      and (p_period = 'all'
           or finished_at >= date_trunc('week', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo')
  ),
  best as (
    select distinct on (lower(nickname)) *
    from filtered
    order by lower(nickname), score desc, duration_ms asc, finished_at asc
  )
  select row_number() over (order by score desc, duration_ms asc, finished_at asc),
         nickname, score, duration_ms, finished_at
  from best
  order by score desc, duration_ms asc, finished_at asc
  limit least(p_limit, 100);
$$;
grant execute on function get_leaderboard to anon;
```

### 8.4 Contratos das Edge Functions

Todas recebem e devolvem JSON, validam a entrada com Zod, respondem com CORS restrito ao domínio do front (`ALLOWED_ORIGIN`) e usam este formato de erro:
`{ "error": { "code": "SESSION_EXPIRED", "message": "..." } }`.

#### `POST /functions/v1/start-session`
Request:
```json
{ "level": "beginner | intermediate | advanced | mixed", "recentQuestionIds": ["beg-003", "..."] }
```
Lógica:
1. Calcula `ip_hash = sha256(ip + IP_HASH_SALT)` e aplica o rate limit da RN15 (→ `429 RATE_LIMITED`).
2. Sorteia 10 perguntas ativas (RN01–RN03 e RN16).
3. Cria `sessions` e devolve as perguntas **sem gabarito**.

Response `200`:
```json
{
  "sessionId": "uuid",
  "expiresAt": "ISO-8601",
  "questions": [
    { "position": 0, "id": "beg-012", "level": "beginner", "category": "fundamentos", "statement": "..." }
  ]
}
```

#### `POST /functions/v1/submit-answer`
Request:
```json
{ "sessionId": "uuid", "position": 0, "answer": true }
```
Lógica:
1. Sessão existe e não expirou (→ `410 SESSION_EXPIRED`).
2. `position` é exatamente o número de respostas já dadas (RN05) (→ `409 OUT_OF_ORDER`); posição já respondida (→ `409 ALREADY_ANSWERED`).
3. Corrige, grava em `session_answers` e, se for a 10ª, preenche `finished_at`, `score` e `duration_ms`.

Response `200`:
```json
{
  "correct": true,
  "correctAnswer": true,
  "explanation": "...",
  "docUrl": "https://docs.claude.com/...",
  "scoreSoFar": 4,
  "finished": false,
  "result": null
}
```
Na 10ª resposta, `finished: true` e `result: { "score": 8, "durationMs": 95321 }`.

#### `POST /functions/v1/submit-score`
Request:
```json
{ "sessionId": "uuid", "nickname": "carla_dev" }
```
Lógica:
1. A sessão precisa estar concluída e com `submitted = false` (→ `409 ALREADY_SUBMITTED` / `400 NOT_FINISHED`).
2. Valida o nickname (RN11) (→ `422 INVALID_NICKNAME`).
3. Bloqueia se `duration_ms < 15000` (RN14) (→ `422 SUSPICIOUS_RUN`).
4. Insere em `leaderboard`, marca `submitted = true` e calcula a posição no ranking geral do nível.

Response `200`:
```json
{ "rank": 12, "level": "beginner" }
```

#### RPC `get_leaderboard(p_level, p_period, p_limit)`
Chamada direta do front via `supabase.rpc(...)` com a anon key.

### 8.5 Estrutura de pastas

```
quiz-claude-code/
├─ prd.md
├─ CLAUDE.md                     # convenções do projeto (criar no início)
├─ README.md
├─ package.json
├─ vite.config.ts
├─ tailwind.config.ts
├─ tsconfig.json
├─ .env.example
├─ content/
│  └─ questions.json             # fonte das 90 perguntas
├─ scripts/
│  └─ seed-questions.ts          # valida com Zod e faz upsert em `questions`
├─ src/
│  ├─ main.tsx
│  ├─ App.tsx                    # rotas
│  ├─ lib/
│  │  ├─ supabase.ts             # client
│  │  ├─ api.ts                  # startSession, submitAnswer, submitScore, getLeaderboard
│  │  ├─ storage.ts              # localStorage com try/catch (tema, recordes, recentes, nickname)
│  │  └─ format.ts               # mm:ss, datas
│  ├─ types/                     # tipos compartilhados (Level, Question, AnswerResult...)
│  ├─ features/
│  │  ├─ quiz/                   # QuizProvider (reducer), QuestionCard, AnswerButtons, FeedbackPanel, ProgressBar
│  │  ├─ result/                 # ResultSummary, ReviewList, NicknameForm
│  │  └─ leaderboard/            # LeaderboardTable, LevelTabs, PeriodToggle
│  ├─ components/                # Header, ThemeToggle, Button, Card, Spinner, ErrorState
│  └─ pages/                     # HomePage, LevelSelectPage, QuizPage, ResultPage, LeaderboardPage, NotFoundPage
├─ supabase/
│  ├─ config.toml
│  ├─ migrations/
│  │  └─ 0001_init.sql           # tabelas, índices, RLS, get_leaderboard
│  └─ functions/
│     ├─ _shared/                # cors.ts, errors.ts, schemas.ts, profanity.ts, hash.ts, draw.ts
│     ├─ start-session/index.ts
│     ├─ submit-answer/index.ts
│     └─ submit-score/index.ts
├─ tests/e2e/                    # Playwright
└─ .github/workflows/ci.yml
```

### 8.6 Variáveis de ambiente

| Variável | Onde | Descrição |
|---|---|---|
| `VITE_SUPABASE_URL` | Front | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Front | Chave pública (anon) |
| `SUPABASE_SERVICE_ROLE_KEY` | Functions / seed | **Nunca** no front |
| `IP_HASH_SALT` | Functions | Salt aleatório para o hash de IP |
| `ALLOWED_ORIGIN` | Functions | Domínio do front, para CORS (ex.: `https://quiz-claude-code.vercel.app`) |

### 8.7 Estado do cliente (localStorage)
Todo acesso fica em `try/catch`, e a aplicação precisa funcionar sem localStorage.

| Chave | Conteúdo |
|---|---|
| `qcc:theme` | `light \| dark \| system` |
| `qcc:bestScores` | `{ [level]: { score, durationMs, date } }` |
| `qcc:recentQuestionIds` | últimos 30 IDs vistos |
| `qcc:lastNickname` | último nickname enviado |
| `qcc:activeSession` | `{ sessionId, level, questions, answers[], expiresAt }`, para retomar a rodada após um F5 enquanto a sessão não expira |

---

## 9. Tratamento de erros e casos de borda

| Situação | Comportamento |
|---|---|
| Falha de rede ao responder | Mantém a pergunta, mostra "Não foi possível enviar. Tentar novamente" e reenvia o mesmo payload (a operação é idempotente: `ALREADY_ANSWERED` com a mesma resposta devolve o resultado salvo) |
| Sessão expirada | Modal "Sua rodada expirou" com o botão "Começar nova rodada" |
| Rate limit (429) | "Muitas rodadas em pouco tempo. Tente novamente em alguns minutos." |
| Nickname inválido ou com palavrão | Erro inline no campo, sem expor a lista |
| Rodada suspeita (< 15s) | "Rodada muito rápida para entrar no ranking." O resultado continua visível |
| F5 no meio da rodada | Retoma a partir de `qcc:activeSession` |
| Banco com poucas perguntas no nível | O sorteio ignora o filtro de recentes (RN16) |
| Ranking vazio | Estado vazio: "Seja o primeiro no ranking!" |

---

## 10. Testes e critérios de aceite

### 10.1 Testes obrigatórios
- **Unit (Vitest):** reducer do quiz, formatação de tempo, `storage.ts` com localStorage indisponível e validação do `questions.json` (schema, IDs únicos, 30 por nível, 40–60% V, `doc_url` válida).
- **Componentes (RTL):** respostas por clique e por teclado (V/F/Enter), painel de feedback com explicação e link, estados de loading e erro.
- **Functions (`deno test`):** sorteio (10 itens, distribuição do Misto, 3–7 verdadeiras), ordem obrigatória, resposta duplicada, sessão expirada, nickname inválido, rodada suspeita, rate limit.
- **E2E (Playwright, com Supabase local):** jogar uma rodada completa → enviar ao ranking → ver o nome no ranking; trocar o tema; viewport mobile 375px.

### 10.2 Critérios de aceite do MVP
- [ ] Os 4 níveis jogáveis, com 10 perguntas cada rodada.
- [ ] Feedback imediato com explicação e link da doc em 100% das perguntas.
- [ ] Inspecionando a rede (DevTools), não é possível obter o gabarito de uma pergunta antes de respondê-la.
- [ ] Ranking por nível, com abas Geral/Semanal e ordenação conforme a RN08.
- [ ] Tema claro/escuro funcionando e persistido.
- [ ] 90 perguntas revisadas contra a documentação oficial, passando no validador.
- [ ] Lighthouse ≥ 90 em Performance, Acessibilidade e Best Practices (mobile).
- [ ] CI verde: lint, typecheck, testes e build.
- [ ] Deploy público funcionando (Vercel + Supabase).

---

## 11. Plano de implementação (fases para o Claude Code)

1. **Fundação** — scaffold Vite + React + TS + Tailwind, ESLint/Prettier, React Router, tema claro/escuro, layout base, `CLAUDE.md` e `README.md`.
2. **Banco e backend** — `supabase init`, migration `0001_init.sql` (tabelas, RLS e RPC), Edge Functions com o `_shared/`, testes Deno.
3. **Conteúdo** — `content/questions.json` com as 90 perguntas seguindo a seção 6, o validador Zod e o script `npm run seed`. Revisar cada item contra a documentação oficial.
4. **Fluxo do quiz** — seleção de nível, QuizProvider, perguntas, feedback, resultado com revisão, retomada após F5.
5. **Ranking** — envio de nickname e página de leaderboard com abas e período.
6. **Qualidade** — testes de componentes, e2e, acessibilidade e Lighthouse.
7. **Deploy** — Supabase Cloud (migrations, functions, secrets, seed), Vercel (env vars) e workflow de CI.

Scripts esperados no `package.json`: `dev`, `build`, `preview`, `lint`, `typecheck`, `test`, `test:e2e`, `seed`, `db:reset` (Supabase local).

---

## 12. Métricas pós-lançamento
Coletadas via SQL nas tabelas existentes, sem analytics de terceiros no MVP:
- Rodadas iniciadas × concluídas por nível (`sessions`).
- Taxa de envio ao ranking (`leaderboard` / sessões concluídas).
- **Taxa de acerto por pergunta** (`session_answers`): perguntas com menos de 20% ou mais de 95% de acerto devem ser revisadas (podem estar ambíguas ou fáceis demais).

## 13. Roadmap (pós-MVP)
- Compartilhar o resultado (LinkedIn/X, imagem OG dinâmica).
- Desempenho por categoria no resultado.
- Botão "Reportar problema nesta pergunta".
- Modo desafio com temporizador visível.
- Login via GitHub para um ranking verificado.
- Versão em inglês (i18n).
- Painel admin para gerenciar perguntas.
- Mais perguntas (meta: 50 por nível).

## 14. Riscos

| Risco | Mitigação |
|---|---|
| Conteúdo desatualizado (Claude Code evolui rápido) | `doc_url` em toda pergunta, revisão trimestral, monitorar perguntas com taxa de acerto anômala, evitar números voláteis |
| Gabarito errado | Revisão contra a doc antes do seed, validador automático e item de roadmap para reports |
| Trapaça no ranking | Correção no servidor, ordem obrigatória, tempo medido no servidor, piso de 15s e rate limit |
| Nicknames ofensivos | Filtro de palavrões no servidor; remoção manual via SQL se necessário |
| Limites do free tier do Supabase | Índices adequados, payloads pequenos, monitorar uso |
