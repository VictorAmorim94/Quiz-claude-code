# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

`prd.md` (PT-BR) is the spec: a True/False quiz web app about Claude Code with a per-level global leaderboard. Work follows the phases in `prd.md` §11. When the PRD and this file disagree, the PRD wins, except for the deliberate deviations listed below.

## Stack (prd.md §8.1)

- Frontend: Vite 6 + React 18 + TypeScript `strict` (+ `noUncheckedIndexedAccess`), Tailwind 3 (`darkMode: 'class'`), React Router v6, TanStack Query (leaderboard only), Zod. Round state uses `useReducer` + Context (`QuizProvider`), not TanStack Query.
- Backend: Supabase (Postgres + RLS + Edge Functions in Deno/TS). Front deploys to Vercel.
- Tests: Vitest + React Testing Library (jsdom), Playwright, `deno test` for Edge Functions.

## Commands

- `npm run dev` / `build` / `preview` — ports are fixed (`5173` / `4173`, `strictPort`) because the Edge Functions' CORS (`ALLOWED_ORIGIN`) only allows those origins; a second dev server fails instead of silently moving to 5174 (where every API call is blocked by the browser)
- `npm run lint` — ESLint **and** `prettier --check`; fix formatting with `npm run format`
- `npm run typecheck`
- `npm test` — Vitest (files `src/**/*.test.{ts,tsx}` and `scripts/**/*.test.ts`). Single test: `npx vitest run src/lib/storage.test.ts -t "test name"`
- `npm run test:functions` — `deno test` over `supabase/functions` (requires Deno installed)
- `npm run test:e2e` — Playwright (desktop + 375px mobile projects) against the **dev Supabase project** (needs `.env.local` and `npx playwright install chromium`); starts `npm run dev` itself. Specs import `test` from `tests/e2e/fixtures.ts`, whose auto fixture records every `start-session` and deletes those sessions/leaderboard rows afterwards — always use it so runs don't pollute the dev ranking. The full-round spec waits ~16s before the last answer because of RN14. `ui.spec.ts` runs axe (WCAG 2.1 AA, serious/critical) in light and dark and checks no horizontal scroll.
- `npm run lighthouse` — after `npm run build`; runs Lighthouse mobile on `/`, `/play`, `/leaderboard` via `vite preview` + Playwright's Chromium, fails below 90; HTML reports in `lighthouse-report/` (git-ignored)
- `npm run validate` (`-- --dev` for the fixture) — validates question files offline via `src/content/validate.ts`
- `npm run seed` (`-- --dev` for the fixture) / `npm run db:reset` / `npm run test:integration` — talk to the **dev Supabase Cloud project** using `VITE_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`. `db:reset` refuses to run unless `SUPABASE_ENV=dev`. `test:integration` (`scripts/integration-backend.ts`) is the only test of the SQL rules (order, once-only, idempotent retry, expiry, suspicious run, RLS)
- CI (GitHub Actions) must pass lint, typecheck, tests and build.

Vitest runs workers with `--no-experimental-webstorage` (see `vite.config.ts`): Node ≥ 25 exposes a global `localStorage` that otherwise shadows jsdom's. Don't remove it.

## Deviations from the PRD (no local Supabase/Docker)

- Development uses a Supabase **Cloud** dev project, not `supabase start`. The CLI runs via `npx supabase`; functions deploy with `--use-api` (no Docker).
- `db:reset` is a script that truncates `sessions`/`session_answers`/`leaderboard` on the dev project and re-seeds; it is not `supabase db reset`. By default it seeds `content/questions.json` and deactivates the fixture IDs (`9xx`); `-- --fixture` does the opposite. Only one bank is active at a time.
- `ALLOWED_ORIGIN` accepts a comma-separated list (so `http://localhost:5173` works in dev); `RATE_LIMIT_PER_HOUR` env (default 30) is raised on dev so e2e runs don't hit RN15.
- Answer recording and leaderboard submission are SQL functions (`record_answer`, `submit_to_leaderboard`, executable only by `service_role`) that lock the session row, so concurrent requests can't break ordering/once-only rules. Edge Functions validate input and map errors.
- `content/questions.json` holds the 90 real questions (IDs 001–899), each checked against the docs at `code.claude.com/docs/en/...` (the old `docs.claude.com/en/docs/claude-code/...` URLs now redirect there). `content/questions.dev.json` is a dev-only fixture (IDs 9xx, items marked `[DEV]`), currently **inactive** in the dev DB, and must never be seeded into prod.

## Core architecture invariant: the answer key never reaches the browser

This drives the whole design (prd.md §8.2). Grading happens server-side so the leaderboard can't be cheated.

