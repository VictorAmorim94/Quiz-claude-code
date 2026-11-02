# Quiz Claude Code
 

Quiz **Verdadeiro ou Falso** sobre Claude Code, com 4 níveis (Iniciante, Intermediário, Avançado e Misto), explicação a cada resposta e ranking global por nível. As respostas são corrigidas no servidor (Supabase Edge Functions), então o gabarito nunca chega ao navegador.

A especificação completa está em [`prd.md`](./prd.md).


## Porque criei só com Claude Code?  
Projeto criado para teste de criação do PRD com one shot prompt e apenas algumas alterações e correções de bugs no meio do caminho por conta da usabilidade. 

Tudo aqui foi feito com o primeiro rascunho passando pelo Claude Code. 
- Rascunho de como queria a ferramenta
-  Brainstorm com a ferramenta para definição de arquitetura e processos
-  Criação das regras de negócio e Skills necessárias
-  Execução com testes em cada etapa da usabilidade
-  Deploy na Vercel 

## Stack

Vite + React 18 + TypeScript, Tailwind CSS, React Router, TanStack Query e Zod no front. Supabase (Postgres + RLS + Edge Functions em Deno) no backend. Deploy na Vercel.

## Rodando localmente

Requisitos: Node 22+ e, para os testes das Edge Functions, [Deno](https://deno.com).

```bash
npm install
cp .env.example .env.local   # preencha com as chaves do projeto Supabase de dev
npm run dev                  # http://localhost:5173
```

O desenvolvimento usa um projeto **Supabase Cloud de dev** (não há Supabase local). O CLI roda via `npx supabase`, sem Docker.

## Scripts

| Script                   | O que faz                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------ |
| `npm run dev`            | Servidor de desenvolvimento                                                                |
| `npm run build`          | Typecheck + build de produção                                                              |
| `npm run preview`        | Serve o build                                                                              |
| `npm run lint`           | ESLint + checagem do Prettier                                                              |
| `npm run format`         | Formata o código com Prettier                                                              |
| `npm run typecheck`      | TypeScript sem emitir arquivos                                                             |
| `npm test`               | Testes unitários e de componentes (Vitest)                                                 |
| `npm run test:e2e`       | Testes end-to-end (Playwright) contra o projeto de dev                                     |
| `npm run test:functions` | Testes das Edge Functions (`deno test`)                                                    |
| `npm run seed`           | Valida `content/questions.json` e faz upsert na tabela                                     |
| `npm run db:reset`       | Limpa sessões e ranking do dev e refaz o seed do banco real (`-- --fixture` usa o fixture) |

## Conteúdo

As perguntas ficam em `content/questions.json`. Veja o guia de redação e as regras de validação em `content/README.md` (seção 6 do PRD).