- `start-session` returns only `position`, `id`, `level`, `category`, `statement` per question — never `answer`, `explanation` or `doc_url`.
- `submit-answer` reveals `correctAnswer`, `explanation` and `docUrl` for one question only after it is answered. It enforces strict order (`position` == number of answers already given → else `409 OUT_OF_ORDER`), single answer per position (`409 ALREADY_ANSWERED`, but a retry with the same answer must return the saved result — the client relies on this for idempotent network retries), and 30-min expiry (`410 SESSION_EXPIRED`). The 10th answer sets `finished_at`, `score`, `duration_ms` (time is measured server-side only).
- `submit-score` requires a finished, not-yet-submitted session; validates nickname (RN11, profanity list stays server-side), rejects runs `< 15000` ms (`422 SUSPICIOUS_RUN`).
- RLS is enabled on every table with **no policies** for `anon`/`authenticated`. All access goes through Edge Functions (`service_role`) or the `security definer` RPC `get_leaderboard(p_level, p_period, p_limit)`, which the front calls with the anon key. Never add a client-readable path to `questions` or `session_answers`.
- `SUPABASE_SERVICE_ROLE_KEY` is only for Edge Functions and the seed script; the front only gets `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
- Edge Functions share code in `supabase/functions/_shared/` (cors, errors, Zod schemas, profanity, ip hash, draw). Errors use `{ "error": { "code": "...", "message": "..." } }`; CORS is restricted to `ALLOWED_ORIGIN`. IPs are stored only as `sha256(ip + IP_HASH_SALT)`.

Full request/response contracts are in prd.md §8.4; schema + RPC SQL in §8.3, implemented in `supabase/migrations/20261101223908_init.sql`. Schema changes go in new migration files, never by editing an applied one.

Edge Function layout: `supabase/functions/_shared/http.ts` (`serveJson`) wraps every function (CORS, POST-only, Zod parse, error format, JSON logs); SQL errors are raised as `raise exception '<CODE>'` and mapped by `fromDbError` in `_shared/errors.ts`. `draw.ts`, `profanity.ts`, `nickname.ts`, `cors.ts`, `hash.ts` are pure (no `Deno.*`), with `*_test.ts` beside them. Imports use `npm:`/`jsr:` specifiers and explicit `.ts` extensions; `supabase/functions` is excluded from ESLint and the Node tsconfig.

## Business rules that are easy to get wrong

- Draw (`_shared/draw.ts`): exactly 10 active questions; `mixed` = 3 beginner + 4 intermediate + 3 advanced in ascending difficulty; each drawn round must have 3–7 true answers (redraw otherwise); avoid client-sent `recentQuestionIds` unless the pool is too small, then ignore that filter.
- Leaderboard order: score desc, duration asc, finished_at asc. One row per nickname (case-insensitive) per level/period showing their best run; Top 50. Weekly = since Monday 00:00 `America/Sao_Paulo`. Four boards: `beginner`, `intermediate`, `advanced`, `mixed` (`board_level` enum vs `quiz_level` enum, which has no `mixed`).
- Rate limit: 30 sessions/hour per IP hash.

## Content (`content/questions.json`)

Source of truth for questions; validated with Zod and upserted by `scripts/seed-questions.ts` (`npm run seed`). Rules (prd.md §6):

- 90 questions, 30 per level, 40–60% true per level; category distribution in §6.1.
- `id` format `{beg|int|adv}-{NNN}`, stable forever. Never reuse or delete an ID — set `active: false` instead.
- Statement: one sentence, ≤ 200 chars, unambiguously true or false; false items should be plausible misconceptions. Explanation: 2–4 sentences. Every item has a `doc_url` to official Claude Code docs.
- Accuracy is critical: verify each item against the current official docs before adding; avoid volatile facts (prices, limits, versions) and undocumented features. When in doubt, drop the question. The calibration examples in §6.5 also need re-verification.
- User-facing text is PT-BR; technical terms stay in English in code formatting (`CLAUDE.md`, `/init`, `PreToolUse`).

## Client architecture

- `src/lib/api.ts` talks to the backend with plain `fetch` (no `supabase-js` in the bundle) and validates every response with Zod; errors become `ApiError { status, code, retryable }`.
- Router is a **data router** (`createBrowserRouter`, routes in `src/App.tsx`) because `QuizPage` uses `useBlocker` for the "leave mid-round?" confirmation. Tests render through `src/test/render.tsx` (`createMemoryRouter` + same providers); `src/test/setup.ts` strips `signal` from `Request` because jsdom's `AbortSignal` breaks undici's `Request` on navigation.
- Round state: pure `quizReducer` (`src/features/quiz/quizReducer.ts`, state machine documented at the top) + `QuizProvider` (side effects, persistence to `qcc:activeSession` on every change, best score on finish). `QuizProvider` wraps `RouterProvider`, so state survives navigation to `/result`. A failed answer goes to `send_failed` and can only be resent with the **same** answer.
- In `QuizPage`, `useBlocker` must stay declared **before** effects that call `navigate`, otherwise the end-of-round redirect to `/result` is blocked by a stale condition.
- Leaderboard: `LeaderboardPage` keeps level/period in the query string (`?level=mixed&period=week`), fetches with TanStack Query key `['leaderboard', level, period]`; `NicknameForm` invalidates `['leaderboard', level]` after a successful submit. Client-side nickname check (`src/lib/nickname.ts`) mirrors only the format rules; profanity stays server-side.
- Tests mock the API with `vi.mock('../lib/api', …)` spreading the real module. Write `beforeEach(() => { mock.mockResolvedValue(…) })` **with braces**: returning the mock makes Vitest call it as a teardown, producing phantom zero-arg calls.

## Client conventions

- All `localStorage` access goes through `src/lib/storage.ts` wrapped in try/catch; the app must work without it. Keys are prefixed `qcc:` (`theme`, `bestScores`, `recentQuestionIds`, `lastNickname`, `activeSession` — the last one lets a round resume after F5 until it expires).
- Theme: `light | dark | system`, defaulting to `prefers-color-scheme`. The `.dark` class sits on `<html>`, so base colors live on `<body>` in `src/index.css` — `dark:` utilities applied to `html` itself never match (`.dark html`). jsdom doesn't compute CSS, so only the e2e axe run catches contrast/theme regressions.
- Brand text/buttons use `brand-700` on light backgrounds; `brand-600` fails WCAG AA contrast with white or stone-50.
- Accessibility is an acceptance criterion: WCAG 2.1 AA, full keyboard play (`V`/`F`, `←`/`→`, `Enter` for next), feedback announced via `aria-live="polite"`, correct/incorrect never conveyed by color alone, works from 360px width, V/F buttons ≥ 48px tall.
- Perf budget: initial JS < 200 KB gzip.
